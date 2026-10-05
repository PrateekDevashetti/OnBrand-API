import { assertJobCapacity } from "./ratelimit";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { differenceCiede2000, parse } from "culori";
import { db } from "./db/client";
import { adherenceRuns, extractions, type JobStage } from "./db/schema";
import { newId, normalizeUrl } from "./ids";
import { createExtraction } from "./extract";
import { debit, refund, recordUsage, PRICING, type Actor } from "./accounts";
import { dispatch } from "./queue";
import { structured, llmAvailable } from "./llm";
import { getObject } from "./storage";
import type { BrandSystem } from "./types";

export const ADHERENCE_CATEGORIES = [
  { key: "visual", label: "Visual Identity" },
  { key: "spatial", label: "Spatial Identity" },
  { key: "colors", label: "Colours" },
  { key: "typography", label: "Typography" },
  { key: "layout", label: "Layout" },
  { key: "surfaces", label: "Surfaces" },
  { key: "elevation", label: "Elevation" },
] as const;
export type AdherenceCategoryKey = (typeof ADHERENCE_CATEGORIES)[number]["key"];

export type AdherenceCategory = {
  key: AdherenceCategoryKey;
  label: string;
  score: number; // 0-100
  measured: number | null; // deterministic component
  verdict: string;
  matches: string[];
  deviations: string[];
  fixes: string[];
};

/** A structured, mechanically-applicable fix. `action` is the discriminator. */
export type AdherenceFix =
  | { action: "snap_to_token"; category: AdherenceCategoryKey; property: "color" | "background-color" | "font-size" | "border-radius" | "max-width"; role?: string; from: string; to_value: string; token?: string; severity: number }
  | { action: "add_color_token"; category: "colors" | "surfaces"; token: string; value: string; role: string; usage: string[]; severity: number }
  | { action: "replace_font_family"; category: "typography"; property: "font-family"; role: string; from: string; to_value: string; severity: number }
  | { action: "remove_off_brand_color"; category: "colors"; value: string; nearest_token: string; nearest_value: string; severity: number };

export type AdherenceReport = {
  overall: { score: number; grade: string; summary: string };
  categories: AdherenceCategory[];
  /** Prose guidance, worst-first, with exact target values. Max 20. */
  recommendations?: string[];
  /** Structured fixes, worst-first. Max 20. */
  fixes?: AdherenceFix[];
  agentInstructions: string;
  reference: { extractionId: string; url: string; name: string };
  design: { extractionId: string; url: string; name: string };
};

const CritiqueSchema = z.object({
  summary: z.string().describe("2-3 sentence overall verdict"),
  categories: z.array(
    z.object({
      key: z.enum(["visual", "spatial", "colors", "typography", "layout", "surfaces", "elevation"]),
      score: z.number().describe("0-100 judgement of how faithfully the design follows the reference in this category"),
      verdict: z.string().describe("One sentence"),
      matches: z.array(z.string()),
      deviations: z.array(z.string()),
      fixes: z.array(z.string()).describe("Concrete, value-level fixes (exact hex, font stack, px) the agent should apply"),
    }),
  ),
  agentInstructions: z.string().describe("A prompt an AI coding agent can follow to bring the design on brand, ordered by impact, citing exact values"),
});

const de = differenceCiede2000();

function colorsOf(b: BrandSystem) {
  return [...(b.colors?.baseline ?? []), ...(b.colors?.secondary ?? []), ...(b.colors?.others ?? [])];
}

function scoreColors(ref: BrandSystem, des: BrandSystem) {
  const rc = colorsOf(ref);
  const dc = colorsOf(des);
  if (!rc.length || !dc.length) return { score: null, matches: [] as string[], deviations: [] as string[] };
  const matches: string[] = [];
  const deviations: string[] = [];
  let total = 0, weightSum = 0;
  rc.forEach((c, i) => {
    const w = i < (ref.colors.baseline?.length ?? 1) ? 3 : 1;
    const p = parse(c.hex);
    let best = Infinity, bestHex = "";
    for (const d of dc) {
      const q = parse(d.hex);
      if (!p || !q) continue;
      const v = de(p, q);
      if (v < best) { best = v; bestHex = d.hex; }
    }
    const s = Math.max(0, 100 - best * 4); // ΔE 25 => 0
    total += s * w;
    weightSum += w;
    if (best < 5) matches.push(`${c.name} ${c.hex} present (${bestHex})`);
    else if (w > 1) deviations.push(`${c.name} ${c.hex} missing — closest is ${bestHex} (ΔE ${best.toFixed(1)})`);
  });
  // penalize strong off-brand accents in the design
  for (const d of dc.filter((x) => x.tone === "Accent")) {
    const q = parse(d.hex);
    const near = rc.some((c) => { const p = parse(c.hex); return p && q ? de(p, q) < 10 : false; });
    if (!near) { total -= 6 * weightSum / 10; deviations.push(`Off-brand accent ${d.hex} in design`); }
  }
  return { score: Math.max(0, Math.min(100, Math.round(total / weightSum))), matches, deviations };
}

function fam(stack: string) {
  return stack.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
}

function scoreTypography(ref: BrandSystem, des: BrandSystem) {
  const rf = new Set((ref.typography?.families ?? []).map((f) => f.family.toLowerCase()));
  const df = new Set((des.typography?.families ?? []).map((f) => f.family.toLowerCase()));
  if (!rf.size || !df.size) return { score: null, matches: [] as string[], deviations: [] as string[] };
  const shared = [...rf].filter((f) => df.has(f));
  const famScore = (shared.length / rf.size) * 100;
  const sizes = (b: BrandSystem) => [...(b.typography.titles ?? []), ...(b.typography.body ?? [])].map((t) => parseFloat(t.size)).filter((n) => !isNaN(n));
  const rs = sizes(ref), ds = sizes(des);
  let scaleScore = 70;
  if (rs.length && ds.length) {
    const diffs = rs.map((r) => Math.min(...ds.map((d) => Math.abs(d - r) / r)));
    scaleScore = Math.max(0, 100 - (diffs.reduce((a, b) => a + b, 0) / diffs.length) * 200);
  }
  const titleRef = ref.typography.titles?.[0], titleDes = des.typography.titles?.[0];
  const deviations = [...rf].filter((f) => !df.has(f)).map((f) => `Reference family “${f}” not used`);
  if (titleRef && titleDes && fam(titleRef.stack) !== fam(titleDes.stack)) deviations.push(`Headline set in ${titleDes.family} instead of ${titleRef.family}`);
  return {
    score: Math.round(famScore * 0.65 + scaleScore * 0.35),
    matches: shared.map((f) => `Uses ${f}`),
    deviations,
  };
}

function overlap(a: string[], b: string[]) {
  if (!a.length) return null;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const B = new Set(b.map(norm));
  return Math.round((a.filter((x) => B.has(norm(x))).length / a.length) * 100);
}

function scoreSurfaces(ref: BrandSystem, des: BrandSystem) {
  const a = (ref.surfaces?.solids ?? []).map((s) => s.hex);
  const b = (des.surfaces?.solids ?? []).map((s) => s.hex);
  if (!a.length || !b.length) return null;
  const hits = a.filter((h) => b.some((x) => { const p = parse(h), q = parse(x); return p && q && de(p, q) < 6; }));
  return Math.round((hits.length / a.length) * 100);
}

function scoreElevation(ref: BrandSystem, des: BrandSystem) {
  const r = (ref.elevation?.borders ?? []).map((x) => x.css).concat((ref.elevation?.shadows ?? []).map((x) => x.css));
  const d = (des.elevation?.borders ?? []).map((x) => x.css).concat((des.elevation?.shadows ?? []).map((x) => x.css));
  return overlap(r, d);
}

function scoreLayout(ref: BrandSystem, des: BrandSystem) {
  const r = ref.layout?.breakpoints?.map((b) => b.range) ?? [];
  const d = des.layout?.breakpoints?.map((b) => b.range) ?? [];
  const bp = overlap(r, d);
  const mw = ref.layout?.grid?.maxWidth && ref.layout.grid.maxWidth === des.layout?.grid?.maxWidth ? 100 : 50;
  return bp == null ? mw : Math.round(bp * 0.5 + mw * 0.5);
}


const tokenName = (name: string) => "--" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function nearest(hex: string, pool: { name: string; hex: string }[]) {
  const p = parse(hex);
  let best = Infinity;
  let hit = pool[0];
  for (const c of pool) {
    const q = parse(c.hex);
    if (!p || !q) continue;
    const v = de(p, q);
    if (v < best) { best = v; hit = c; }
  }
  return { color: hit, delta: best };
}

const px = (v?: string) => {
  const n = parseFloat(v ?? "");
  return isNaN(n) ? null : n;
};

/** Deterministic, value-level fixes from the two brand systems, ordered worst-first. */
export function buildFixes(ref: BrandSystem, des: BrandSystem): AdherenceFix[] {
  const fixes: AdherenceFix[] = [];
  const rc = colorsOf(ref);
  const dc = colorsOf(des);
  const baselineCount = ref.colors?.baseline?.length ?? 1;
  if (rc.length && dc.length) {
    // Design colours that don't belong to the reference palette: snap them to the nearest brand token.
    dc.forEach((d, i) => {
      const { color, delta } = nearest(d.hex, rc);
      if (delta < 8) return;
      const weight = i < (des.colors?.baseline?.length ?? 1) ? 2 : 1;
      if (d.tone === "Accent" && delta > 20) fixes.push({ action: "remove_off_brand_color", category: "colors", value: d.hex, nearest_token: tokenName(color.name), nearest_value: color.hex, severity: Math.round(delta * weight) });
      else fixes.push({ action: "snap_to_token", category: "colors", property: d.usage?.some((u) => /background|surface|section/i.test(u)) ? "background-color" : "color", role: d.usage?.[0], from: d.hex, to_value: color.hex, token: tokenName(color.name), severity: Math.round(delta * weight) });
    });
    // Reference brand colours the design never uses: add them as tokens.
    rc.forEach((c, i) => {
      const { delta } = nearest(c.hex, dc);
      if (delta < 8) return;
      fixes.push({ action: "add_color_token", category: "colors", token: tokenName(c.name), value: c.hex, role: c.tone, usage: c.usage ?? [], severity: Math.round(delta * (i < baselineCount ? 3 : 1)) });
    });
  }
  // Typography: families per role, then the type scale.
  const roles: [string, keyof BrandSystem["typography"]][] = [["headline", "titles"], ["body", "body"], ["label", "labels"]];
  for (const [role, key] of roles) {
    const r = (ref.typography?.[key] as BrandSystem["typography"]["titles"] | undefined)?.[0];
    const d = (des.typography?.[key] as BrandSystem["typography"]["titles"] | undefined)?.[0];
    if (!r || !d) continue;
    if (fam(r.stack) !== fam(d.stack)) fixes.push({ action: "replace_font_family", category: "typography", property: "font-family", role, from: d.stack, to_value: r.stack, severity: role === "headline" ? 60 : 45 });
    const rs = px(r.size), ds = px(d.size);
    if (rs && ds && Math.abs(rs - ds) / rs > 0.08) fixes.push({ action: "snap_to_token", category: "typography", property: "font-size", role, from: d.size, to_value: r.size, severity: Math.round((Math.abs(rs - ds) / rs) * 100) });
  }
  // Button radius.
  const rb = ref.interactions?.buttons?.[0], db_ = des.interactions?.buttons?.[0];
  if (rb && db_) {
    const rr = /border-radius:\s*([^;]+)/.exec(rb.defaultCss ?? "")?.[1]?.trim();
    const dr = /border-radius:\s*([^;]+)/.exec(db_.defaultCss ?? "")?.[1]?.trim();
    if (rr && dr && rr !== dr) fixes.push({ action: "snap_to_token", category: "surfaces", property: "border-radius", role: "primary button", from: dr, to_value: rr, severity: 25 });
  }
  // Content width.
  const rmw = ref.layout?.grid?.maxWidth, dmw = des.layout?.grid?.maxWidth;
  if (rmw && dmw && rmw !== dmw) fixes.push({ action: "snap_to_token", category: "layout", property: "max-width", from: dmw, to_value: rmw, severity: 20 });
  return fixes.sort((a, b) => b.severity - a.severity).slice(0, 20);
}

function describeFix(f: AdherenceFix): string {
  switch (f.action) {
    case "snap_to_token":
      return `Change ${f.role ? `the ${f.role} ` : ""}${f.property} from ${f.from} to ${f.to_value}${f.token ? ` (${f.token})` : ""}.`;
    case "add_color_token":
      return `Bring in the brand's ${f.role.toLowerCase()} colour ${f.value} as ${f.token}${f.usage.length ? ` for ${f.usage.slice(0, 2).join(" and ").toLowerCase()}` : ""}.`;
    case "replace_font_family":
      return `Set ${f.role} type in ${f.to_value} instead of ${f.from}.`;
    case "remove_off_brand_color":
      return `Remove the off-brand colour ${f.value}; the closest brand colour is ${f.nearest_value} (${f.nearest_token}).`;
  }
}

/** Worst-first prose guidance: lowest-scoring categories first, value-level wherever possible. */
export function buildRecommendations(categories: AdherenceCategory[], fixes: AdherenceFix[]): string[] {
  const out: string[] = [];
  const byCat = new Map<string, AdherenceFix[]>();
  for (const f of fixes) byCat.set(f.category, [...(byCat.get(f.category) ?? []), f]);
  for (const c of [...categories].sort((a, b) => a.score - b.score)) {
    for (const f of byCat.get(c.key) ?? []) out.push(describeFix(f));
    for (const f of c.fixes) out.push(f);
    if (!(byCat.get(c.key)?.length || c.fixes.length)) for (const d of c.deviations.slice(0, 2)) out.push(`${c.label}: ${d}.`);
  }
  return [...new Set(out.map((s) => s.replace(/\.\.$/, ".")))].slice(0, 20);
}

function grade(score: number) {
  return score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";
}

export class SameUrlError extends Error {
  constructor() {
    super("reference_url and candidate_url point to the same page. Compare two different pages.");
  }
}

const STAGES: JobStage[] = [
  { key: "reference", label: "Extracting reference brand", status: "pending" },
  { key: "design", label: "Extracting your page", status: "pending" },
  { key: "score", label: "Scoring adherence", status: "pending" },
];

export async function createAdherence(actor: Actor, input: { reference: string; design: string }) {
  await assertJobCapacity(actor.userId);
  if (normalizeUrl(input.reference).normalized === normalizeUrl(input.design).normalized) throw new SameUrlError();
  const ref = normalizeUrl(input.reference);
  const des = normalizeUrl(input.design);
  const id = newId("adh");
  await debit(actor.userId, PRICING.adherence, "adherence", id);
  const [row] = await db
    .insert(adherenceRuns)
    .values({ id, userId: actor.userId, apiKeyId: actor.apiKeyId ?? null, referenceUrl: ref.url, designUrl: des.url, requestFrom: actor.via, credits: PRICING.adherence, stages: STAGES })
    .returning();
  await dispatch("adherence", id, () => runAdherence(id));
  return row;
}

async function waitFor(extractionId: string, timeoutMs = 8 * 60_000) {
  const t = Date.now();
  while (Date.now() - t < timeoutMs) {
    const e = await db.query.extractions.findFirst({ where: eq(extractions.id, extractionId) });
    if (e?.status === "completed") return e;
    if (e?.status === "failed") throw new Error(`Extraction failed for ${e.url}: ${e.error}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for extraction");
}

async function setStages(id: string, update: Record<string, JobStage["status"]>) {
  const row = await db.query.adherenceRuns.findFirst({ where: eq(adherenceRuns.id, id), columns: { stages: true } });
  if (!row) return;
  await db.update(adherenceRuns).set({ stages: row.stages.map((s) => (update[s.key] ? { ...s, status: update[s.key] } : s)) }).where(eq(adherenceRuns.id, id));
}

export async function runAdherence(id: string) {
  const run = await db.query.adherenceRuns.findFirst({ where: eq(adherenceRuns.id, id) });
  if (!run || run.status === "completed") return;
  const started = Date.now();
  await db.update(adherenceRuns).set({ status: "running" }).where(eq(adherenceRuns.id, id));
  try {
    // Sub-extractions are covered by the adherence price (system account pays 0 via refund).
    const actor: Actor = { userId: run.userId, apiKeyId: run.apiKeyId, via: run.requestFrom as Actor["via"] };
    await setStages(id, { reference: "running", design: "running" });
    const [refRow, desRow] = await Promise.all([
      createInternalExtraction(actor, run.referenceUrl),
      createInternalExtraction(actor, run.designUrl),
    ]);
    await db.update(adherenceRuns).set({ referenceExtractionId: refRow.id, designExtractionId: desRow.id }).where(eq(adherenceRuns.id, id));
    const [refE, desE] = await Promise.all([
      waitFor(refRow.id).then(async (e) => { await setStages(id, { reference: "done" }); return e; }),
      waitFor(desRow.id).then(async (e) => { await setStages(id, { design: "done" }); return e; }),
    ]);
    await setStages(id, { score: "running" });
    const ref = refE.brand!, des = desE.brand!;

    const det = {
      colors: scoreColors(ref, des),
      typography: scoreTypography(ref, des),
      surfaces: scoreSurfaces(ref, des),
      elevation: scoreElevation(ref, des),
      layout: scoreLayout(ref, des),
    };

    let critique: z.infer<typeof CritiqueSchema> | null = null;
    if (llmAvailable()) {
      const images = [];
      for (const p of [refE.heroPath, desE.heroPath]) {
        const b = p ? await getObject(p) : null;
        if (b) images.push({ data: b, mediaType: "image/jpeg" as const });
      }
      const slim = (b: BrandSystem) => ({
        identity: { summary: b.identity?.summary, keywords: b.identity?.keywords, primaryStyle: b.identity?.primaryStyle?.name, mode: b.identity?.mode },
        colors: colorsOf(b).map((c) => `${c.name} ${c.hex} (${c.tone})`),
        typography: { families: b.typography?.families?.map((f) => f.family), titles: b.typography?.titles?.slice(0, 3), body: b.typography?.body?.slice(0, 2) },
        surfaces: b.surfaces,
        layout: { classification: b.layout?.classification, grid: b.layout?.grid, breakpoints: b.layout?.breakpoints, sectionSeparation: b.layout?.sectionSeparation },
        elevation: b.elevation,
        buttons: b.interactions?.buttons?.slice(0, 4),
        sections: b.sections?.map((s) => `${s.name}: ${s.layout}`),
      });
      try {
        critique = await structured({
          system:
            "You are OnBrand Verify, a strict brand QA lead. You compare a page someone built (the DESIGN) against a REFERENCE brand and score adherence per category. Be specific and value-level: cite hex codes, font stacks, px values. Measured scores from deterministic analysis are provided — treat them as strong evidence, and explain them.",
          schema: CritiqueSchema,
          effort: "medium",
          images,
          text: `Image 1 = REFERENCE (${run.referenceUrl}) above the fold. Image 2 = DESIGN (${run.designUrl}) above the fold.\n\nMeasured scores: ${JSON.stringify({ colors: det.colors, typography: det.typography, surfaces: det.surfaces, elevation: det.elevation, layout: det.layout })}\n\nREFERENCE brand system:\n${JSON.stringify(slim(ref))}\n\nDESIGN brand system:\n${JSON.stringify(slim(des))}\n\nScore all 7 categories: visual (overall look & feel, imagery, mood), spatial (density, whitespace, alignment, rhythm), colors, typography, layout, surfaces, elevation.`,
        });
      } catch (e) {
        console.error("[onbrand] adherence critique failed:", (e as Error).message);
      }
    }

    const measuredFor: Record<AdherenceCategoryKey, number | null> = {
      visual: null,
      spatial: null,
      colors: det.colors.score,
      typography: det.typography.score,
      layout: det.layout,
      surfaces: det.surfaces,
      elevation: det.elevation,
    };
    const categories: AdherenceCategory[] = ADHERENCE_CATEGORIES.map(({ key, label }) => {
      const c = critique?.categories.find((x) => x.key === key);
      const m = measuredFor[key];
      const blended = m == null ? (c?.score ?? 50) : c ? Math.round(m * 0.6 + c.score * 0.4) : m;
      const detExtra = key === "colors" ? det.colors : key === "typography" ? det.typography : null;
      return {
        key,
        label,
        score: Math.max(0, Math.min(100, Math.round(blended))),
        measured: m,
        verdict: c?.verdict ?? (m == null ? "Not enough signal to judge." : `Measured similarity ${m}/100.`),
        matches: [...(detExtra?.matches ?? []), ...(c?.matches ?? [])].slice(0, 8),
        deviations: [...(detExtra?.deviations ?? []), ...(c?.deviations ?? [])].slice(0, 8),
        fixes: c?.fixes ?? [],
      };
    });
    const weights: Record<AdherenceCategoryKey, number> = { visual: 2, spatial: 1, colors: 2, typography: 2, layout: 1, surfaces: 1, elevation: 0.5 };
    const wsum = categories.reduce((a, c) => a + weights[c.key], 0);
    const overall = Math.round(categories.reduce((a, c) => a + c.score * weights[c.key], 0) / wsum);
    const fixes = buildFixes(ref, des);
    const report: AdherenceReport = {
      overall: { score: overall, grade: grade(overall), summary: critique?.summary ?? `Overall adherence ${overall}/100.` },
      categories,
      fixes,
      recommendations: buildRecommendations(categories, fixes),
      agentInstructions:
        critique?.agentInstructions ??
        categories.flatMap((c) => c.deviations.map((d) => `- [${c.label}] ${d}`)).join("\n"),
      reference: { extractionId: refE.id, url: refE.url, name: refE.company },
      design: { extractionId: desE.id, url: desE.url, name: desE.company },
    };
    await db
      .update(adherenceRuns)
      .set({ status: "completed", score: overall, report, finishedAt: new Date(), latencyMs: Date.now() - started, stages: STAGES.map((s) => ({ ...s, status: "done" })) })
      .where(eq(adherenceRuns.id, id));
    await recordUsage(actor, "adherence", run.credits, id, Date.now() - started);
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[onbrand] adherence ${id} failed:`, message);
    await db.update(adherenceRuns).set({ status: "failed", error: message.slice(0, 500), finishedAt: new Date(), latencyMs: Date.now() - started }).where(eq(adherenceRuns.id, id));
    await refund(run.userId, run.credits, "adherence_failed", id);
  }
}

/** Extraction that's covered by the parent adherence run's price. */
async function createInternalExtraction(actor: Actor, url: string) {
  return createExtraction(actor, { url, depth: "light", cache: true, pages: "single" }, undefined, { free: true });
}

export async function getAdherence(id: string) {
  return db.query.adherenceRuns.findFirst({ where: eq(adherenceRuns.id, id) });
}
