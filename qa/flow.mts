/** Clicks through the core product flows in a real browser. */
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";

const base = process.env.BASE ?? "http://localhost:3100";
// Local runs: the QA fixture leaves the dev account nearly empty, so top it up first.
if (!process.env.BASE && process.env.DATABASE_URL) {
  const { execFileSync } = await import("node:child_process");
  execFileSync("psql", [process.env.DATABASE_URL, "-qc", "update users set credits = greatest(credits, 50) where id = 'dev_user'"]);
}
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const results: [string, boolean, string][] = [];
async function step(name: string, fn: () => Promise<string | void>) {
  const t = Date.now();
  try {
    const note = (await fn()) ?? "";
    results.push([name, true, `${note} (${Math.round((Date.now() - t) / 1000)}s)`]);
  } catch (e) {
    results.push([name, false, (e as Error).message.split("\n")[0]]);
  }
}

await step("landing → extract handoff", async () => {
  await page.goto(base + "/");
  const url = page.getByLabel("Website URL");
  await url.fill("https://resend.com");
  await url.locator("xpath=ancestor::form").getByRole("button", { name: "Extract" }).click();
  await page.waitForURL(/\/app\/extract\?url=/);
  const v = await page.locator('input[placeholder="https://add-url-here.com"]').inputValue();
  if (v !== "https://resend.com") throw new Error(`prefill was ${v}`);
});

await step("extraction form → live viewer → completed", async () => {
  await page.getByRole("tab", { name: "Light" }).click();
  await page.getByRole("tab", { name: "Fetch from scratch" }).click();
  await page.getByRole("button", { name: "Extract", exact: true }).click();
  await page.waitForURL(/\/app\/extractions\/ext_/, { timeout: 30000 });
  await page.locator("#sec-overview span.capitalize", { hasText: /^completed$/i }).waitFor({ timeout: 240000 });
  const swatches = await page.locator("#sec-colors span[style*='background']").count();
  if (swatches < 2) throw new Error("no colours rendered");
  return `${swatches} colour swatches`;
});

await step("viewer subnav scrolls to Typography", async () => {
  await page.getByRole("button", { name: "Typography" }).click();
  await page.waitForTimeout(2000);
  const top = await page.locator("#sec-typography").evaluate((el) => el.getBoundingClientRect().top);
  if (top > 300) throw new Error(`section top ${top}`);
});

await step("prompt enhancer returns a golden prompt", async () => {
  await page.getByRole("button", { name: "Prompt Enhancer" }).click();
  await page.locator("textarea").fill("Create a pricing page with three tiers");
  await page.getByRole("button", { name: /Enhance Prompt/ }).click();
  await page.locator("#sec-prompt pre").waitFor({ timeout: 120000 });
  return `${(await page.locator("#sec-prompt pre").innerText()).length} chars`;
});

await step("style search → results → detail", async () => {
  await page.goto(base + "/app/search");
  await page.locator('input[placeholder*="dark bold"]').fill("luxury editorial skincare brand");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("These results are the ones your agent is inspired by").waitFor({ timeout: 60000 });
  const n = await page.locator('a[href^="/app/styles/"]').count();
  await page.locator('a[href^="/app/styles/"]').first().click();
  await page.getByText("Prompt Match Reasoning").waitFor();
  return `${n} results`;
});

await step("adherence form → report streams → score", async () => {
  await page.goto(base + "/app/adherence");
  await page.getByRole("button", { name: "Reducto Home vs Pricing" }).click();
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/app\/adherence\/adh_/, { timeout: 30000 });
  await page.getByText("Overall adherence", { exact: false }).first().waitFor({ timeout: 300000 });
  const score = await page.locator("text=/\\/100 ·/").first().innerText();
  return score.replace(/\s+/g, " ");
});

await step("create API key modal shows secret once", async () => {
  await page.goto(base + "/app/api-keys");
  await page.getByRole("button", { name: "Create a new key" }).click();
  await page.locator("input.field").fill("Flow test key");
  await page.getByRole("button", { name: "Create key" }).click();
  await page.getByText("Your new API key").waitFor();
  const secret = await page.locator(".code pre").first().innerText();
  if (!secret.startsWith("ob_live_")) throw new Error("bad secret");
});

await step("history lists the run", async () => {
  await page.goto(base + "/app/history");
  return `${await page.locator('a[href^="/app/extractions/"]').count()} extraction rows`;
});

for (const [n, ok, note] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${n}  ${note}`);
if (errors.length) console.log("PAGE ERRORS:\n" + [...new Set(errors)].join("\n"));
await browser.close();
process.exit(results.every((r) => r[1]) ? 0 : 1);
