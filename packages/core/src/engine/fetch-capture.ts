import * as cheerio from "cheerio";
import type { Capture, PageSignals, Weighted, ColorSignal, TextStyleSignal } from "./signals";
import { env } from "../env";

const UA = "Mozilla/5.0 (compatible; OnBrandBot/1.0; +https://trycanopy.space/onbrand)";

function tally(list: string[]): Weighted[] {
  const m = new Map<string, number>();
  for (const v of list) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count, weight: count }));
}

function normHex(h: string): string {
  let x = h.replace("#", "");
  if (x.length === 3) x = x.split("").map((c) => c + c).join("");
  return `#${x.slice(0, 6).toUpperCase()}`;
}

async function firecrawlScreenshot(url: string): Promise<Buffer | null> {
  if (!env.firecrawlKey) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: [{ type: "screenshot", fullPage: true }], onlyMainContent: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { screenshot?: string } };
    const shot = json.data?.screenshot;
    if (!shot) return null;
    const img = await fetch(shot);
    return Buffer.from(await img.arrayBuffer());
  } catch {
    return null;
  }
}

/** Browserless capture: HTML + stylesheets parsed statically. Lower fidelity than the browser path. */
export async function fetchCapture(url: string): Promise<Capture> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  const html = await res.text();
  const finalUrl = res.url || url;
  const $ = cheerio.load(html);
  const cssUrls = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter(Boolean)
    .slice(0, 12)
    .map((h) => new URL(h!, finalUrl).toString());
  const cssParts = await Promise.all(
    cssUrls.map((u) =>
      fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) })
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => ""),
    ),
  );
  const css = [$("style").map((_, el) => $(el).text()).get().join("\n"), ...cssParts].join("\n");

  const hexes = (css.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).map(normHex);
  const colors: ColorSignal[] = tally(hexes)
    .slice(0, 40)
    .map((c) => ({ hex: c.value, alpha: 1, weight: c.count, text: 0, bg: 0, border: 0, count: c.count }));

  const families = tally(
    (css.match(/font-family\s*:\s*([^;}{]+)/g) ?? []).map((m) => m.replace(/font-family\s*:\s*/, "").trim()),
  );
  const textStyles: TextStyleSignal[] = families.slice(0, 8).map((f, i) => ({
    tag: i === 0 ? "body" : "h1",
    family: f.value,
    size: "16px",
    weight: "400",
    lineHeight: "normal",
    letterSpacing: "normal",
    transform: "none",
    color: "",
    count: f.count,
    chars: f.count * 100,
    sample: "",
    top: 0,
  }));

  const cssVars = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)].slice(0, 200).map((m) => ({ name: m[1], value: m[2].trim() }));
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)].slice(0, 30).map((m) => ({ name: m[1], css: m[0] }));
  const mediaQueries = [...new Set([...css.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim()))].slice(0, 40);
  const fontFaces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].slice(0, 40).map((m) => ({
    family: (m[1].match(/font-family\s*:\s*([^;]+)/)?.[1] ?? "").replace(/["']/g, "").trim(),
    weight: m[1].match(/font-weight\s*:\s*([^;]+)/)?.[1] ?? "",
    src: (m[1].match(/src\s*:\s*([^;]+)/)?.[1] ?? "").slice(0, 400),
  }));
  const pick = (re: RegExp) => tally((css.match(re) ?? []).map((m) => m.replace(/^[\w-]+\s*:\s*/, "").trim())).slice(0, 15);

  const logoImg = $('header img, [class*="logo" i] img, img[alt*="logo" i]').first();
  const logoSvg = $('header a[href="/"] svg, [class*="logo" i] svg').first();
  const signals: PageSignals = {
    url: finalUrl,
    title: $("title").text().trim(),
    description: $('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "",
    ogImage: $('meta[property="og:image"]').attr("content") ?? "",
    siteName: $('meta[property="og:site_name"]').attr("content") ?? "",
    favicon: new URL($('link[rel~="icon"]').attr("href") ?? "/favicon.ico", finalUrl).toString(),
    lang: $("html").attr("lang") ?? "",
    viewport: { w: 1440, h: 900 },
    docHeight: 0,
    colors,
    textStyles,
    cssVars,
    keyframes,
    mediaQueries,
    fontFaces,
    loadedFonts: [],
    shadows: pick(/box-shadow\s*:\s*[^;}{]+/g),
    borders: pick(/border(?:-top|-bottom)?\s*:\s*\d[^;}{]+/g),
    radii: pick(/border-radius\s*:\s*[^;}{]+/g),
    transitions: pick(/transition\s*:\s*[^;}{]+/g),
    animations: pick(/animation\s*:\s*[^;}{]+/g),
    gradients: pick(/(?:linear|radial)-gradient\([^;}{]+/g),
    backdrops: pick(/backdrop-filter\s*:\s*[^;}{]+/g),
    spacing: pick(/(?:padding|gap)\s*:\s*[^;}{]+/g),
    buttons: [],
    inputs: [],
    nav: { height: "", position: "", background: "", backdrop: "", links: $("header a, nav a").map((_, a) => $(a).text().trim()).get().filter(Boolean).slice(0, 12) },
    logo: logoSvg.length
      ? { kind: "svg", svg: $.html(logoSvg), alt: "", w: 0, h: 0 }
      : logoImg.length
        ? { kind: "img", src: new URL(logoImg.attr("src") ?? "", finalUrl).toString(), alt: logoImg.attr("alt") ?? "", w: 0, h: 0 }
        : null,
    icons: [],
    media: $("img")
      .map((_, el) => ({ kind: "image", src: new URL($(el).attr("src") ?? "", finalUrl).toString(), alt: $(el).attr("alt") ?? "", w: 0, h: 0 }))
      .get()
      .filter((m) => !m.src.startsWith("data:"))
      .slice(0, 30),
    sections: $("section, footer")
      .map((_, el) => ({ tag: el.tagName, top: 0, height: 0, bg: "", headline: $(el).find("h1,h2,h3").first().text().trim().slice(0, 140), text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 280), counts: {} }))
      .get()
      .slice(0, 16),
    headings: $("h1, h2, h3")
      .map((_, el) => ({ level: el.tagName, text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 160) }))
      .get()
      .filter((h) => h.text)
      .slice(0, 30),
    links: [],
    text: $("body").text().replace(/\s+/g, " ").slice(0, 6000),
  };
  const screenshot = await firecrawlScreenshot(finalUrl);
  return { requestedUrl: url, finalUrl, signals, html, css, screenshot, hero: screenshot, slices: screenshot ? [screenshot] : [], via: screenshot ? "firecrawl" : "fetch" };
}
