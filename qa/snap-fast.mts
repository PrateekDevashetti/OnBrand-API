/** Screenshot one URL. usage: npx tsx qa/snap.mts URL out.(jpg|png) [width] [height] */
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
const [url, out, w, h] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const p = await b.newPage({ viewport: { width: Number(w ?? 1440), height: Number(h ?? 900) } });
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await p.waitForTimeout(6000);
await p.screenshot({ path: out, type: out.endsWith(".jpg") ? "jpeg" : "png", quality: out.endsWith(".jpg") ? 86 : undefined });
await b.close();
