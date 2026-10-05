import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { searches, styleIndex } from "./db/schema";
import { newId } from "./ids";
import { debit, recordUsage, PRICING, type Actor } from "./accounts";
import { structured, llmAvailable } from "./llm";
import { publicUrl } from "./storage";

export type MatchLabel = "Strong Match" | "Good Match" | "Related" | "Discovery";

export type StyleResult = {
  id: string;
  domain: string;
  url: string;
  name: string;
  label: string;
  screenshot: string | null;
  tags: string[];
  palette: string[];
  typography: string;
  description: string;
  mode: string;
  score: number;
  match: MatchLabel;
  reasoning: string;
  extractionId: string | null;
};

export const SEARCH_FACETS = {
  Style: ["Minimal", "Bold", "Editorial", "Fun", "Brutalist", "Playful", "Luxury", "Technical"],
  "Website type": ["Homepage", "Portfolio", "Careers", "Pricing", "Product", "Blog"],
  Industry: ["SaaS", "AI", "Agency", "E-commerce", "Fintech", "Fashion", "Architecture"],
  Layout: ["Breathing", "Tight", "Medium", "Asymmetric", "Grid"],
} as const;

const STOP = new Set(["a", "an", "the", "with", "and", "or", "for", "of", "in", "on", "to", "website", "site", "page", "web", "design", "that", "like", "style"]);
const SYN: Record<string, string[]> = {
  dark: ["dark", "black", "night", "moody"],
  light: ["light", "white", "bright", "clean"],
  bold: ["bold", "loud", "expressive", "strong", "oversized", "heavy"],
  minimal: ["minimal", "minimalist", "clean", "simple", "sparse", "breathing"],
  playful: ["playful", "fun", "whimsical", "quirky", "colorful", "colourful"],
  studio: ["studio", "agency", "creative"],
  typography: ["typography", "typographic", "type", "font"],
  brutalist: ["brutalist", "brutalism", "raw", "utilitarian"],
  editorial: ["editorial", "magazine", "serif", "journal"],
  luxury: ["luxury", "premium", "elegant", "refined"],
  tech: ["tech", "technical", "developer", "saas", "ai", "infrastructure"],
};

function tokens(q: string): string[] {
  const words = q.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
  const out = new Set(words);
  for (const w of words) for (const [k, list] of Object.entries(SYN)) if (list.includes(w)) list.forEach((x) => out.add(x)), out.add(k);
  return [...out];
}

type Row = typeof styleIndex.$inferSelect;

function lexicalScore(row: Row, toks: string[], filters: string[]) {
  const fields: [string, number][] = [
    [row.tags.join(" "), 3],
    [row.styles.join(" "), 3],
    [row.industries.join(" "), 2.5],
    [row.websiteTypes.join(" "), 2],
    [row.layouts.join(" "), 1.5],
    [row.label, 2],
    [row.keywords, 1.5],
    [row.description, 1],
    [row.typography, 1],
    [`${row.name} ${row.domain} ${row.mode}`, 1.5],
  ];
  let s = 0;
  for (const t of toks) {
    for (const [text, w] of fields) if (text.toLowerCase().includes(t)) s += w;
  }
  for (const f of filters) {
    const hay = [row.tags, row.styles, row.industries, row.websiteTypes, row.layouts].flat().join(" ").toLowerCase();
    if (hay.includes(f.toLowerCase())) s += 4;
    else s -= 2;
  }
  return s;
}

function toResult(row: Row, score: number, match: MatchLabel, reasoning = ""): StyleResult {
  return {
    id: row.id,
    domain: row.domain,
    url: row.url,
    name: row.name,
    label: row.label,
    screenshot: publicUrl(row.screenshotPath),
    tags: [...row.websiteTypes.slice(0, 1), ...row.industries.slice(0, 1), ...row.styles.slice(0, 1), ...row.tags].filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 3),
    palette: row.palette,
    typography: row.typography,
    description: row.description,
    mode: row.mode,
    score: Math.round(score * 10) / 10,
    match,
    reasoning: reasoning || row.description,
    extractionId: row.extractionId,
  };
}

const RerankSchema = z.object({
  queryTags: z.array(z.string()).describe("2-4 short tags summarising the query, e.g. 'Homepage', 'Architecture'"),
  picks: z.array(
    z.object({
      id: z.string(),
      match: z.enum(["Strong Match", "Good Match", "Related", "Discovery"]),
      reasoning: z.string().describe("Prompt match reasoning: 3-5 sentences on why this brand system fits the query, citing its palette, type, layout and voice"),
    }),
  ),
});

export type SearchInput = { query: string; depth?: "light" | "deep"; limit?: number; filters?: string[] };

export async function styleSearch(actor: Actor, input: SearchInput) {
  const started = Date.now();
  const depth = input.depth ?? "light";
  const limit = Math.max(1, Math.min(input.limit ?? 6, 24));
  const filters = input.filters ?? [];
  const id = newId("srch");
  await debit(actor.userId, depth === "deep" ? PRICING.searchDeep : PRICING.searchLight, "search", id);

  const rows = await db.query.styleIndex.findMany();
  const toks = tokens(input.query);
  const scored = rows
    .map((r) => ({ r, s: lexicalScore(r, toks, filters) }))
    .sort((a, b) => b.s - a.s);
  const top = scored[0]?.s ?? 1;
  let results: StyleResult[];
  let queryTags = toks.slice(0, 3).map((t) => t.charAt(0).toUpperCase() + t.slice(1));

  if (depth === "deep" && llmAvailable() && rows.length) {
    const pool = scored.slice(0, Math.max(limit * 3, 18));
    try {
      const out = await structured({
        system:
          "You are OnBrand Style Search. Given a user's natural-language description of a visual style and a pool of indexed brand systems, choose the best matches and explain why. Prefer variety among equally good matches. Only use ids from the pool.",
        schema: RerankSchema,
        effort: "low",
        text: `Query: "${input.query}"${filters.length ? `\nRequired facets: ${filters.join(", ")}` : ""}\nReturn exactly ${Math.min(limit, pool.length)} picks ordered best-first.\n\nPool:\n${JSON.stringify(pool.map(({ r }) => ({ id: r.id, name: r.name, domain: r.domain, label: r.label, description: r.description, tags: r.tags, styles: r.styles, industries: r.industries, websiteTypes: r.websiteTypes, layouts: r.layouts, palette: r.palette, typography: r.typography, mode: r.mode })))}`,
      });
      const byId = new Map(pool.map((p) => [p.r.id, p]));
      results = out.picks.filter((p) => byId.has(p.id)).slice(0, limit).map((p) => toResult(byId.get(p.id)!.r, byId.get(p.id)!.s, p.match, p.reasoning));
      queryTags = out.queryTags;
    } catch (e) {
      console.error("[onbrand] rerank failed, falling back to lexical:", (e as Error).message);
      results = lexical();
    }
  } else {
    results = lexical();
  }

  function lexical() {
    return scored.slice(0, limit).map(({ r, s }, i) => {
      const ratio = top > 0 ? s / top : 0;
      const match: MatchLabel = ratio > 0.85 && s > 3 ? "Strong Match" : ratio > 0.6 && s > 2 ? "Good Match" : s > 1 ? "Related" : "Discovery";
      void i;
      return toResult(r, s, match);
    });
  }

  const latencyMs = Date.now() - started;
  const credits = depth === "deep" ? PRICING.searchDeep : PRICING.searchLight;
  await db.insert(searches).values({ id, userId: actor.userId, apiKeyId: actor.apiKeyId ?? null, query: input.query, tags: queryTags, filters: { facets: filters }, depth, limit, results, credits, requestFrom: actor.via, latencyMs });
  await recordUsage(actor, "search", credits, id, latencyMs);
  return { id, query: input.query, depth, tags: queryTags, results, latencyMs };
}

export async function getStyle(id: string) {
  const row = await db.query.styleIndex.findFirst({ where: eq(styleIndex.id, id) });
  if (!row) return null;
  const all = await db.query.styleIndex.findMany();
  const tagset = new Set([...row.tags, ...row.styles, ...row.industries, ...row.websiteTypes].map((t) => t.toLowerCase()));
  const similar = all
    .filter((r) => r.id !== row.id)
    .map((r) => ({ r, s: [...r.tags, ...r.styles, ...r.industries, ...r.websiteTypes].filter((t) => tagset.has(t.toLowerCase())).length + (r.mode === row.mode ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ r, s }) => toResult(r, s, "Related"));
  return { style: toResult(row, 0, "Strong Match"), raw: row, similar };
}

export async function featuredStyles(limit = 12) {
  const rows = await db.query.styleIndex.findMany({ orderBy: [desc(styleIndex.featured), desc(styleIndex.createdAt)], limit });
  return rows.map((r) => toResult(r, 0, "Discovery"));
}
