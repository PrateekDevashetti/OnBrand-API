import { z } from "zod";
import { and, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { parse, converter, differenceCiede2000 } from "culori";
import { db } from "./db/client";
import { searches, styleIndex } from "./db/schema";
import { newId } from "./ids";
import { debit, recordUsage, PRICING, type Actor } from "./accounts";
import { structured, llmAvailable } from "./llm";
import { publicUrl } from "./storage";
import { extractions } from "./db/schema";
import { FEATURED_ORDER } from "./seed/sites";

export type MatchLabel = "Strong Match" | "Good Match" | "Related" | "Discovery";

export type StyleResult = {
  id: string;
  /** "discovery" marks a rotating exemplar of the detected style (never set when filters are used). */
  badge?: "discovery" | null;
  /** Short style traits for compact cards, e.g. ["Dark", "Bold", "Typographic"]. */
  traits?: string[];
  facets?: StyleFacets;
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

export function tokens(q: string): string[] {
  const words = q.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
  const out = new Set(words);
  for (const w of words) for (const [k, list] of Object.entries(SYN)) if (list.includes(w)) list.forEach((x) => out.add(x)), out.add(k);
  return [...out];
}

type Row = typeof styleIndex.$inferSelect;


// ---------- closed filter vocabulary (hard constraints) ----------

export const FILTER_VOCAB = {
  page_type: ["homepage", "about", "pricing", "careers", "portfolio", "product", "blog", "case_study", "landing_page", "services"],
  industry: ["saas", "ai", "developer_tools", "creative_agency", "branding", "design", "fintech", "crypto", "e_commerce", "fashion", "beauty", "food_beverage", "hardware", "travel", "education", "media", "productivity", "architecture"],
  hue: ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "brown", "neutral"],
  layout: ["generous_whitespace", "dense_packed", "asymmetric_broken_grid", "grid_based_strict", "centered_symmetric", "card_based"],
} as const;
export type FilterKey = keyof typeof FILTER_VOCAB;
export type SearchFilters = Partial<Record<FilterKey, string | null>>;
export type StyleFacets = Record<FilterKey, string[]>;

const toLch = converter("lch");
const deltaE = differenceCiede2000();

function hueOf(hex: string): string | null {
  const c = toLch(parse(hex));
  if (!c) return null;
  const l = c.l ?? 0, ch = c.c ?? 0, h = c.h ?? 0;
  if (ch < 12) return "neutral";
  if (l < 45 && h > 30 && h < 90) return "brown";
  if (h < 25 || h >= 345) return "pink";
  if (h < 55) return "red";
  if (h < 85) return "orange";
  if (h < 115) return "yellow";
  if (h < 170) return "green";
  if (h < 230) return "teal";
  if (h < 305) return "blue";
  return "purple";
}

const PAGE_MAP: Record<string, string> = { homepage: "homepage", about: "about", "about/team": "about", pricing: "pricing", careers: "careers", portfolio: "portfolio", product: "product", blog: "blog", "case study": "case_study", landing: "landing_page", services: "services" };
const INDUSTRY_RULES: [RegExp, string][] = [
  [/agency\/creative|creative (studio|agency)|motion studio|digital (studio|agency)|3d studio|art direction|web designer/i, "creative_agency"],
  [/branding|brand (studio|consultancy)/i, "branding"],
  [/design (tool|partnership|agency)|website builder|web publishing/i, "design"],
  [/\bai\b|ai lab|generative|ai search|ai compute|taste infra/i, "ai"],
  [/developer|email api|data platform|ai compute/i, "developer_tools"],
  [/\bsaas\b|product tool|workspace|crm|scheduling|analytics|presentation|productivity|email client|research tool/i, "saas"],
  [/fintech|payments|financ/i, "fintech"],
  [/crypto|wallet|web3/i, "crypto"],
  [/e-commerce|retail|creator platform/i, "e_commerce"],
  [/fashion|sportswear/i, "fashion"],
  [/beauty|skincare/i, "beauty"],
  [/food|beverage|drink/i, "food_beverage"],
  [/hardware|consumer tech/i, "hardware"],
  [/travel/i, "travel"],
  [/education/i, "education"],
  [/media|publishing|youth culture/i, "media"],
  [/productivity|workspace|notes/i, "productivity"],
  [/architecture/i, "architecture"],
];
const LAYOUT_MAP: Record<string, string> = { breathing: "generous_whitespace", tight: "dense_packed", asymmetric: "asymmetric_broken_grid", grid: "grid_based_strict", medium: "centered_symmetric", cards: "card_based" };

export function facetsOf(row: Row): StyleFacets {
  const hay = [row.label, ...row.industries, ...row.tags].join(" | ");
  const page = [...new Set(row.websiteTypes.map((w) => PAGE_MAP[w.toLowerCase()]).filter(Boolean))];
  if (row.tags.some((t) => /about\/team/i.test(t)) && !page.includes("about") && !page.length) page.push("about");
  return {
    page_type: page.length ? page : ["homepage"],
    industry: [...new Set(INDUSTRY_RULES.filter(([re]) => re.test(hay)).map(([, v]) => v))],
    hue: [...new Set(row.palette.map(hueOf).filter((h): h is string => !!h))],
    layout: [...new Set(row.layouts.map((l) => LAYOUT_MAP[l.toLowerCase()]).filter(Boolean))],
  };
}

export class InvalidFilterError extends Error {}

/** Validate a filters object against the closed vocabulary. */
export function parseFilters(f: unknown): SearchFilters {
  if (!f || typeof f !== "object") return {};
  const out: SearchFilters = {};
  for (const [k, v] of Object.entries(f as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    if (!(k in FILTER_VOCAB)) throw new InvalidFilterError(`Unknown filter "${k}". Valid filters: ${Object.keys(FILTER_VOCAB).join(", ")}.`);
    const val = String(v).toLowerCase();
    if (!(FILTER_VOCAB[k as FilterKey] as readonly string[]).includes(val)) throw new InvalidFilterError(`Unknown ${k} "${v}". Valid values: ${FILTER_VOCAB[k as FilterKey].join(", ")}.`);
    out[k as FilterKey] = val;
  }
  return out;
}

function passes(row: Row, where: SearchFilters) {
  const f = facetsOf(row);
  return (Object.entries(where) as [FilterKey, string][]).every(([k, v]) => f[k].includes(v));
}

/** Taxonomy tags shown on result cards: alphabetical, mode tags removed. */
function taxonomy(row: Row) {
  return row.tags.filter((t) => !/^(dark|light)$/i.test(t)).sort((a, b) => a.localeCompare(b));
}

export function lexicalScore(row: Row, toks: string[], filters: string[]) {
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
    tags: taxonomy(row).slice(0, 6),
    traits: row.styles.slice(0, 3),
    facets: facetsOf(row),
    badge: match === "Discovery" ? "discovery" : null,
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

export type SearchInput = {
  query: string;
  depth?: "light" | "deep";
  limit?: number;
  /** Soft facet chips from the playground (ranking boosts). */
  filters?: string[];
  /** Hard constraints from the closed vocabulary: every result satisfies them. */
  where?: SearchFilters;
};

/** Refinement chips for a result set: dominant industry, a shared trait the query didn't name, and contrast. */
function refinements(results: StyleResult[], toks: string[]): string[] {
  const count = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const seen = new Set(toks);
  const out: string[] = [];
  const industry = count(results.flatMap((r) => r.tags.filter((t) => t.includes("/")).map((t) => t.split("/")[0].trim())))[0];
  if (industry) out.push(industry);
  const trait = count(results.flatMap((r) => r.traits ?? [])).find((t) => !seen.has(t.toLowerCase()) && !out.includes(t));
  if (trait) out.push(trait);
  const lum = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255; };
  const contrasty = results.filter((r) => r.palette.some((h) => lum(h) < 0.12) && r.palette.some((h) => lum(h) > 0.88)).length;
  if (contrasty >= results.length / 2) out.push("High Contrast color");
  return out.length ? out.slice(0, 3) : toks.slice(0, 3).map((t) => t.charAt(0).toUpperCase() + t.slice(1));
}

export async function styleSearch(actor: Actor, input: SearchInput) {
  const started = Date.now();
  const depth = input.depth ?? "light";
  const limit = Math.max(1, Math.min(input.limit ?? 6, 24));
  const filters = input.filters ?? [];
  const id = newId("srch");
  await debit(actor.userId, depth === "deep" ? PRICING.searchDeep : PRICING.searchLight, "search", id);

  const where = input.where ?? {};
  const hasWhere = Object.keys(where).length > 0;
  const rows = (await db.query.styleIndex.findMany()).filter((r) => passes(r, where));
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

  // Discovery: swap the tail slot for the most relevant candidate that broadens the set —
  // a different light/dark mode *and* page type than what is already shown (never when filters are set).
  if (!hasWhere && !filters.length && results.length >= 3) {
    const shown = results.slice(0, -1);
    const taken = new Set(results.map((r) => r.id));
    const modes = shown.map((r) => r.mode);
    const majority = modes.filter((m) => m === "dark").length >= modes.length / 2 ? "dark" : "light";
    const pages = new Set(shown.flatMap((r) => r.facets?.page_type ?? []));
    const pool = scored.filter(({ r, s }) => !taken.has(r.id) && s > 0).slice(0, 10);
    const differs = (r: Row) => r.mode !== majority;
    const newPage = (r: Row) => facetsOf(r).page_type.some((p) => !pages.has(p));
    const newCategory = (r: Row) => !r.label.toLowerCase().split(/\s+/).some((w) => toks.includes(w));
    const pick =
      pool.find(({ r }) => differs(r) && newPage(r) && newCategory(r)) ??
      pool.find(({ r }) => differs(r) && newPage(r)) ??
      pool.find(({ r }) => differs(r)) ??
      pool[0];
    if (pick) results[results.length - 1] = toResult(pick.r, pick.s, "Discovery");
  }

  if (depth !== "deep" || !llmAvailable()) queryTags = refinements(results, toks);

  const latencyMs = Date.now() - started;
  const credits = depth === "deep" ? PRICING.searchDeep : PRICING.searchLight;
  await db.insert(searches).values({ id, userId: actor.userId, apiKeyId: actor.apiKeyId ?? null, query: input.query, tags: queryTags, filters: { facets: filters, ...where }, depth, limit, results, credits, requestFrom: actor.via, latencyMs });
  await recordUsage(actor, "search", credits, id, latencyMs);
  return { id, query: input.query, depth, tags: queryTags, filters: where, results, latencyMs };
}

/** Nearest visual neighbours in the index for one of the caller's completed extractions. */
export async function similarStyles(actor: Actor, extractionId: string, topK = 12) {
  const started = Date.now();
  const ext = await db.query.extractions.findFirst({ where: eq(extractions.id, extractionId) });
  if (!ext || ext.userId !== actor.userId || ext.status !== "completed" || !ext.brand) return null;
  if (ext.sections) throw new FullExtractionRequiredError();
  const id = newId("srch");
  await debit(actor.userId, PRICING.searchLight, "search", id);
  const b = ext.brand;
  const brandHexes = [...(b.colors?.baseline ?? []), ...(b.colors?.secondary ?? [])].map((c) => c.hex);
  const fams = (b.typography?.families ?? []).map((f) => f.family.toLowerCase());
  const kw = new Set([...(b.identity?.keywords ?? []), b.identity?.primaryStyle?.name ?? "", b.identity?.mode ?? ""].map((k) => String(k).toLowerCase()).filter(Boolean));
  const rows = (await db.query.styleIndex.findMany()).filter((r) => r.domain !== ext.domain);
  const scored = rows
    .map((r) => {
      let pal = 0;
      for (const h of brandHexes.slice(0, 5)) {
        const p = parse(h);
        const best = Math.min(...r.palette.map((x) => { const q = parse(x); return p && q ? deltaE(p, q) : 99; }), 99);
        pal += Math.max(0, 1 - best / 25);
      }
      const palScore = brandHexes.length ? pal / Math.min(5, brandHexes.length) : 0;
      const mode = r.mode === (b.identity?.mode ?? "") ? 1 : 0;
      const type = fams.some((f) => r.typography.toLowerCase().includes(f)) ? 1 : 0;
      const words = [...r.tags, ...r.styles].map((t) => t.toLowerCase());
      const kwScore = [...kw].filter((k) => words.some((w) => w.includes(k) || k.includes(w))).length / Math.max(3, kw.size);
      return { r, s: palScore * 4 + mode * 2 + type * 1.5 + kwScore * 2.5 };
    })
    .sort((a, b2) => b2.s - a.s)
    .slice(0, Math.max(1, Math.min(topK, 30)));
  const top = scored[0]?.s || 1;
  const results = scored.map(({ r, s }) => toResult(r, s, s / top > 0.85 ? "Strong Match" : s / top > 0.6 ? "Good Match" : "Related"));
  const latencyMs = Date.now() - started;
  await db.insert(searches).values({ id, userId: actor.userId, apiKeyId: actor.apiKeyId ?? null, kind: "similar", sourceExtractionId: ext.id, query: ext.url, tags: [], filters: {}, depth: "light", limit: results.length, results, credits: PRICING.searchLight, requestFrom: actor.via, latencyMs });
  await recordUsage(actor, "search", PRICING.searchLight, id, latencyMs);
  return { id, source: { extraction_id: ext.id, url: ext.url }, results, latencyMs };
}

export class FullExtractionRequiredError extends Error {
  constructor() {
    super("This needs a full extraction. Extract the URL again without `sections`.");
  }
}

/** Search history (query searches and similarity lookups), newest first. */
export async function searchHistory(userId: string, opts: { kind?: string; depth?: string; q?: string; apiKeyId?: string; limit?: number; offset?: number } = {}) {
  const conds: SQL[] = [eq(searches.userId, userId)];
  if (opts.kind) conds.push(eq(searches.kind, opts.kind));
  if (opts.depth) conds.push(inArray(searches.depth, opts.depth === "fast" ? ["light", "fast"] : [opts.depth]));
  if (opts.q) conds.push(ilike(searches.query, `%${opts.q}%`));
  if (opts.apiKeyId) conds.push(eq(searches.apiKeyId, opts.apiKeyId));
  const where = and(...conds);
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const rows = await db.query.searches.findMany({ where, orderBy: [desc(searches.createdAt)], limit, offset: opts.offset ?? 0 });
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(searches).where(where);
  const byStatus = await db.select({ status: searches.status, n: sql<number>`count(*)::int` }).from(searches).where(where).groupBy(searches.status);
  return { rows, total, totalByStatus: Object.fromEntries(byStatus.map((x) => [x.status, x.n])) };
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
  const rows = await db.query.styleIndex.findMany({ orderBy: [desc(styleIndex.featured), desc(styleIndex.createdAt)] });
  const rank = (d: string) => { const i = FEATURED_ORDER.indexOf(d); return i < 0 ? 999 : i; };
  return rows
    .sort((a, b) => rank(a.domain) - rank(b.domain))
    .slice(0, limit)
    .map((r) => ({ ...toResult(r, 0, "Related"), badge: null }));
}
