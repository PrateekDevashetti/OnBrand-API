// Task #15 — UI audit: no sideways overflow, no unreadably small text, every image has
// alt text, at phone, tablet, laptop and desktop widths.
import { test } from "@e2e-dev/web";
import { BASE, expect, openApp } from "./helpers";

const WIDTHS = [375, 768, 1280, 1920];
const PUBLIC = ["/", "/docs", "/privacy"];
const APP = ["/app", "/app/extract", "/app/search", "/app/adherence", "/app/usage", "/app/history", "/app/billing"];

const probe = () =>
  ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tiny: [...document.querySelectorAll("body *")].filter((e) => {
      const el = e as HTMLElement;
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) return false;
      if (el.closest('[aria-hidden="true"]')) return false; // decorative miniatures
      const r = el.getBoundingClientRect();
      return r.width > 0 && parseFloat(getComputedStyle(el).fontSize) < 9;
    }).length,
    noAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
  });

for (const w of WIDTHS) {
  test(`public pages at ${w}px`, async ({ browser }) => {
    await browser.setViewport({ width: w, height: 900 });
    for (const p of PUBLIC) {
      // "load" + a settle, not networkidle: Clerk's scripts and link prefetches keep connections busy.
      await browser.goto(BASE + p, { waitUntil: "load" });
      await new Promise((r) => setTimeout(r, 2500));
      const r = await browser.evaluate(probe);
      expect({ page: p, ...r }).toEqual({ page: p, overflowX: 0, tiny: 0, noAlt: 0 });
    }
  });

  test(`dashboard pages at ${w}px`, async ({ browser }) => {
    await browser.setViewport({ width: w, height: 900 });
    for (const p of APP) {
      await openApp(browser, p);
      const r = await browser.evaluate(probe);
      expect({ page: p, ...r }).toEqual({ page: p, overflowX: 0, tiny: 0, noAlt: 0 });
    }
  });
}
