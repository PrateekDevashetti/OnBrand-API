/** Lists requests a page keeps making after load (diagnoses pages that never reach network idle). */
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";
const url = process.argv[2] ?? "https://brand.trycanopy.space/";
const b = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: "load" });
const seen: Record<string, number> = {};
p.on("request", (r) => { const u = new URL(r.url()); const k = `${r.method()} ${u.host}${u.pathname.replace(/[a-z0-9]{12,}/gi, ":id")}`; seen[k] = (seen[k] ?? 0) + 1; });
await p.waitForTimeout(10000);
console.log(Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${n}\t${k}`).join("\n") || "no requests after load");
await b.close();
