import { and, eq, desc, gte } from "drizzle-orm";
import { db } from "./db/client";
import { extractions, type JobStage } from "./db/schema";
import { newId, normalizeUrl, companyFromDomain } from "./ids";
import { capturePage } from "./engine/crawl";
import { synthesize, type GroupKey } from "./engine/synthesize";
import { buildTokens, fontFamilies } from "./engine/analyze";
import { putObject } from "./storage";
import { debit, refund, recordUsage, PRICING, type Actor } from "./accounts";
import { dispatch } from "./queue";
import type { BrandSystem } from "./types";
import type { Capture } from "./engine/signals";

export type ExtractInput = {
  url: string;
  depth?: "deep" | "light";
  cache?: boolean; // true = use cached when fresh
  pages?: "single" | "all";
  maxPages?: number;
};

const CACHE_TTL_DAYS = 14;

const STAGES: JobStage[] = [
  { key: "crawl", label: "Rendering the page", status: "pending" },
  { key: "identity", label: "Brand identity", status: "pending" },
  { key: "palette", label: "Colours & surfaces", status: "pending" },
  { key: "typography", label: "Typography", status: "pending" },
  { key: "spatial", label: "Layout & elevation", status: "pending" },
  { key: "components", label: "Components & motion", status: "pending" },
  { key: "sections", label: "Page sections & media", status: "pending" },
  { key: "finalize", label: "Packaging tokens", status: "pending" },
];

export async function createExtraction(actor: Actor, input: ExtractInput, parentId?: string, opts: { free?: boolean } = {}) {
  const { url, normalized, domain } = normalizeUrl(input.url);
  const depth = input.depth ?? "deep";
  const pagesMode = parentId ? "single" : (input.pages ?? "single");

  if (input.cache !== false) {
    const since = new Date(Date.now() - CACHE_TTL_DAYS * 86400_000);
    const cached = await db.query.extractions.findFirst({
      where: and(eq(extractions.normalizedUrl, normalized), eq(extractions.status, "completed"), gte(extractions.finishedAt, since)),
      orderBy: [desc(extractions.finishedAt)],
    });
    if (cached?.brand) {
      const id = newId("ext");
      const [row] = await db
        .insert(extractions)
        .values({
          ...cached,
          id,
          userId: actor.userId,
          apiKeyId: actor.apiKeyId ?? null,
          parentId: parentId ?? null,
          source: "cache",
          pagesMode,
          requestFrom: actor.via,
          credits: 0,
          shareToken: null,
          latencyMs: 0,
          createdAt: new Date(),
          startedAt: new Date(),
          finishedAt: new Date(),
        })
        .returning();
      await recordUsage(actor, "extraction", 0, id, 0);
      if (pagesMode === "all" && !parentId) await expandSite(actor, row, input);
      return row;
    }
  }

  const id = newId("ext");
  const price = opts.free ? 0 : PRICING.extraction;
  await debit(actor.userId, price, "extraction", id);
  const [row] = await db
    .insert(extractions)
    .values({
      id,
      userId: actor.userId,
      apiKeyId: actor.apiKeyId ?? null,
      parentId: parentId ?? null,
      url,
      normalizedUrl: normalized,
      domain,
      company: companyFromDomain(domain),
      depth,
      pagesMode,
      source: "new",
      requestFrom: actor.via,
      credits: price,
      stages: STAGES,
    })
    .returning();
  await dispatch("extract", id, () => runExtraction(id, input.maxPages));
  return row;
}

async function setStage(id: string, key: string, status: JobStage["status"]) {
  const row = await db.query.extractions.findFirst({ where: eq(extractions.id, id), columns: { stages: true } });
  if (!row) return;
  const stages = row.stages.map((s) => (s.key === key ? { ...s, status } : s));
  await db.update(extractions).set({ stages }).where(eq(extractions.id, id));
}

function paletteOf(brand: Partial<BrandSystem>): string[] {
  const c = brand.colors;
  if (!c) return [];
  return [...c.baseline, ...c.secondary, ...c.others].map((x) => x.hex).filter((h, i, a) => a.indexOf(h) === i).slice(0, 4);
}

export async function runExtraction(id: string, maxPages?: number) {
  const row = await db.query.extractions.findFirst({ where: eq(extractions.id, id) });
  if (!row || row.status === "completed") return;
  const started = Date.now();
  await db.update(extractions).set({ status: "running", startedAt: new Date() }).where(eq(extractions.id, id));
  let capture: Capture;
  try {
    await setStage(id, "crawl", "running");
    capture = await capturePage(row.url);
    const base = `extractions/${id}`;
    const [screenshotPath, heroPath, htmlPath, cssPath] = await Promise.all([
      capture.screenshot ? putObject(`${base}/screenshot.jpg`, capture.screenshot) : null,
      capture.hero ? putObject(`${base}/hero.jpg`, capture.hero) : null,
      putObject(`${base}/source.html`, capture.html),
      putObject(`${base}/styles.css`, capture.css),
    ]);
    const s = capture.signals;
    const domain = new URL(capture.finalUrl).hostname.replace(/^www\./, "");
    const partial: Partial<BrandSystem> = {
      version: 1,
      url: capture.finalUrl,
      domain,
      depth: row.depth as "deep" | "light",
      extractedAt: new Date().toISOString(),
      logo: s.logo ? { url: s.logo.src ?? "", svg: s.logo.svg, alt: s.logo.alt } : null,
      favicon: s.favicon || null,
    };
    await db.update(extractions).set({ screenshotPath, heroPath, htmlPath, cssPath, brand: partial as BrandSystem }).where(eq(extractions.id, id));
    await setStage(id, "crawl", "done");

    // Synthesize all section groups in parallel; persist each as it lands.
    const groups = ["identity", "palette", "typography", "spatial", "components", "sections"] as GroupKey[];
    for (const g of groups) await setStage(id, g, "running");
    let lock = Promise.resolve();
    const merged: Record<string, unknown> = { ...partial };
    const result = await synthesize(capture, {
      depth: row.depth as "deep" | "light",
      onGroupDone: async (key, part) => {
        // Persist each section as it lands so clients can stream results.
        lock = lock.then(async () => {
          Object.assign(merged, part);
          const row = await db.query.extractions.findFirst({ where: eq(extractions.id, id), columns: { stages: true } });
          const stages = (row?.stages ?? []).map((st) => (st.key === key ? { ...st, status: "done" as const } : st));
          await db.update(extractions).set({ brand: merged as unknown as BrandSystem, stages }).where(eq(extractions.id, id));
        });
        await lock;
      },
    });
    Object.assign(merged, result);

    await setStage(id, "finalize", "running");
    const brand = merged as BrandSystem;
    brand.pages = s.links.slice(0, 60);
    brand.icons = { ...brand.icons, svgs: s.icons.slice(0, 16).map((i) => ({ name: i.label || "icon", svg: i.svg })) };
    const allColors = [...brand.colors.baseline, ...brand.colors.secondary, ...brand.colors.others];
    brand.tokens = buildTokens(s, allColors.map((c) => ({ name: c.name, hex: c.hex })), fontFamilies(s));
    const company = brand.identity.companyName || companyFromDomain(domain);
    await db
      .update(extractions)
      .set({
        brand,
        company,
        palette: paletteOf(brand),
        status: "completed",
        finishedAt: new Date(),
        latencyMs: Date.now() - started,
        stages: STAGES.map((st) => ({ ...st, status: "done" })),
      })
      .where(eq(extractions.id, id));
    await recordUsage({ userId: row.userId, apiKeyId: row.apiKeyId, via: row.requestFrom as Actor["via"] }, "extraction", row.credits, id, Date.now() - started);

    if (row.pagesMode === "all" && !row.parentId) {
      const fresh = await db.query.extractions.findFirst({ where: eq(extractions.id, id) });
      if (fresh) await expandSite({ userId: row.userId, apiKeyId: row.apiKeyId, via: row.requestFrom as Actor["via"] }, fresh, { url: row.url, depth: row.depth as "deep" | "light", maxPages }, s.links);
    }
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error(`[onbrand] extraction ${id} failed:`, message);
    await db
      .update(extractions)
      .set({ status: "failed", error: message.slice(0, 500), finishedAt: new Date(), latencyMs: Date.now() - started })
      .where(eq(extractions.id, id));
    await refund(row.userId, row.credits, "extraction_failed", id);
  }
}

/** "All pages": discover same-domain pages from the root page and extract each (up to 20). */
async function expandSite(actor: Actor, root: typeof extractions.$inferSelect, input: ExtractInput, links?: string[]) {
  const max = Math.min(input.maxPages ?? 20, 20) - 1;
  const candidates = links ?? root.brand?.pages ?? [];
  const seen = new Set([root.normalizedUrl]);
  const picked: string[] = [];
  for (const l of candidates ?? []) {
    try {
      const n = normalizeUrl(l);
      if (n.domain !== root.domain || seen.has(n.normalized)) continue;
      if (/\/(login|signin|sign-in|signup|privacy|terms|legal|cookie)/i.test(n.normalized)) continue;
      seen.add(n.normalized);
      picked.push(n.url);
      if (picked.length >= max) break;
    } catch {
      /* skip */
    }
  }
  for (const url of picked) {
    try {
      await createExtraction(actor, { url, depth: "light", cache: input.cache, pages: "single" }, root.id);
    } catch (e) {
      console.warn("[onbrand] stopped site expansion:", (e as Error).message);
      break;
    }
  }
}

export async function getExtraction(id: string) {
  return db.query.extractions.findFirst({ where: eq(extractions.id, id) });
}
