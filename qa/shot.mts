/**
 * Visual QA loop: screenshot app routes at 1920x1080 (the reference capture size).
 * usage: npx tsx qa/shot.ts /app /app/extract ...   (env BASE=http://localhost:3100)
 */
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
import fs from "node:fs";

const base = process.env.BASE ?? "http://localhost:3100";
const out = new URL("./shots/", import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 200)}`));
for (const arg of process.argv.slice(2)) {
  const [path, scroll, wait] = arg.split("@");
  const name = (path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root") + (scroll ? `_s${scroll}` : "");
  const res = await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => (errors.push(String(e)), null));
  await page.waitForTimeout(Number(wait ?? 900));
  if (scroll) await page.evaluate((y) => { const p = document.getElementById("panel"); (p ?? document.scrollingElement)!.scrollTo(0, y); }, Number(scroll));
  if (scroll) await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log(`${res?.status() ?? "ERR"} ${path} -> qa/shots/${name}.png`);
}
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
await browser.close();
