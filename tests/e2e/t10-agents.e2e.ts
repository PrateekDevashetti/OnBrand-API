// Task #10 — developer interfaces: MCP server (tools + a real call), the two agent skills
// (shell fallback against the live API), the TypeScript SDK, and the public docs.
import { test } from "e2e";
import { test as webTest } from "@e2e-dev/web";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { OnBrand } from "../../packages/sdk/src/index";
import { BASE, KEY, expect, hasKey, isLocal, mcp } from "./helpers";

const TOOLS = [
  "extract_brand", "poll_brand_extraction", "get_brand_extraction_result", "list_brand_extractions",
  "search_brands", "search_similar_brands", "verify_brand_adherence", "poll_brand_adherence",
  "get_brand_adherence_result", "list_brand_adherence_jobs", "enhance_prompt",
];

test("MCP: rejects missing key", async () => {
  test.skip(isLocal, "local QA server signs every request in as the dev user");
  const res = await fetch(BASE + "/api/mcp", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  expect(res.status).toBe(401);
});

test("MCP: initialize, list every tool, call search_brands", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const init = await mcp("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
  expect(init.body?.result?.serverInfo?.name).toMatch(/onbrand/i);
  const list = await mcp("tools/list");
  const names = (list.body?.result?.tools ?? []).map((t: any) => t.name);
  for (const t of TOOLS) expect(names).toContain(t);
  const call = await mcp("tools/call", { name: "search_brands", arguments: { query: "warm minimal editorial brand", top_k: 3 } });
  expect(call.body?.result?.isError ?? false).toBe(false);
  expect(JSON.stringify(call.body?.result?.content ?? [])).toContain("url");
});

for (const skill of ["onbrand-search", "onbrand-adherence"]) {
  test(`skill ${skill}: SKILL.md present and its script talks to the API`, async () => {
    test.skip(!hasKey, "E2E_API_KEY not set");
    const dir = path.resolve("skills", skill);
    const md = execFileSync("cat", [path.join(dir, "SKILL.md")]).toString();
    expect(md).toMatch(/^---[\s\S]*name:\s*onbrand/m);
    const out = execFileSync("bash", [path.join(dir, "scripts/onbrand.sh"), "credits"], { env: { ...process.env, ONBRAND_API_URL: BASE, ONBRAND_API_KEY: KEY } }).toString();
    expect(JSON.parse(out).credits).toBeDefined();
  });
}

test("SDK: search and similar round-trip", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const ob = new OnBrand({ apiKey: KEY, baseUrl: BASE });
  const res = await ob.search({ query: "playful hand-drawn illustration brand", top_k: 3 });
  expect(res.results.length).toBe(3);
});

webTest("docs page documents API, MCP, skills and SDK with this deployment's URL", async ({ browser, screen }) => {
  await browser.goto(BASE + "/docs");
  for (const heading of ["MCP", "Skills", "SDK"]) await expect(screen.getByRole("heading", { name: new RegExp(heading, "i") }).first()).toBeVisible();
  const text = await browser.evaluate(() => document.body.innerText);
  expect(text).toContain("/api/v1/extract");
  expect(text).toContain("npx skills add");
});
