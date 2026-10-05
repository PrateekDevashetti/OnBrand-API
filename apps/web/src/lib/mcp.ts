import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createExtraction,
  getExtraction,
  listExtractions,
  brandBrief,
  enhancePrompt,
  styleSearch,
  similarStyles,
  createAdherence,
  getAdherence,
  listAdherencePage,
  getBalance,
  recordUsage,
  parseSections,
  parseFilters,
  SECTION_NAMES,
  FILTER_VOCAB,
  MAX_SITE_PAGES,
  type Actor,
} from "@onbrand/core";
import { serializeExtraction, serializeAdherence, serializeVerdict, serializeCard } from "./serialize";
import { config } from "./config";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const jsonText = (o: unknown) => text(JSON.stringify(o, null, 2));
const fail = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

const sectionsArg = z.array(z.enum(SECTION_NAMES)).min(1).optional();
const filtersArg = z
  .object({
    page_type: z.enum(FILTER_VOCAB.page_type).optional(),
    industry: z.enum(FILTER_VOCAB.industry).optional(),
    hue: z.enum(FILTER_VOCAB.hue).optional(),
    layout: z.enum(FILTER_VOCAB.layout).optional(),
  })
  .optional();

/** Run a tool body, turning thrown errors (credits, validation) into readable tool errors. */
async function guard<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    return fail((e as Error).message);
  }
}

const INSTRUCTIONS = `OnBrand is the brand layer for agents, by Canopy Labs.

Extraction and verification are async jobs: start → poll → read.
- Have a URL? extract_brand → poll_brand_extraction until completed → get_brand_extraction_result (pass \`sections\` to keep context small).
- Only have a description? search_brands → look at each card's screenshot_url → extract_brand on the one you pick.
- Have a brand already? search_similar_brands(extraction_id) for its visual neighbours.
- Built a page? verify_brand_adherence(reference_url, candidate_url) → poll_brand_adherence → get_brand_adherence_result. Apply \`fixes\` first (exact values), then \`recommendations\`, both worst-first. Re-verify; stop when the score stops improving or after 3 passes.
Extras: get_brand_brief (compact markdown), get_brand_tokens (CSS / Tailwind / JSON), enhance_prompt, get_credits.`;

export function buildMcpServer(actor: Actor) {
  const server = new McpServer({ name: "onbrand", version: "1.0.0", title: "OnBrand by Canopy Labs" }, { instructions: INSTRUCTIONS });

  // ---------- extraction ----------

  server.registerTool(
    "extract_brand",
    {
      title: "Extract a brand",
      description: `Start extracting a brand system from a website URL. Returns an extraction_id immediately; poll with poll_brand_extraction. 2 credits (refunded on failure). Fresh cached results return instantly unless force=true. Pass \`sections\` to extract only part of the system (${SECTION_NAMES.join(", ")}). map=true also extracts up to ${MAX_SITE_PAGES} same-domain pages.`,
      inputSchema: {
        url: z.string().describe("Website URL, e.g. https://linear.app"),
        force: z.boolean().optional().describe("Bypass the cache and re-crawl"),
        depth: z.enum(["light", "deep"]).optional().describe("deep adds an AI review pass (slower, full extractions only)"),
        sections: sectionsArg.describe("Only these sections. Omit for a full extraction."),
        map: z.boolean().optional().describe("Also discover and extract other pages on the same domain"),
        max_pages: z.number().int().min(1).max(MAX_SITE_PAGES).optional(),
      },
    },
    ({ url, force, depth, sections, map, max_pages }) =>
      guard(async () => {
        const sel = parseSections(sections ?? null);
        if (sel && map) return fail("sections can't be combined with map=true.");
        const row = await createExtraction(actor, { url, depth: sel ? "light" : (depth ?? "light"), cache: !force, pages: map ? "all" : "single", maxPages: max_pages, sections: sel });
        return jsonText({ extraction_id: row.id, status: row.status, cache_hit: row.source === "cache", sections: row.sections ?? null, next: row.status === "completed" ? "get_brand_extraction_result" : "poll_brand_extraction" });
      }),
  );

  server.registerTool(
    "poll_brand_extraction",
    { title: "Poll an extraction", description: "Lightweight status check for an extraction: status (queued, running, completed, failed), per-stage progress and which sections have landed.", inputSchema: { extraction_id: z.string() } },
    async ({ extraction_id }) => {
      const e = await getExtraction(extraction_id);
      if (!e || e.userId !== actor.userId) return fail("Extraction not found");
      const landed = e.brand ? Object.keys(e.brand).filter((k) => !["version", "url", "domain", "depth", "extractedAt", "logo", "favicon", "pages"].includes(k)) : [];
      return jsonText({ extraction_id: e.id, status: e.status, stages: e.stages.map((s) => `${s.label}: ${s.status}`), sections_ready: landed, error: e.error, next: e.status === "completed" ? "get_brand_extraction_result" : e.status === "failed" ? null : "poll again in a few seconds" });
    },
  );

  server.registerTool(
    "get_brand_extraction_result",
    {
      title: "Read a brand system",
      description: "Read an extraction's brand system plus artifact links (screenshot, HTML, CSS). Pass `sections` to return only part of it; a full system is large. Free to call repeatedly.",
      inputSchema: { extraction_id: z.string(), sections: sectionsArg },
    },
    ({ extraction_id, sections }) =>
      guard(async () => {
        const e = await getExtraction(extraction_id);
        if (!e || e.userId !== actor.userId) return fail("Extraction not found");
        if (!e.brand && e.status !== "failed") return fail(`Not ready yet (status: ${e.status}). Poll with poll_brand_extraction.`);
        const out = await serializeExtraction(e, { sections: parseSections(sections ?? null), children: e.pagesMode === "all" });
        return jsonText({ ...out, dashboard: `${config.appUrl}/app/extractions/${e.id}` });
      }),
  );

  server.registerTool(
    "list_brand_extractions",
    { title: "List extractions", description: "Your past extractions, newest first. Filter by status or a URL substring.", inputSchema: { status: z.enum(["queued", "running", "completed", "failed"]).optional(), search: z.string().optional(), limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() } },
    async ({ status, search, limit, offset }) => {
      const { rows, total } = await listExtractions(actor.userId, { status, q: search, limit: limit ?? 20, offset: offset ?? 0 });
      return jsonText({ total, data: rows.map((r) => ({ extraction_id: r.id, url: r.url, company: r.company, status: r.status, palette: r.palette, created_at: r.createdAt })) });
    },
  );

  server.registerTool(
    "get_brand_brief",
    { title: "Brand brief", description: "A compact markdown brief of a completed brand system. Read it before designing or writing UI.", inputSchema: { extraction_id: z.string() } },
    async ({ extraction_id }) => {
      const e = await getExtraction(extraction_id);
      if (!e || e.userId !== actor.userId || !e.brand) return fail("Brand system not ready");
      return text(brandBrief(e.brand));
    },
  );

  server.registerTool(
    "get_brand_tokens",
    { title: "Design tokens", description: "Design tokens as CSS variables, a Tailwind v4 @theme block, or JSON.", inputSchema: { extraction_id: z.string(), format: z.enum(["css", "tailwind", "json"]).optional() } },
    async ({ extraction_id, format }) => {
      const e = await getExtraction(extraction_id);
      const t = e?.brand?.tokens;
      if (!e || e.userId !== actor.userId || !t) return fail("Tokens not ready (they need a full extraction, or one that includes colors and typography)");
      if (format === "json") return jsonText(t);
      if (format === "tailwind") {
        const lines = ["@theme {", ...Object.entries(t.color).map(([k, v]) => `  --color-${k}: ${v};`), ...Object.entries(t.font).map(([k, v]) => `  --font-${k}: ${v};`), ...Object.entries(t.radius).map(([k, v]) => `  --radius-${k}: ${v};`), "}"];
        return text(lines.join("\n"));
      }
      return text(t.css);
    },
  );

  server.registerTool(
    "enhance_prompt",
    { title: "Enhance a prompt", description: "Rewrite a design or build prompt so it is grounded in a brand's exact colours, type, layout and components. Needs a completed full extraction. Free.", inputSchema: { extraction_id: z.string(), prompt: z.string() } },
    ({ extraction_id, prompt }) =>
      guard(async () => {
        const e = await getExtraction(extraction_id);
        if (!e || e.userId !== actor.userId || !e.brand) return fail("Brand system not ready");
        if (e.sections) return fail("Prompt enhancement needs a full extraction. Run extract_brand without sections.");
        const t = Date.now();
        const out = await enhancePrompt(e.brand, prompt);
        await recordUsage(actor, "enhance", 0, extraction_id, Date.now() - t);
        return text(out);
      }),
  );

  // ---------- search ----------

  server.registerTool(
    "search_brands",
    {
      title: "Search brands by look",
      description:
        "Find real brands in the OnBrand index from a description of a look, e.g. 'dark brutalist developer tools' or 'warm pastel skincare'. Use the prompt's own words. Synchronous. fast = 1 credit, deep = 2 credits (re-ranked with reasons). `filters` are hard constraints. Look at every card's screenshot_url before choosing; extract the pick with extract_brand.",
      inputSchema: { query: z.string(), depth: z.enum(["fast", "deep"]).optional(), top_k: z.number().int().min(1).max(30).optional(), filters: filtersArg },
    },
    ({ query, depth, top_k, filters }) =>
      guard(async () => {
        const out = await styleSearch(actor, { query, depth: depth === "deep" ? "deep" : "light", limit: top_k ?? 6, where: parseFilters(filters ?? {}) });
        return jsonText({ search_id: out.id, query_tags: out.tags, results: out.results.map(serializeCard), next: "extract_brand(url) on the result you pick" });
      }),
  );

  server.registerTool(
    "search_similar_brands",
    { title: "Find similar brands", description: "Brands in the index that look like one of your completed full extractions (competitor sets, moodboards). 1 credit.", inputSchema: { extraction_id: z.string(), top_k: z.number().int().min(1).max(30).optional() } },
    ({ extraction_id, top_k }) =>
      guard(async () => {
        const out = await similarStyles(actor, extraction_id, top_k ?? 12);
        if (!out) return fail("No completed extraction with that id");
        return jsonText({ search_id: out.id, source: out.source, results: out.results.map(serializeCard) });
      }),
  );

  // ---------- adherence ----------

  server.registerTool(
    "verify_brand_adherence",
    {
      title: "Verify brand adherence",
      description: "Start judging how well candidate_url (a rebuild, generated page or redesign) follows reference_url's brand. Both sides are extracted automatically. Returns an adherence_id immediately; poll with poll_brand_adherence. 2 credits (refunded on failure). The candidate must be a public URL.",
      inputSchema: { reference_url: z.string(), candidate_url: z.string() },
    },
    ({ reference_url, candidate_url }) =>
      guard(async () => {
        const row = await createAdherence(actor, { reference: reference_url, design: candidate_url });
        return jsonText({ adherence_id: row.id, status: row.status, next: "poll_brand_adherence" });
      }),
  );

  server.registerTool(
    "poll_brand_adherence",
    { title: "Poll a verification", description: "Lightweight status check for an adherence run.", inputSchema: { adherence_id: z.string() } },
    async ({ adherence_id }) => {
      const a = await getAdherence(adherence_id);
      if (!a || a.userId !== actor.userId) return fail("Adherence run not found");
      return jsonText({ adherence_id: a.id, status: a.status, stages: a.stages.map((s) => `${s.label}: ${s.status}`), error: a.error, next: a.status === "completed" ? "get_brand_adherence_result" : a.status === "failed" ? null : "poll again in a few seconds" });
    },
  );

  server.registerTool(
    "get_brand_adherence_result",
    { title: "Read a verdict", description: "The verdict: score (0-1), recommendations and structured fixes, both worst-first. Apply fixes mechanically first, then recommendations; re-verify after.", inputSchema: { adherence_id: z.string() } },
    async ({ adherence_id }) => {
      const a = await getAdherence(adherence_id);
      if (!a || a.userId !== actor.userId) return fail("Adherence run not found");
      if (a.status === "failed") return fail(`This run failed and won't produce a verdict: ${a.error}. Credits were refunded.`);
      if (!a.report) return fail(`Not ready yet (status: ${a.status}). Poll with poll_brand_adherence.`);
      return jsonText({ ...(await serializeVerdict(a)), report: `${config.appUrl}/app/adherence/${a.id}` });
    },
  );

  server.registerTool(
    "list_brand_adherence_jobs",
    { title: "List verifications", description: "Your past adherence runs, newest first.", inputSchema: { status: z.enum(["running", "completed", "failed"]).optional(), limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() } },
    async ({ status, limit, offset }) => {
      const { rows, total } = await listAdherencePage(actor.userId, { status, limit: limit ?? 20, offset: offset ?? 0 });
      return jsonText({ total, data: rows.map((r) => serializeAdherence({ ...r, report: null })) });
    },
  );

  server.registerTool("get_credits", { title: "Credit balance", description: "Remaining OnBrand credits.", inputSchema: {} }, async () => jsonText({ credits: await getBalance(actor.userId), top_up: `${config.appUrl}/app/billing` }));

  server.registerPrompt(
    "onbrand_loop",
    { title: "Build on brand", description: "Extract a brand, build to it, verify and iterate.", argsSchema: { reference: z.string().describe("Reference brand URL"), task: z.string().describe("What to build") } },
    ({ reference, task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Build: ${task}\n\n1. extract_brand(${reference}) → poll_brand_extraction → get_brand_brief and get_brand_tokens(format: "tailwind").\n2. enhance_prompt with the task, and build from it using only the brand's tokens and fonts.\n3. Deploy the page to a public URL and call verify_brand_adherence(reference_url=${reference}, candidate_url=<your url>), then poll_brand_adherence and get_brand_adherence_result.\n4. Apply \`fixes\` (exact values) first, then \`recommendations\`, worst-first. Re-verify. Stop when the score stops improving or after 3 passes, and report both scores.`,
          },
        },
      ],
    }),
  );

  return server;
}
