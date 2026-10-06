/** Signs in to a deployed OnBrand with the Clerk QA user and mints an API key through the real UI. Writes the key to KEY_OUT. */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
import { resolveChromium } from "../packages/core/src/engine/browser";

const base = process.env.BASE ?? "https://brand.trycanopy.space";
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/app", { waitUntil: "networkidle" });
await page.locator('input[name="identifier"]').fill(process.env.QA_EMAIL ?? "onbrand-qa+clerk_test@example.com");
await page.getByRole("button", { name: /^continue$/i }).first().click();
await page.locator('input[name="password"]').waitFor({ timeout: 15000 });
await page.locator('input[name="password"]').fill(process.env.QA_PASSWORD ?? "");
await page.getByRole("button", { name: /^continue$/i }).first().click();
await page.waitForURL(/(client-trust|factor-two|\/app)/, { timeout: 30000 });
if (/client-trust|factor-two/.test(page.url())) {
  await page.locator("input").first().click();
  await page.keyboard.type("424242", { delay: 60 });
}
await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 30000 });
console.log("signed in:", page.url());
await page.goto(base + "/app/api-keys", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Create a new key" }).click();
await page.locator("input.field").fill("Production e2e key");
await page.getByRole("button", { name: "Create key" }).click();
await page.getByText("Your new API key").waitFor({ timeout: 20000 });
const secret = (await page.locator(".code pre").first().innerText()).trim();
if (!secret.startsWith("ob_live_")) throw new Error("no key in modal");
writeFileSync(process.env.KEY_OUT!, secret);
console.log("key minted:", secret.slice(0, 12) + "…");
await browser.close();
