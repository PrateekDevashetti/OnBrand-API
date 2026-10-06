import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
const b = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
d.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 300)));
await d.goto(`http://localhost:3100/app/extractions/${process.argv[2]}`, { waitUntil: "networkidle" });
console.log("panel", await d.locator("#panel").count(), "sec-colors", await d.locator("#sec-colors").count());
for (let i = 0; i < 8; i++) {
  await d.mouse.move(900, 500); await d.mouse.wheel(0, 500);
  await d.waitForTimeout(250);
  console.log(i, "dock", await d.locator('nav[aria-label="Design areas"]').count(), "active", await d.locator("nav button.bg-\\[\\#2c2c2b\\]").first().innerText().catch(() => "?"));
}
await b.close();
