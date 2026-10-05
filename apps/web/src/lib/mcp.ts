import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createExtraction,
  getExtraction,
  brandBrief,
  enhancePrompt,
  styleSearch,
  createAdherence,
  getAdherence,
  getBalance,
  recordUsage,
  type Actor,
  type BrandSystem,
} from "@onbrand/core";
import { serializeAdherence } from "./serialize";
import { config } from "./config";

const SECTIONS = ["identity", "colors", "typography", "surfaces", "layout", "elevation", "interactions", "structure", "dataDisplay", "motion", "navigation", "icons", "sections", "media", "tokens"] as const;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const jsonText = (o: unknown) => text(JSON.stringify(o, null, 2));
const fail = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

async function waitFor<T>(load: () => Promise<T | undefined>, done: (t: T) => boolean, ms: number) {
  const end = Date.now() + ms;
  let cur = await load();
  while (cur && !done(cur) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 2000));
    cur = await load();
  }
  return cur;
}

function summary(b: BrandSystem) {
  const colors = [...(b.colors?.baseline ?? []), ...(b.colors?.secondary ?? [])].slice(0, 8).map((c) => `${c.name} ${c.hex}`);
  return { company: b.identity?.companyName, summary: b.identity?.summary, colors, fonts: b.typography?.families?.map((f) => f.family), mode: b.identity?.mode };
}

export function buildMcpServer(actor: Actor) {
  const server = new McpServer({ name: "onbrand", version: "0.1.0", title: "OnBrand by Canopy Labs" }, { instructions: "OnBrand is the brand layer for agents. Typical loop: extract_brand (or search_styles if there is no brand) → build using get_brand_brief / get_brand_tokens / enhance_prompt → verify_adherence and apply its fixes until the score clears the bar (e.g. ≥85)." });

  server.registerTool(
    "extract_brand",
    {
      title: "Extract brand system",
      description: "Extract a full brand system (identity, colours, typography, surfaces, layout, elevation, components, motion, sections, tokens) from a website URL. Costs 2 credits; cached URLs are free. Waits for completion by default.",
      inputSchema: { url: z.string().describe("Website URL, e.g. https://linear.app"), depth: z.enum(["light", "deep"]).optional().describe("deep = extra AI review pass, slower"), cache: z.boolean().optional().describe("reuse a fresh cached extraction (default true)"), wait: z.boolean().optional().describe("wait for completion (default true)") },
    },
    async ({ url, depth, cache, wait }) => {
      const row = await createExtraction(actor, { url, depth: depth ?? "light", cache: cache ?? true });
      if (wait === false) return jsonText({ id: row.id, status: row.status, poll_with: "get_brand" });
      const done = await waitFor(() => getExtraction(row.id), (e) => e.status === "completed" || e.status === "failed", 240_000);
      if (!done) return fail("Extraction not found");
      if (done.status === "failed") return fail(`Extraction failed: ${done.error}`);
      if (done.status !== "completed") return jsonText({ id: row.id, status: done.status, note: "Still running — call get_brand with this id." });
      return jsonText({ id: done.id, status: done.status, url: done.url, dashboard: `${config.appUrl}/app/extractions/${done.id}`, ...summary(done.brand!), next: "Use get_brand_brief for an agent-ready brief or get_brand_tokens for CSS/Tailwind tokens." });
    },
  );

  server.registerTool(
    "get_brand",
    {
      title: "Get brand system",
      description: "Fetch an extraction's status and brand system, optionally just one section.",
      inputSchema: { id: z.string(), section: z.enum(SECTIONS).optional() },
    },
    async ({ id, section }) => {
      const e = await getExtraction(id);
      if (!e || e.userId !== actor.userId) return fail("Extraction not found");
      if (!e.brand) return jsonText({ id, status: e.status, stages: e.stages });
      return jsonText({ id, status: e.status, url: e.url, ...(section ? { [section]: (e.brand as Record<string, unknown>)[section] } : { brand: e.brand }) });
    },
  );

  server.registerTool(
    "get_brand_brief",
    { title: "Brand brief", description: "Compact markdown brief of a completed brand system — paste into your own context before designing or writing UI.", inputSchema: { id: z.string() } },
    async ({ id }) => {
      const e = await getExtraction(id);
      if (!e || e.userId !== actor.userId || !e.brand) return fail("Brand system not ready");
      return text(brandBrief(e.brand));
    },
  );

  server.registerTool(
    "get_brand_tokens",
    { title: "Design tokens", description: "Design tokens as CSS variables, a Tailwind v4 @theme block, or JSON.", inputSchema: { id: z.string(), format: z.enum(["css", "tailwind", "json"]).optional() } },
    async ({ id, format }) => {
      const e = await getExtraction(id);
      const t = e?.brand?.tokens;
      if (!e || e.userId !== actor.userId || !t) return fail("Tokens not ready");
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
    { title: "Prompt enhancer", description: "Rewrite a design/build prompt into a golden prompt grounded in the brand's exact colours, type, layout and components.", inputSchema: { id: z.string(), prompt: z.string() } },
    async ({ id, prompt }) => {
      const e = await getExtraction(id);
      if (!e || e.userId !== actor.userId || !e.brand) return fail("Brand system not ready");
      const t = Date.now();
      const out = await enhancePrompt(e.brand, prompt);
      await recordUsage(actor, "enhance", 0, id, Date.now() - t);
      return text(out);
    },
  );

  server.registerTool(
    "search_styles",
    {
      title: "Style search",
      description: "Find real brand systems matching a natural-language style description (when the user has no brand yet). Light = 1 credit, deep = 2 credits with match reasoning.",
      inputSchema: { query: z.string(), depth: z.enum(["light", "deep"]).optional(), limit: z.number().int().min(1).max(12).optional(), filters: z.array(z.string()).optional() },
    },
    async (args) => {
      const out = await styleSearch(actor, args);
      return jsonText({ id: out.id, tags: out.tags, results: out.results.map((r) => ({ id: r.id, name: r.name, url: r.url, match: r.match, palette: r.palette, typography: r.typography, tags: r.tags, reasoning: r.reasoning, screenshot: r.screenshot ? `${config.appUrl}${r.screenshot}` : null })), next: "Call extract_brand on the chosen url to get its full system." });
    },
  );

  server.registerTool(
    "verify_adherence",
    {
      title: "Verify adherence",
      description: "Score a built page (design URL) against a reference brand URL across 7 categories, with fixes and agent instructions. 2 credits. Waits by default (can take 1-3 minutes).",
      inputSchema: { reference: z.string(), design: z.string(), wait: z.boolean().optional() },
    },
    async ({ reference, design, wait }) => {
      const row = await createAdherence(actor, { reference, design });
      if (wait === false) return jsonText({ id: row.id, status: row.status, poll_with: "get_adherence" });
      const done = await waitFor(() => getAdherence(row.id), (a) => a.status === "completed" || a.status === "failed", 270_000);
      if (!done) return fail("Run not found");
      if (done.status === "failed") return fail(`Verification failed: ${done.error}`);
      if (done.status !== "completed") return jsonText({ id: row.id, status: done.status, note: "Still running — call get_adherence." });
      const r = done.report!;
      return jsonText({ id: done.id, score: r.overall.score, grade: r.overall.grade, summary: r.overall.summary, categories: r.categories.map((c) => ({ key: c.key, score: c.score, deviations: c.deviations, fixes: c.fixes })), agentInstructions: r.agentInstructions, report: `${config.appUrl}/app/adherence/${done.id}` });
    },
  );

  server.registerTool(
    "get_adherence",
    { title: "Get adherence report", description: "Fetch an adherence run.", inputSchema: { id: z.string() } },
    async ({ id }) => {
      const a = await getAdherence(id);
      if (!a || a.userId !== actor.userId) return fail("Run not found");
      return jsonText(serializeAdherence(a));
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
            text: `Build: ${task}\n\n1. Call extract_brand on ${reference}, then get_brand_brief and get_brand_tokens (tailwind).\n2. Call enhance_prompt with the task to get a golden prompt, and build from it using only the brand's tokens.\n3. Deploy or serve the result at a URL and call verify_adherence(reference=${reference}, design=<your url>).\n4. Apply the returned fixes and re-verify until the overall score is ≥ 85.`,
          },
        },
      ],
    }),
  );

  return server;
}
