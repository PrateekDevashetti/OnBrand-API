import type { Page, Response } from "playwright-core";
import { getBrowser, browserAvailable } from "./browser";
import { COLLECTOR_SOURCE, HOVER_READ_SOURCE } from "./collector";
import type { Capture, PageSignals } from "./signals";
import { fetchCapture } from "./fetch-capture";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OnBrandBot/1.0 (+https://trycanopy.space/onbrand)";

const COOKIE_SELECTORS = [
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("Accept")',
  'button:has-text("I agree")',
  'button:has-text("Allow all")',
  'button:has-text("Got it")',
  '[id*="cookie" i] button',
  '[class*="cookie" i] button',
];

async function autoScroll(page: Page) {
  await page.evaluate(`(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    const max = Math.min(document.documentElement.scrollHeight, 30000);
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  })()`);
}

async function dismissOverlays(page: Page) {
  for (const sel of COOKIE_SELECTORS) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 150 })) {
        await loc.click({ timeout: 800 });
        await page.waitForTimeout(250);
        break;
      }
    } catch {
      /* ignore */
    }
  }
  // Promo / announcement modals: close via an in-dialog close control, else Escape.
  for (const sel of MODAL_CLOSE_SELECTORS) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 150 })) {
        await loc.click({ timeout: 800 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      /* ignore */
    }
  }
  if (await page.locator('[role="dialog"]:visible, [aria-modal="true"]:visible').count().catch(() => 0)) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
  }
}

const MODAL_CLOSE_SELECTORS = [
  '[role="dialog"] button[aria-label*="close" i]',
  '[aria-modal="true"] button[aria-label*="close" i]',
  '[class*="modal" i] button[aria-label*="close" i]',
  '[class*="popup" i] button[aria-label*="close" i]',
  '[class*="modal" i] [class*="close" i]',
  '[class*="popup" i] [class*="close" i]',
  'button[aria-label="Close" i]',
];

export type CrawlOptions = { timeoutMs?: number; fullPage?: boolean; lite?: boolean };

export async function capturePage(url: string, opts: CrawlOptions = {}): Promise<Capture> {
  if (!browserAvailable()) return fetchCapture(url);
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent: UA,
    locale: "en-US",
    colorScheme: "light",
  });
  const page = await context.newPage();
  const cssChunks: string[] = [];
  page.on("response", async (res: Response) => {
    try {
      const ct = res.headers()["content-type"] ?? "";
      if (res.request().resourceType() === "stylesheet" || ct.includes("text/css")) {
        const body = await res.text();
        if (body.length < 3_000_000) cssChunks.push(`/* ${res.url()} */\n${body}`);
      }
    } catch {
      /* body unavailable */
    }
  });
  try {
    const timeout = opts.timeoutMs ?? 45_000;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
    } catch (e) {
      // retry once with http fallback for bare domains
      if (url.startsWith("https://")) await page.goto(url.replace("https://", "http://"), { waitUntil: "domcontentloaded", timeout });
      else throw e;
    }
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
    await dismissOverlays(page);
    await page.waitForTimeout(800);
    let hero = await page.screenshot({ type: "jpeg", quality: 80 }).catch(() => null);
    // Intro loaders / splash screens: a near-uniform frame (tiny JPEG) or a frame that is still changing.
    // Re-shoot until two consecutive frames settle (≤ 4 tries, ~10s), dismissing late overlays each time.
    for (let i = 0; i < 4 && hero; i++) {
      await page.waitForTimeout(2500);
      await dismissOverlays(page);
      const next = await page.screenshot({ type: "jpeg", quality: 80 }).catch(() => null);
      if (!next) break;
      const settled = hero.length >= 30_000 && Math.abs(next.length - hero.length) / hero.length < 0.04;
      hero = next;
      if (settled) break;
    }
    await autoScroll(page);
    await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
    await page.evaluate(`(async () => { try { await document.fonts.ready } catch (e) {} })()`);

    const signals = (await page.evaluate(COLLECTOR_SOURCE)) as PageSignals;
    if (opts.lite) {
      // Index cards and the style detail frame show ~1.5 viewports of the top of the page (620×576 at 1440 wide).
      await page.evaluate("window.scrollTo(0, 0)").catch(() => {});
      await page.waitForTimeout(600);
      const docH = Number(await page.evaluate("document.documentElement.scrollHeight").catch(() => 900)) || 900;
      let tall: Buffer | null = null;
      if (docH >= 1340) {
        tall = await page.screenshot({ type: "jpeg", quality: 80, fullPage: true, clip: { x: 0, y: 0, width: 1440, height: 1340 } }).catch(() => null);
      } else {
        // App-shell pages (100vh layouts) don't grow with full-page capture: render a taller viewport instead.
        await page.setViewportSize({ width: 1440, height: 1340 }).catch(() => {});
        await page.waitForTimeout(900);
        tall = await page.screenshot({ type: "jpeg", quality: 80 }).catch(() => null);
      }
      const shot = tall ?? hero;
      return { requestedUrl: url, finalUrl: page.url(), signals, html: "", css: "", screenshot: shot, hero: shot, slices: shot ? [shot] : [], via: "browser" };
    }

    // Hover states for the first few distinct buttons
    for (const b of signals.buttons.slice(0, 8)) {
      try {
        const loc = page.locator(`[data-onbrand-btn="${b.index}"]`).first();
        await loc.scrollIntoViewIfNeeded({ timeout: 1000 });
        await loc.hover({ timeout: 1200, force: true });
        await page.waitForTimeout(450);
        b.hover = (await page.evaluate(`(${HOVER_READ_SOURCE})(${b.index})`)) as Record<string, string> | null;
        await page.mouse.move(0, 0);
      } catch {
        b.hover = null;
      }
    }
    // Viewport slices along the page for vision models (full-page shots get downscaled to illegible).
    const slices: Buffer[] = [];
    const docH = Math.min(signals.docHeight || 900, 12000);
    const n = Math.max(1, Math.min(6, Math.ceil(docH / 900)));
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : Math.round(((docH - 900) * i) / (n - 1));
      await page.evaluate(`window.scrollTo(0, ${y})`);
      await page.waitForTimeout(220);
      const shot = await page.screenshot({ type: "jpeg", quality: 62 }).catch(() => null);
      if (shot) slices.push(shot);
    }
    await page.evaluate("window.scrollTo(0, 0)");
    await page.waitForTimeout(250);

    let screenshot: Buffer | null = null;
    try {
      const h = Math.min(signals.docHeight || 900, 9000);
      screenshot = await page.screenshot({
        type: "jpeg",
        quality: 70,
        fullPage: opts.fullPage !== false && h <= 9000,
        clip: h > 9000 ? { x: 0, y: 0, width: 1440, height: 9000 } : undefined,
        timeout: 20_000,
      });
    } catch {
      screenshot = hero;
    }

    const inlineCss = await page
      .evaluate(`Array.from(document.querySelectorAll('style')).map((s) => s.textContent || '').join('\\n')`)
      .catch(() => "");
    const html = await page.content();
    return {
      requestedUrl: url,
      finalUrl: page.url(),
      signals,
      html,
      css: [String(inlineCss), ...cssChunks].join("\n\n"),
      screenshot,
      hero,
      slices,
      via: "browser",
    };
  } finally {
    await context.close().catch(() => {});
  }
}
