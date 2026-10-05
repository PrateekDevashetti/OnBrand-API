/** Independent ground-truth probe (not our collector): loaded font faces, h1/body fonts, page background. */
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
const b = await chromium.launch({ executablePath: resolveChromium(), headless: true });
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" });
  try {
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await p.waitForTimeout(5000);
    const r = await p.evaluate(`(() => {
      const faces = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
      const cs = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
      const h1 = cs("h1"), body = cs("body"), html = cs("html");
      return { faces: [...new Set(faces)].slice(0, 8), h1: h1 && h1.fontFamily.split(",")[0], body: body && body.fontFamily.split(",")[0], bodyBg: body && body.backgroundColor, htmlBg: html && html.backgroundColor };
    })()`);
    console.log(url, JSON.stringify(r));
  } catch (e) { console.log(url, "ERR", (e as Error).message.split("\n")[0]); }
  await p.close();
}
await b.close();
