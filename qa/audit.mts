/**
 * Layout audit across viewports: overlapping text, text over images, horizontal overflow,
 * clipped text and tiny fonts. Screenshots every page/viewport into qa/audit/.
 * usage: npx tsx --env-file=.env qa/audit.mts [pageName ...]
 */
import fs from "node:fs";
import { chromium } from "playwright-core";
import { resolveChromium } from "../packages/core/src/engine/browser";

const base = process.env.BASE ?? "http://localhost:3100";
const EXT = process.env.EXT_ID ?? "ext_gcpsvgvxlhlxy1iy";
const ADH = process.env.ADH_ID ?? "adh_qs33305mb2v2xx43";
const STY = process.env.STY_ID ?? "sty_0qfqvw8wr0o7t8l3";
const VIEWPORTS: [number, number][] = [
  [1920, 1080],
  [1512, 982],
  [1440, 900],
  [1280, 800],
];
const PAGES: [string, string][] = [
  ["landing", "/"],
  ["home", "/app"],
  ["extract", "/app/extract"],
  ["viewer", `/app/extractions/${EXT}`],
  ["search", "/app/search"],
  ["search_results", "/app/search?q=dark%20bold%20creative%20studio"],
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

const PROBE = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false;
    let n = el; while (n) { const c = getComputedStyle(n); if (parseFloat(c.opacity) < 0.05) return false; n = n.parentElement; }
    return true;
  };
  const desc = (el) => {
    const t = (el.innerText || el.getAttribute('alt') || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 50);
    const cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ').slice(0, 3).join('.');
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + ' "' + t + '"';
  };
  // Visible part of a box after every clipping ancestor (overflow != visible) is applied.
  const clipTo = (el, b) => {
    let L = b.left, T = b.top, R = b.right, B = b.bottom;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const c = getComputedStyle(n);
      if (/(hidden|clip|auto|scroll)/.test(c.overflow + c.overflowX + c.overflowY)) {
        const r = n.getBoundingClientRect(); L = Math.max(L, r.left); T = Math.max(T, r.top); R = Math.min(R, r.right); B = Math.min(B, r.bottom);
      }
    }
    return { left: L, top: T, right: R, bottom: B, width: Math.max(0, R - L), height: Math.max(0, B - T) };
  };
  // Leaf text boxes (range rects: the actual glyph area, not the block box)
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || !vis(el) || el.closest('svg, script, style, [aria-hidden="true"], .sr-only, pre, code')) continue;
    const r = document.createRange(); r.selectNodeContents(node);
    for (const raw of r.getClientRects()) {
      const b = clipTo(el, raw);
      if (b.width * b.height < 0.5 * raw.width * raw.height) continue;
      if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) continue;
      texts.push({ el, b, fs: parseFloat(getComputedStyle(el).fontSize) });
    }
  }
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  // Content scrolling under an opaque fixed/sticky bar is hidden by it, not an overlap.
  const opaqueBar = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if ((s.position === 'sticky' || s.position === 'fixed')) { const m = s.backgroundColor.match(/rgba?\(([^)]+)\)/); const al = m ? (m[1].split(',')[3] ?? '1') : '0'; return parseFloat(al) >= 0.99; } } return false; };
  const overlaps = [];
  for (let i = 0; i < texts.length && overlaps.length < 40; i++) for (let j = i + 1; j < texts.length; j++) {
    const A = texts[i], B = texts[j];
    if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
    if (opaqueBar(A.el) !== opaqueBar(B.el)) continue;
    const a = inter(A.b, B.b); const small = Math.min(A.b.width * A.b.height, B.b.width * B.b.height);
    if (a > 30 && a / small > 0.2) overlaps.push(desc(A.el) + '  ⟷  ' + desc(B.el) + ' @' + Math.round(A.b.left) + ',' + Math.round(A.b.top));
  }
  // Text sitting on top of images/media that are not its own background container
  const media = [...document.querySelectorAll('img, video, canvas')].filter((m) => vis(m)).map((m) => ({ m, b: clipTo(m, m.getBoundingClientRect()) })).filter((x) => x.b.width > 20 && x.b.height > 20);
  const onMedia = [];
  for (const T of texts) for (const M of media) {
    const a = inter(T.b, M.b);
    if (a < 40 || a / (T.b.width * T.b.height) < 0.5) continue;
    // intentional overlays live inside the same card as the media
    let card = M.m.parentElement, same = false;
    for (let k = 0; k < 4 && card; k++, card = card.parentElement) if (card.contains(T.el)) { same = true; break; }
    if (!same && onMedia.length < 20) onMedia.push(desc(T.el) + ' over ' + desc(M.m));
  }
  // Horizontal overflow
  const overflowX = document.documentElement.scrollWidth - vw;
  const offscreen = [];
  for (const el of document.querySelectorAll('body *')) {
    if (offscreen.length >= 15) break;
    const b = el.getBoundingClientRect();
    if (b.width === 0 || !vis(el)) continue;
    if (b.right > vw + 2 && b.left < vw && getComputedStyle(el).position !== 'fixed') {
      let p = el.parentElement, clipped = false;
      while (p) { const c = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(c.overflowX)) { clipped = p.getBoundingClientRect().right <= vw + 2; break; } p = p.parentElement; }
      if (!clipped) offscreen.push(desc(el) + ' right=' + Math.round(b.right));
    }
  }
  // Clipped text (cut off without an ellipsis)
  const clippedText = [];
  for (const el of document.querySelectorAll('body *')) {
    if (clippedText.length >= 20) break;
    if (!el.childNodes.length || !vis(el)) continue;
    const cs = getComputedStyle(el);
    if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
    if (cs.textOverflow === 'ellipsis' || parseInt(cs.webkitLineClamp) > 0) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const b = el.getBoundingClientRect();
    if (b.top > vh || b.bottom < 0) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 3) clippedText.push(desc(el) + ' ' + el.scrollWidth + 'x' + el.scrollHeight + ' in ' + el.clientWidth + 'x' + el.clientHeight);
  }
  const tiny = [...new Set(texts.filter((t) => t.fs < 10.5).map((t) => desc(t.el) + ' ' + t.fs + 'px'))].slice(0, 15);
  return { overlaps, onMedia, overflowX, offscreen, clippedText, tiny };
})()`;

const only = process.argv.slice(2);
fs.mkdirSync("qa/audit", { recursive: true });
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const report: Record<string, unknown> = {};
let issues = 0;
for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const [name, path] of PAGES) {
    if (only.length && !only.includes(name)) continue;
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);
    // Walk the page (or the app's scroll panel) a screen at a time, probing each step.
    const steps = Number(process.env.STEPS ?? 5);
    const r: Record<string, unknown[] | number> = { overlaps: [], onMedia: [], offscreen: [], clippedText: [], tiny: [], overflowX: 0 };
    for (let k = 0; k < steps; k++) {
      const moved = await page.evaluate(`(() => {
        const k = ${k};
        const sc = [...document.querySelectorAll('main, [data-scroll], div')].filter((e) => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 40; }).sort((a, b) => b.clientHeight - a.clientHeight)[0];
        const target = sc ?? document.scrollingElement;
        const max = target.scrollHeight - target.clientHeight;
        const y = Math.min(max, k * target.clientHeight * 0.9);
        if (k > 0 && y <= (target.__last ?? -1)) return false;
        target.scrollTop = y; target.__last = y; return true;
      })()`);
      if (!moved) break;
      await page.waitForTimeout(500);
      const part = (await page.evaluate(PROBE)) as Record<string, unknown[] | number>;
      for (const key of ["overlaps", "onMedia", "offscreen", "clippedText", "tiny"]) (r[key] as unknown[]).push(...(part[key] as unknown[]).map((x) => `[s${k}] ${x}`));
      r.overflowX = Math.max(r.overflowX as number, part.overflowX as number);
      await page.screenshot({ path: `qa/audit/${name}_${w}${k ? `_s${k}` : ""}.png` });
    }
    const n = (r.overlaps as unknown[]).length + (r.onMedia as unknown[]).length + (r.offscreen as unknown[]).length + (r.clippedText as unknown[]).length + ((r.overflowX as number) > 0 ? 1 : 0);
    issues += n;
    report[`${name}@${w}`] = r;
    const flag = n ? `✗ ${n}` : "✓";
    console.log(`${flag.padEnd(5)} ${name.padEnd(15)} ${w}x${h}  overlap=${(r.overlaps as unknown[]).length} onMedia=${(r.onMedia as unknown[]).length} overflowX=${r.overflowX} offscreen=${(r.offscreen as unknown[]).length} clipped=${(r.clippedText as unknown[]).length} tiny=${(r.tiny as unknown[]).length}`);
  }
  await page.close();
}
fs.writeFileSync("qa/audit/report.json", JSON.stringify(report, null, 2));
console.log(`\n${issues} issues · details in qa/audit/report.json`);
await browser.close();
