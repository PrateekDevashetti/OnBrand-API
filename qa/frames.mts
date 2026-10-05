/** Capture animation frames. usage: npx tsx qa/frames.mts URL outPrefix [w] [h] [ms,ms,...] */
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
const [url, out, w = "1512", h = "982", at = "1500,3500,6000"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) } });
await p.goto(url, { waitUntil: "networkidle" });
const t0 = Date.now();
for (const ms of at.split(",").map(Number)) {
  await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  await p.screenshot({ path: `${out}_${ms}.png` });
}
await b.close();
