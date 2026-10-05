/**
 * Accessibility + interaction audit (ui-ux-pro-max checklist): text contrast (WCAG AA),
 * missing alt text, unlabeled icon-only controls, small hit targets, missing pointer cursor,
 * and horizontal scroll at mobile/tablet widths.
 * usage: npx tsx --env-file=.env qa/a11y.mts [pageName ...]
 */
import fs from "node:fs";
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";

const base = process.env.BASE ?? "http://localhost:3100";
const EXT = process.env.EXT_ID ?? "ext_gcpsvgvxlhlxy1iy";
const ADH = process.env.ADH_ID ?? "adh_qs33305mb2v2xx43";
const STY = process.env.STY_ID ?? "sty_0qfqvw8wr0o7t8l3";
const PAGES: [string, string][] = [
  ["landing", "/"],
  ["home", "/app"],
  ["extract", "/app/extract"],
  ["viewer", `/app/extractions/${EXT}`],
  ["search", "/app/search"],
  ["style", `/app/styles/${STY}`],
  ["adherence", "/app/adherence"],
  ["adherence_run", `/app/adherence/${ADH}`],
  ["usage", "/app/usage"],
  ["history", "/app/history"],
  ["keys", "/app/api-keys"],
  ["billing", "/app/billing"],
  ["profile", "/app/profile"],
  ["docs", "/app/docs"],
];
const VIEWPORTS: [number, number][] = (process.env.VIEWPORTS ?? "1440x900,1024x768,768x1024,375x812").split(",").map((v) => v.split("x").map(Number) as [number, number]);

const PROBE = `(() => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } if (getComputedStyle(n).backgroundImage !== 'none') return null; }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) out = blend(stack[i], out);
    return out;
  };
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n); if (c.visibility === 'hidden' || c.display === 'none' || parseFloat(c.opacity) < 0.3) return false; } return true; };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 40);
  const lowContrast = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement; const t = node.textContent.trim();
    if (!t || !el || seen.has(el) || el.closest('svg, [aria-hidden="true"], pre, code, .sr-only') || !vis(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el); const fg = parse(cs.color); const bg = bgOf(el);
    if (!fg || !bg) continue;
    const c = blend(fg, bg); const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need && !el.closest('button:disabled, [aria-disabled="true"]')) lowContrast.push(label(el) + ' ' + ratio.toFixed(2) + ':1 (' + size + 'px ' + cs.color + ')');
  }
  const noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt') && vis(i)).map((i) => i.src.slice(-50));
  const controls = [...document.querySelectorAll('a[href], button, [role="button"], [role="tab"], input, select, textarea')].filter(vis);
  const unlabeled = controls.filter((c) => !(c.innerText || '').trim() && !c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby') && !c.getAttribute('title') && !c.querySelector('img[alt]:not([alt=""])') && !(c.labels && c.labels.length) && !c.getAttribute('placeholder')).map((c) => c.outerHTML.slice(0, 80));
  const small = controls.filter((c) => { const r = c.getBoundingClientRect(); if (c.classList.contains('hit')) return false; return (r.width < 24 || r.height < 24) && !['input', 'textarea'].includes(c.tagName.toLowerCase()) && getComputedStyle(c).display !== 'inline'; }).map((c) => label(c) + ' ' + Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height));
  const noPointer = controls.filter((c) => /^(a|button)$/i.test(c.tagName) && !c.disabled && getComputedStyle(c).cursor !== 'pointer').map(label);
  const overflowX = document.documentElement.scrollWidth - innerWidth;
  return { lowContrast: [...new Set(lowContrast)], noAlt, unlabeled, small: [...new Set(small)], noPointer: [...new Set(noPointer)], overflowX };
})()`;

const only = process.argv.slice(2);
fs.mkdirSync("qa/audit", { recursive: true });
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const report: Record<string, unknown> = {};
for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const [name, path] of PAGES) {
    if (only.length && !only.includes(name)) continue;
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(900);
    const r = (await page.evaluate(PROBE)) as Record<string, string[] | number>;
    await page.screenshot({ path: `qa/audit/a11y_${name}_${w}.png` });
    report[`${name}@${w}`] = r;
    const n = (k: string) => (r[k] as string[]).length;
    console.log(`${name.padEnd(14)} ${String(w).padStart(4)}  contrast=${n("lowContrast")} noAlt=${n("noAlt")} unlabeled=${n("unlabeled")} small=${n("small")} noPointer=${n("noPointer")} overflowX=${r.overflowX}`);
  }
  await page.close();
}
fs.writeFileSync("qa/audit/a11y.json", JSON.stringify(report, null, 2));
await browser.close();
