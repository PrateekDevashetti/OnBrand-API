import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
const [id, out] = [process.argv[2], process.argv[3]];
const b = await chromium.launch({ executablePath: resolveChromium(), headless: true });
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`http://localhost:3100/app/extractions/${id}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.getElementById("sec-colors")?.scrollIntoView({ block: "start" }));
  await p.waitForTimeout(900);
  if (w > 600) { const box = await p.locator('nav[aria-label="Design areas"] button').nth(4).boundingBox(); if (box) await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(500); }
  await p.screenshot({ path: `${out}/dock_${w}.png` });
  console.log(w, "dock buttons:", await p.locator('nav[aria-label="Design areas"] button').count());
}
await b.close();
