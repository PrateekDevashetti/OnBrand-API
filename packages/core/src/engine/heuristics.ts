/**
 * Deterministic brand synthesis. Used when no LLM is configured, and per-section when an
 * LLM call fails. Everything here is derived from measured signals — no invented values.
 */
import { parse, converter, differenceCiede2000 } from "culori";
const deltaE = differenceCiede2000();
import type { Capture, PageSignals, ButtonSignal, SectionSignal } from "./signals";
import type { digest } from "./analyze";
import { clusterColors, ramp, typeScale, fontFamilies, breakpoints, type ColorFamily } from "./analyze";
import type { GroupKey } from "./synthesize";
import type { Color, TypeStyle } from "../types";

type Digest = ReturnType<typeof digest>;
const toLch = converter("lch");

// ---------- colour naming ----------

function hueName(h: number) {
  // LCH hue angles (#FF0000≈41°, #FFA500≈71°, #FFFF00≈100°, #00AA00≈134°, #00CCCC≈196°, #0000EE≈301°, #8000FF≈308°, #FF00FF≈327°).
  const names: [number, string][] = [[25, "Rose"], [58, "Red"], [85, "Orange"], [115, "Yellow"], [170, "Green"], [230, "Teal"], [260, "Cyan"], [305, "Blue"], [318, "Violet"], [345, "Magenta"], [360, "Rose"]];
  return names.find(([lim]) => h <= lim)![1];
}

export function colorName(hex: string): string {
  const c = toLch(parse(hex));
  if (!c) return hex;
  const l = c.l ?? 0, ch = c.c ?? 0, h = c.h ?? 0;
  if (ch < 8) {
    const warm = ch > 2.5 && h > 60 && h < 140;
    if (l < 8) return "Void Black";
    if (l < 16) return "Ink Black";
    if (l < 28) return "Charcoal Black";
    if (l < 45) return "Graphite";
    if (l < 62) return "Muted Grey";
    if (l < 80) return "Silver Grey";
    if (l < 97) return warm ? "Off-White" : "Mist White";
    return "White";
  }
  const base = hexIsSystemBlue(hex) ? "Hyperlink Blue" : hueName(h);
  if (base === "Hyperlink Blue") return base;
  const adj = l < 30 ? "Deep" : l < 50 ? "Rich" : l > 82 ? "Pale" : l > 68 ? "Soft" : ch > 60 ? "Electric" : "Signal";
  return `${adj} ${base}`;
}

function hexIsSystemBlue(hex: string) {
  return /^#0000E[0-9A-F]$|^#0000FF$/i.test(hex);
}

function luminance(hex: string) {
  const c = toLch(parse(hex));
  return c?.l ?? 50;
}

function roleOf(f: ColorFamily): "surface" | "text" | "border" {
  if (f.role.bg >= f.role.text && f.role.bg >= f.role.border) return "surface";
  if (f.role.text >= f.role.border) return "text";
  return "border";
}

function colorUsage(f: ColorFamily, s: PageSignals): string[] {
  const out: string[] = [];
  const secBg = s.sections.filter((x) => x.bg && x.bg.toUpperCase() === f.hex);
  if (secBg.length) out.push(secBg[0].top < 900 ? "Hero section background" : "Section backgrounds");
  if (f.role.text > 1) out.push(f.lightness > 60 ? "Headlines and text on dark surfaces" : "Body and heading typography");
  if (s.buttons.some((b) => (b.css.backgroundColor ?? "").replace(/\s/g, "").length && toHex(b.css.backgroundColor) === f.hex)) out.push("Button fills");
  if (s.nav && s.nav.background.toUpperCase() === f.hex) out.push("Navigation bar background");
  if (f.role.border > 0.5) out.push("Borders and dividers");
  if (f.tone === "Accent" && !out.length) out.push("Accents and highlights");
  return out.slice(0, 3).length ? out.slice(0, 3) : [roleOf(f) === "surface" ? "Surfaces" : "Typography"];
}

function toHex(rgb?: string): string | null {
  const m = rgb?.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
  if (!m || (m[4] !== undefined && parseFloat(m[4]) < 0.3)) return null;
  return "#" + [m[1], m[2], m[3]].map((n) => Math.round(parseFloat(n)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function describeColor(f: ColorFamily, mode: string, rank: number): string {
  const role = roleOf(f);
  if (f.tone === "Accent") return `An accent used sparingly to draw attention — interactive elements and highlights against the ${mode} canvas.`;
  if (role === "surface") {
    return rank === 0
      ? `The dominant ${f.lightness < 40 ? "dark" : "light"} surface of the brand, anchoring most sections and setting the overall ${f.lightness < 40 ? "dark-mode" : "light"} mood.`
      : `A supporting ${f.lightness < 40 ? "dark" : "light"} surface used to create contrast between sections and containers.`;
  }
  if (role === "text") return `Primary ${f.lightness > 60 ? "light" : "dark"} text colour, carrying ${f.lightness > 60 ? "headlines and body copy on dark sections" : "typography on light sections"} with high contrast.`;
  return "Used for hairline borders, dividers and subtle outlines that separate content.";
}

export function heuristicColors(capture: Capture) {
  const s = capture.signals;
  const fams = clusterColors(s);
  const mode = modeOf(fams, s);
  const seen = new Set<string>();
  const toColor = (f: ColorFamily, i: number): Color => {
    let name = colorName(f.hex);
    if (seen.has(name)) {
      const c = toLch(parse(f.hex));
      const alt = `${(c?.h ?? 0) > 40 && (c?.h ?? 0) < 140 && (c?.c ?? 0) > 1.5 ? "Warm" : "Cool"} ${name.split(" ").pop()}`;
      name = seen.has(alt) ? `${name} ${i + 1}` : alt;
    }
    seen.add(name);
    return {
      name,
      hex: f.hex,
      tone: f.tone,
      description: describeColor(f, mode, i),
      usage: colorUsage(f, s),
      shades: [],
    };
  };
  const colors = fams.map(toColor);
  const accents = colors.filter((c) => c.tone === "Accent");
  const famOf = new Map(fams.map((f) => [f.hex, f]));
  // The lead neutral is the heaviest one on the side of the detected mode (dark site → its dark canvas).
  const byWeight = colors.filter((c) => c.tone !== "Accent");
  const lead = byWeight.find((c) => (famOf.get(c.hex)!.lightness < 45) === (mode === "dark")) ?? byWeight[0];
  const neutrals = lead ? [lead, ...byWeight.filter((c) => c !== lead)] : byWeight;
  // Secondary neutrals: surfaces before text colours, each group by visual weight.
  const isSurface = (c: Color) => roleOf(famOf.get(c.hex)!) === "surface";
  const rest = neutrals.slice(accents.length ? 1 : 2);
  const secondary = [...rest.filter(isSurface), ...rest.filter((c) => !isSurface(c))].slice(0, 5);
  const baseline = [...neutrals.slice(0, 1), ...accents.slice(0, 1), ...(accents.length ? [] : neutrals.slice(1, 2))];
  // Tint/shade ramps are shown for the lead surface of each tier (the colours a designer extends).
  for (const lead of [baseline[0], secondary[0]]) {
    if (!lead) continue;
    const f = famOf.get(lead.hex)!;
    lead.shades = [...new Set([...f.members.slice(1), ...ramp(lead.hex)])].slice(0, f.lightness > 60 ? 3 : 4);
  }
  return {
    baseline,
    secondary,
    others: [...accents.slice(1), ...neutrals.slice(6)],
    notes: [
      `${mode === "dark" ? "Dark" : "Light"}-first palette built on ${neutrals.slice(0, 2).map((c) => `${c.name} (${c.hex})`).join(" and ")}.`,
      accents.length ? `${accents.length} accent colour${accents.length > 1 ? "s" : ""} (${accents.map((a) => a.hex).join(", ")}) used sparingly for emphasis.` : "No saturated accent — contrast comes from value, not hue.",
    ],
  };
}

function modeOf(fams: ColorFamily[], s?: PageSignals) {
  // Total painted surface area of dark vs light families (a dark site often uses several near-blacks)...
  let dark = fams.filter((f) => f.lightness < 45).reduce((a, f) => a + f.role.bg, 0);
  let light = fams.filter((f) => f.lightness >= 45).reduce((a, f) => a + f.role.bg, 0);
  // ...plus the first viewport, which sets the mode a visitor perceives: it carries a third of the vote.
  const fold = (s?.sections ?? []).filter((x) => x.top < 900 && x.bg && !/^transparent|rgba\(0, 0, 0, 0\)$/.test(x.bg));
  if (fold.length) {
    const vis = (x: { top: number; height: number }) => Math.max(0, Math.min(900, x.top + x.height) - Math.max(0, x.top));
    const darkFold = fold.filter((x) => luminance(x.bg) < 45).reduce((a, x) => a + vis(x), 0);
    const lightFold = fold.filter((x) => luminance(x.bg) >= 45).reduce((a, x) => a + vis(x), 0);
    const total = dark + light;
    if (darkFold + lightFold > 0) {
      dark += (total / 2) * (darkFold / (darkFold + lightFold));
      light += (total / 2) * (lightFold / (darkFold + lightFold));
    }
  }
  return dark > light ? "dark" : "light";
}

// ---------- identity ----------

function features(s: PageSignals) {
  const f: string[] = [];
  if (s.media.some((m) => m.kind === "video")) f.push("background video");
  if (s.sections.some((x) => (x.counts.canvas ?? 0) > 0)) f.push("canvas / WebGL scenes");
  if (s.keyframes.some((k) => /marquee|scroll|ticker|loop/i.test(k.name))) f.push("marquees");
  if (s.keyframes.some((k) => /swiper|carousel|slide/i.test(k.name)) || /swiper|flickity|splide|slick/i.test(s.text)) f.push("carousels");
  if (s.nav && (s.nav.position === "fixed" || s.nav.position === "sticky")) f.push("sticky navigation");
  if (s.backdrops.length) f.push("frosted-glass blur");
  if (s.gradients.length) f.push("gradients");
  if (s.media.filter((m) => m.kind === "illustration").length > 2) f.push("vector illustrations");
  if (s.media.filter((m) => m.kind === "image").length > 8) f.push("photography-led imagery");
  return f;
}

function keywords(s: PageSignals, mode: string, fonts: { family: string }[], fams: ColorFamily[]) {
  const k = new Set<string>([mode === "dark" ? "dark mode" : "light"]);
  if (fonts.some((f) => /mono/i.test(f.family))) k.add("technical");
  if (fonts.some((f) => /serif|garamond|caslon|tiempos|playfair|georgia/i.test(f.family) && !/sans/i.test(f.family))) k.add("editorial");
  if (fams.filter((f) => f.tone === "Accent").length === 0) k.add("minimalist");
  if (fams.filter((f) => f.tone === "Accent").length >= 3) k.add("vibrant");
  const feats = features(s);
  if (feats.includes("canvas / WebGL scenes") || feats.includes("background video")) k.add("immersive");
  if (feats.includes("photography-led imagery")) k.add("photographic");
  if (fonts.some((f) => /grotesk|matter|inter|helvetica|neue|diatype|haas|geist|sohne|söhne/i.test(f.family))) k.add("geometric");
  if (mode === "dark" && fams.length <= 6) k.add("premium");
  return [...k].slice(0, 7);
}

function copyTone(text: string) {
  const t = text.toLowerCase();
  const tone: string[] = [];
  if (/\b(api|agent|model|infra|developer|sdk|deploy|data)\b/.test(t)) tone.push("Technical");
  if (/\b(mission|future|believe|world|end |change)\b/.test(t)) tone.push("Mission-driven");
  if ((t.match(/\byou(r)?\b/g) ?? []).length > 6) tone.push("Conversational");
  if (/!/.test(text)) tone.push("Energetic");
  if (/\b(craft|design|beautiful|taste|studio)\b/.test(t)) tone.push("Conceptual");
  if (tone.length < 3) tone.push("Confident");
  return [...new Set(tone)].slice(0, 3);
}

function audience(text: string) {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (/\b(developer|engineer|api|sdk|code)\b/.test(t)) out.push("Developers and engineering teams integrating the product into their stack");
  if (/\b(design|brand|creative|studio)\b/.test(t)) out.push("Designers and creative leads who care about craft and brand quality");
  if (/\b(founder|startup|team|company|business)\b/.test(t)) out.push("Founders and product leaders evaluating tools for their teams");
  if (/\b(enterprise|security|compliance|scale)\b/.test(t)) out.push("Enterprise buyers who need scale, security and reliability");
  if (/\b(career|join|hiring|jobs)\b/.test(t)) out.push("Prospective hires drawn to the mission and culture");
  if (/\b(shop|buy|cart|collection|product)\b/.test(t) && out.length < 2) out.push("Consumers browsing and buying products");
  return out.length ? out.slice(0, 4) : ["Visitors evaluating the brand's offering"];
}

function styleClass(mode: string, fonts: { family: string }[], fams: ColorFamily[], feats: string[]) {
  const mono = fonts.some((f) => /mono/i.test(f.family));
  const serif = fonts.some((f) => /serif|garamond|tiempos|playfair|caslon/i.test(f.family) && !/sans/i.test(f.family));
  const accents = fams.filter((f) => f.tone === "Accent").length;
  if (mode === "dark" && mono) return ["Brutalism", "Corporate"];
  if (serif) return ["Editorial", "Minimalism"];
  if (accents >= 3) return ["Playful", "Maximalism"];
  if (feats.includes("canvas / WebGL scenes") || feats.includes("background video")) return ["Immersive", "Modernism"];
  if (accents === 0) return ["Minimalism", "Swiss"];
  return ["Modern", "Corporate"];
}

// ---------- layout ----------

function asciiTemplate(s: PageSignals) {
  const W = 46;
  const line = (t = "") => `│ ${t.slice(0, W - 4).padEnd(W - 4)} │`;
  const out = [`┌${"─".repeat(W - 2)}┐`];
  const links = (s.nav?.links ?? []).slice(0, 4).join("  ");
  out.push(line(`[Logo]   ${links ? `[${links.slice(0, 20)}]` : "[Nav]"}   [CTA]`));
  out.push(`├${"─".repeat(W - 2)}┤`);
  s.sections.slice(0, 10).forEach((x, i) => {
    const kind = x.tag === "footer" ? "Footer" : i === 0 ? "Hero" : x.counts.video ? "Video section" : (x.counts.img ?? 0) > 4 ? "Image grid" : (x.counts.input ?? 0) > 0 ? "Form" : "Content";
    out.push(line(`[${kind} — ${luminance(x.bg || "#fff") < 45 ? "dark" : "light"} ${x.bg}]`));
    if (x.headline) out.push(line(`  "${x.headline.slice(0, W - 10)}"`));
    const parts = [x.counts.img ? `${x.counts.img} img` : "", x.counts.video ? `${x.counts.video} video` : "", x.counts.button ? `${x.counts.button} btn` : "", x.counts.svg ? `${x.counts.svg} icons` : ""].filter(Boolean);
    if (parts.length) out.push(line(`  [${parts.join("] [")}]`));
    out.push(i === Math.min(9, s.sections.length - 1) ? `└${"─".repeat(W - 2)}┘` : `├${"─".repeat(W - 2)}┤`);
  });
  if (out[out.length - 1].startsWith("├")) out[out.length - 1] = `└${"─".repeat(W - 2)}┘`;
  return out.join("\n");
}

function annotations(s: PageSignals) {
  return s.sections
    .slice(0, 10)
    .map((x, i) => {
      const name = x.tag === "footer" ? "FOOTER" : i === 0 ? "HERO SECTION" : (x.headline || `SECTION ${i + 1}`).toUpperCase().slice(0, 40);
      const lines = [`**${name}:**`, `- Background: ${luminance(x.bg || "#fff") < 45 ? "Dark" : "Light"} (${x.bg})`];
      if (x.headline) lines.push(`- Typography: Headline "${x.headline.slice(0, 80)}"`);
      const comp = Object.entries(x.counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
      if (comp.length) lines.push(`- Components: ${comp.join(", ")}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function separation(s: PageSignals) {
  const bgs = s.sections.map((x) => x.bg).filter(Boolean);
  const uniq = [...new Set(bgs)];
  const dark = uniq.filter((b) => luminance(b) < 45), light = uniq.filter((b) => luminance(b) >= 45);
  if (dark.length && light.length) return `Sections alternate between dark (${dark.slice(0, 2).join(", ")}) and light (${light.slice(0, 2).join(", ")}) backgrounds, creating strong visual separation without heavy dividers.`;
  return `A consistent ${dark.length ? "dark" : "light"} canvas (${uniq.slice(0, 2).join(", ")}); sections are separated by generous vertical spacing${s.borders.length ? " and hairline borders" : ""}.`;
}

// ---------- components ----------

function buttonName(b: ButtonSignal) {
  const bg = toHex(b.css.backgroundColor);
  const border = /^0px|none/.test(b.css.border ?? "") ? null : toHex((b.css.border ?? "").replace(/^[\d.]+px \w+ /, ""));
  const variant = bg ? (luminance(bg) < 45 ? "Dark Filled" : "Light Filled") : border ? (luminance(border) > 60 ? "Outline Light" : "Outline Dark") : "Text";
  return { variant, name: `${b.text || "Button"} (${variant})` };
}

function radiusKeyword(r?: string) {
  const v = parseFloat(r ?? "0");
  return v >= 20 ? "rounded-full" : v >= 8 ? "rounded-md" : v > 0 ? "rounded" : "rounded-none";
}

function cssOf(o: Record<string, string> | null | undefined) {
  return o ? Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v}`).join("; ") : "";
}

function describeKeyframe(name: string) {
  const n = name.toLowerCase();
  if (/fade|in$|appear|reveal/.test(n)) return "Fade/reveal entrance animation";
  if (/spin|rotate/.test(n)) return "Continuous rotation (loaders, decorative spinners)";
  if (/marquee|scroll|ticker/.test(n)) return "Infinite horizontal marquee";
  if (/slide/.test(n)) return "Slide transition";
  if (/pulse|blink|ping/.test(n)) return "Pulsing attention indicator";
  return "Custom keyframe animation";
}

function sectionLayout(x: SectionSignal, i: number) {
  if (i === 0 && x.counts.video) return "Centered with background video";
  if (x.counts.video) return "Full-bleed video";
  if ((x.counts.img ?? 0) > 6) return "Image grid / gallery";
  if ((x.counts.input ?? 0) > 0) return "Form with inputs";
  if ((x.counts.canvas ?? 0) > 0) return "Interactive canvas";
  if (x.tag === "footer") return "Multi-column footer";
  if ((x.counts.img ?? 0) > 1) return "Split text + imagery";
  return i === 0 ? "Centered hero" : "Text block";
}

// ---------- brand name ----------

/** The name the brand uses for itself: og:site_name, else logo alt text, else the title segment matching the host. */
export function brandName(s: PageSignals, host: string): string {
  const label = host.split(".")[0];
  const PAGE_WORDS = /\s+(pricing|plans|blog|careers|jobs|about( us)?|contact( us)?|home|homepage|docs|documentation|changelog|case stud(y|ies)|customers|news|press)$/i;
  const tidy = (t: string) => t.trim().replace(/\s+/g, " ").replace(PAGE_WORDS, "");
  const caps = (t: string) => (t === t.toUpperCase() && t.length > 3 ? t[0] + t.slice(1).toLowerCase() : t);
  if (s.siteName && s.siteName.length <= 40) return tidy(s.siteName);
  const alt = tidy(s.logo?.alt ?? "").replace(/\s*(logo|home|homepage)$/i, "");
  if (alt && alt.length <= 30 && label.toLowerCase().includes(alt.toLowerCase().replace(/\W/g, "").slice(0, 4))) return caps(alt);
  const seg = (s.title || "").split(/\s[|–—:·-]\s/).map(tidy).find((t) => t.length <= 30 && label.toLowerCase().startsWith(t.toLowerCase().replace(/\W/g, "").slice(0, 4)));
  if (seg) return caps(seg);
  return label.replace(/^\w/, (c) => c.toUpperCase());
}

// ---------- groups ----------

export function heuristicGroup(key: GroupKey, capture: Capture, d: Digest): unknown {
  void d;
  const s = capture.signals;
  const fams = clusterColors(s);
  const mode = modeOf(fams, s);
  const fonts = fontFamilies(s).filter((f) => !/icon|awesome|material symbols/i.test(f.family));
  const feats = features(s);
  switch (key) {
    case "identity": {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      const name = brandName(s, host);
      const surface = fams.find((f) => roleOf(f) === "surface") ?? fams[0];
      const text = fams.find((f) => roleOf(f) === "text" && f.hex !== surface?.hex);
      const accent = fams.find((f) => f.tone === "Accent");
      const [primary, secondary] = styleClass(mode, fonts, fams, feats);
      const kw = keywords(s, mode, fonts, fams);
      const fontLine = fonts.length ? fonts.slice(0, 2).map((f) => f.family).join(" and ") : "system fonts";
      return {
        identity: {
          companyName: name,
          pageTitle: s.title,
          pageTags: ["Core Marketing", new URL(s.url).pathname === "/" ? "Homepage" : new URL(s.url).pathname.split("/").filter(Boolean)[0]?.replace(/^\w/, (c) => c.toUpperCase()) ?? "Page", /\b(ai|agent|model)\b/i.test(s.text) ? "SaaS / AI" : "Web"],
          purpose: s.description || s.headings[0]?.text || `${name} website`,
          mainCta: s.buttons.find((b) => b.text)?.text ?? "",
          summary: `${mode === "dark" ? "Dark" : "Light"}, ${kw.includes("immersive") ? "immersive" : "focused"} interface built on ${surface ? `${colorName(surface.hex).toLowerCase()} (${surface.hex})` : "neutral"} surfaces${text ? ` with ${colorName(text.hex).toLowerCase()} (${text.hex}) typography` : ""}${accent ? ` and a ${colorName(accent.hex).toLowerCase()} (${accent.hex}) accent` : ""}. ${feats.length ? `The visual identity leans on ${feats.slice(0, 3).join(", ")}.` : "The visual identity stays restrained, letting type and spacing carry the brand."} Typography pairs ${fontLine}${fonts.some((f) => /mono/i.test(f.family)) ? ", mixing monospace labels with sans-serif copy for a technical edge" : ""}.`,
          keywords: kw,
          copyTone: copyTone(s.text),
          visualHighlights: feats.length ? `${feats.map((f) => f.replace(/^\w/, (c) => c.toUpperCase())).join(", ")}.` : "Clean typographic layouts with minimal decoration.",
          accentStrategy: `${text ? `${colorName(text.hex)} (${text.hex}) text` : "Text"} against ${surface ? `${colorName(surface.hex).toLowerCase()} (${surface.hex})` : "neutral"} backgrounds creates ${mode === "dark" ? "stark" : "crisp"} contrast${accent ? `; ${accent.hex} is reserved for highlights and interactive states` : "; emphasis comes from weight and scale rather than colour"}.`,
          targetAudience: audience(s.text),
          executiveSynthesis: `${name} presents itself through ${s.title ? `“${s.title}”` : "its homepage"}${s.description ? ` — ${s.description}` : ""}. The ${mode} visual system, ${fontLine} typography and ${feats[0] ?? "restrained layout"} position the brand as ${kw.includes("premium") ? "premium and considered" : kw.includes("vibrant") ? "energetic and approachable" : "clear and credible"}, with copy that reads ${copyTone(s.text).join(", ").toLowerCase()}.`,
          primaryStyle: { name: primary, rationale: `Derived from the ${mode} palette (${fams.slice(0, 3).map((f) => f.hex).join(", ")}), ${fontLine} type and ${fams.filter((f) => f.tone === "Accent").length} accent colour(s).` },
          secondaryStyle: { name: secondary, rationale: `Supported by the layout structure (${s.sections.length} stacked sections) and component styling (${s.buttons.length} button styles, ${s.radii[0]?.value ?? "square"} radii).` },
          styleTags: [...kw.slice(0, 3), primary].map((t) => t.replace(/^\w/, (c) => c.toUpperCase())),
          mode,
        },
      };
    }
    case "palette": {
      return {
        colors: heuristicColors(capture),
        surfaces: {
          textures: [
            s.gradients.length ? "gradient linear" : "flat",
            ...(s.backdrops.length || /backdrop-filter\s*:\s*blur\(\s*[1-9]/i.test(capture.css ?? "") ? ["glass blur"] : []),
          ],
          solids: (() => {
            const surf = fams.filter((f) => f.tone !== "Accent" && (roleOf(f) === "surface" || f.role.bg > 0));
            const lead = surf.find((f) => (f.lightness < 45) === (mode === "dark")) ?? surf[0];
            const ordered = lead ? [lead, ...surf.filter((f) => f !== lead)] : surf;
            // Each family's visibly distinct members are separate surfaces (e.g. #FBFBFB vs #FFFFFF).
            const entries: { hex: string; f: ColorFamily }[] = [];
            for (const f of ordered) {
              entries.push({ hex: f.hex, f });
              for (const m of f.members.slice(1)) {
                if (entries.some((e) => (deltaE(parse(e.hex)!, parse(m)!) ?? 0) < 1.2)) continue;
                entries.push({ hex: m, f });
              }
            }
            const sameSide = (hex: string) => (luminance(hex) < 45) === (mode === "dark");
            const grouped = [...entries.filter((e) => sameSide(e.hex)), ...entries.filter((e) => !sameSide(e.hex))];
            const names = new Set<string>();
            return grouped.slice(0, 8).map(({ hex, f }, i) => {
              const lum = luminance(hex);
              let name = i === 0 ? "Global Background" : `${colorName(hex)} Surface`;
              if (names.has(name)) name = `${colorName(hex)} ${lum >= 45 ? "Tint" : "Shade"} Surface`;
              names.add(name);
              return {
                name,
                hex,
                description:
                  i === 0
                    ? `Primary ${lum < 45 ? "dark" : "light"} background used throughout the site`
                    : `${lum < luminance(lead!.hex) ? "Deeper" : "Lighter"} surface for contrasting sections and containers`,
                usage: colorUsage(f, s),
              };
            });
          })(),
          gradients: s.gradients.slice(0, 6).map((g, i) => ({ name: `Gradient ${i + 1}`, css: g.value, description: g.value.startsWith("radial") ? "Radial glow / vignette" : "Linear gradient overlay or fill", usage: [g.sample ?? "Decorative backgrounds"].filter(Boolean) })),
        },
      };
    }
    case "typography": {
      const sc = typeScale(s);
      const roles = ["L", "M", "S", "XS", "XXS", "XXXS"];
      const toType = (t: (typeof sc.titles)[number], role: string): TypeStyle => ({ family: t.primary, role, size: t.size, weight: t.weight, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, textTransform: t.transform, stack: t.family });
      const monoF = fonts.find((f) => /mono/i.test(f.family));
      return {
        typography: {
          summary: fonts.length <= 1 ? "single-typeface · strong" : monoF ? "sans + mono pairing" : `${fonts.length} families`,
          families: fonts.map((f, i) => ({ family: f.family, classification: /mono/i.test(f.family) ? "Monospace" : /serif/i.test(f.family) && !/sans/i.test(f.family) ? "Serif" : "Sans-serif", usage: i === 0 ? "Primary typeface for body copy and UI" : /mono/i.test(f.family) ? "Labels, buttons and technical accents" : "Secondary / display usage", source: f.src ? (/fonts\.gstatic|googleapis/.test(f.src) ? "Google Fonts" : "Self-hosted") : "System / provider", downloadUrl: f.src })),
          titles: sc.titles.map((t, i) => toType(t, `Global Headline ${roles[i]}`)),
          body: sc.body.map((t, i) => toType(t, `Body ${roles[i]}`)),
          labels: sc.labels.map((t, i) => toType(t, `${/mono/i.test(t.primary) ? "Mono Label" : "Label"} ${roles[i]}`)),
          others: sc.others.map((t, i) => toType(t, `Other ${i + 1}`)),
          notes: [
            fonts.length > 1 ? `The system pairs ${fonts.slice(0, 2).map((f) => f.family).join(" with ")}.` : `A single typeface, ${fonts[0]?.family ?? "system"}, carries the whole hierarchy.`,
            sc.titles[0] ? `Largest headline: ${sc.titles[0].size} at weight ${sc.titles[0].weight}.` : "",
            sc.body.some((t) => Number(t.weight) <= 300) ? "Body copy uses light weights (≤300) for an airy texture." : "",
          ].filter(Boolean),
        },
      };
    }
    case "spatial": {
      const bps = breakpoints(s);
      const name = (b: number) => (b < 480 ? "Mobile S" : b < 768 ? "Mobile" : b < 992 ? "Tablet" : b < 1440 ? "Desktop" : "Large");
      const cards = s.radii.length > 0 && s.sections.some((x) => (x.counts.img ?? 0) > 2);
      const gutter = s.spacing.find((x) => /rem|px/.test(x.value))?.value ?? "";
      return {
        layout: {
          classification: [cards ? "card based" : "section stacked", s.sections.filter((x) => x.headline).length > 2 ? "centered symmetric" : "asymmetric"],
          grid: { columns: "12", gutter, maxWidth: s.cssVars.find((v) => /max|container|width/i.test(v.name) && /px|rem/.test(v.value))?.value ?? "" },
          breakpoints: bps.slice(0, 6).map((b) => ({ name: name(b), range: `${b}px`, detail: b < 768 ? "1 column" : b < 992 ? "8 columns" : "12 columns" })),
          sectionSeparation: separation(s),
          template: asciiTemplate(s),
          annotations: annotations(s),
          insights: [
            separation(s),
            `${s.sections.length} stacked sections averaging ${Math.round(s.sections.reduce((a, x) => a + x.height, 0) / Math.max(1, s.sections.length))}px tall — ${s.sections.length && s.sections.reduce((a, x) => a + x.height, 0) / s.sections.length > 800 ? "full-height, scene-like pacing" : "compact, information-dense pacing"}.`,
            fonts.length > 1 ? `Typography uses a ${fonts.length}-family system (${fonts.map((f) => f.family).join(", ")}).` : "",
            bps.length ? `Responsive breakpoints at ${bps.join(", ")}px.` : "",
          ].filter(Boolean),
        },
        elevation: {
          summary: s.shadows.length ? "Elevation is expressed with box-shadows on floating and interactive elements." : "This site primarily uses borders and surface contrast for elevation rather than box-shadows.",
          shadows: s.shadows.slice(0, 6).map((x, i) => {
            const blur = parseFloat(x.value.split(" ").filter((p) => p.endsWith("px"))[2] ?? "0");
            return { name: x.value.includes("inset") ? `Inset Shadow ${i + 1}` : blur > 16 ? `Soft Elevation ${i + 1}` : blur > 0 ? `Subtle Shadow ${i + 1}` : `Outline Ring ${i + 1}`, kind: x.value.includes("inset") ? "inset" : "drop", css: x.value, description: blur > 16 ? "Large diffuse shadow for floating overlays" : "Tight shadow for cards and controls", usage: [] };
          }),
          borders: s.borders.slice(0, 10).map((b) => ({ css: b.value, description: `${b.count} occurrence${b.count > 1 ? "s" : ""}` })),
        },
        structure: {
          dividers: s.borders.slice(0, 3).map((b, i) => ({ name: i === 0 ? "Section Stroke" : `Divider ${i + 1}`, css: b.value, description: i === 0 ? "Thin horizontal line used between content sections" : "Subtle divider for grouping content", usage: i === 0 ? ["Content section breaks"] : ["Lists and cards"] })),
        },
      };
    }
    case "components": {
      const seen = new Set<string>();
      const buttons = s.buttons
        .map((b) => ({ b, ...buttonName(b) }))
        .filter(({ name }) => (seen.has(name) ? false : (seen.add(name), true)))
        .slice(0, 8)
        .map(({ b, name, variant }) => ({
          name,
          label: b.text,
          description: `${variant} button${b.top < 120 ? " in the navigation bar" : b.top < 900 ? " in the hero" : ""}${b.hover ? ", with a measured hover state" : ""}.`,
          radius: radiusKeyword(b.css.borderRadius),
          surface: (luminance(b.parentBg) < 45 ? "dark" : "light") as "dark" | "light",
          defaultCss: cssOf(b.css),
          hoverCss: cssOf(b.hover),
          sizes: [`Default: ${b.css.fontSize} · ${b.css.padding}`],
        }));
      const iconStyle = s.icons.length ? (s.icons.filter((i) => i.stroke && i.stroke !== "none").length > s.icons.length / 2 ? "Line Art / Outlined" : "Solid / Filled") : "";
      return {
        interactions: {
          buttons,
          links: [],
          inputs: s.inputs.map((i) => ({ name: i.placeholder || "Text input", description: "Form input as rendered on the page", usage: ["Forms"], css: cssOf(i.css) })),
        },
        navigation: {
          height: s.nav?.height ?? "",
          position: s.nav?.position ?? "",
          background: s.nav?.background ?? "",
          tabs: s.nav?.links.length
            ? [{ name: "Nav Link", description: `Top-level links: ${[...new Set(s.nav.links)].slice(0, 5).join(", ")}.`, states: [{ state: "default", description: "Primary text colour" }, { state: "hover", description: s.transitions.some((t) => /opacity|all/.test(t.value)) ? "Opacity / colour transition" : "Colour shift" }, { state: "selected", description: "Current page emphasised" }] }]
            : [],
        },
        icons: {
          // Group by size: UI icons (≥20px) and small caption/label icons (<20px), each with its own style.
          sets: [
            { list: s.icons.filter((i) => Math.max(i.w, i.h) >= 20), kind: "UI", use: ["General UI elements", "Form and status feedback"], what: "Standard UI icons used for actions, feedback and general interface elements." },
            { list: s.icons.filter((i) => Math.max(i.w, i.h) < 20), kind: "Caption", use: ["Interactive labels", "Inline captions"], what: "Small functional icons used in interactive captions, links and tags." },
          ]
            .filter((g) => g.list.length)
            .map((g) => {
              const style = g.list.filter((i) => i.stroke && i.stroke !== "none").length > g.list.length / 2 ? "Line Art / Outlined" : "Solid / Filled";
              return {
                name: `${style.startsWith("Line") ? "Outlined" : "Solid"} ${g.kind} Icons`,
                format: "SVG",
                style,
                description: `${g.what} ${g.list.length} found.`,
                whenToUse: g.use,
                sizes: [...new Set(g.list.map((i) => `${i.w}×${i.h}px`))].slice(0, 3).join(" · "),
                examples: g.list.map((i) => i.label).filter(Boolean).slice(0, 6),
              };
            }),
        },
        motion: {
          patterns: [s.nav?.position === "fixed" || s.nav?.position === "sticky" ? "sticky header" : "", ...feats.filter((f) => /video|marquee|carousel/.test(f)).map((f) => f.replace("background video", "video background")), s.transitions.length ? "hover transform" : "", s.keyframes.some((k) => /fade|in/i.test(k.name)) ? "scroll reveal" : ""].filter(Boolean),
          animations: [
            ...s.keyframes.slice(0, 6).map((k) => ({ name: k.name, description: describeKeyframe(k.name), code: k.css })),
            ...s.transitions.slice(0, 4).map((t, i) => ({ name: `transition-${i + 1}`, description: /opacity/.test(t.value) ? "Opacity transition on hover" : /transform/.test(t.value) ? "Transform transition" : "State transition", code: t.value })),
          ],
        },
        dataDisplay: {
          tiles: s.sections
            .filter((x) => (x.counts.img ?? 0) >= 3)
            .slice(0, 4)
            .map((x) => ({ name: (x.headline || "Card").slice(0, 40) + " cards", description: `Repeated tiles with ${x.counts.img} images${x.counts.button ? ` and ${x.counts.button} actions` : ""}.`, usage: [x.headline ? x.headline.slice(0, 40) : "Content listing"] })),
        },
      };
    }
    case "sections": {
      return {
        sections: s.sections.map((x, i) => ({
          name: x.tag === "footer" ? "Footer" : i === 0 ? "Hero" : x.headline ? x.headline.slice(0, 48) : `Section ${i + 1}`,
          layout: sectionLayout(x, i),
          headline: x.headline,
          components: Object.entries(x.counts)
            .filter(([, n]) => n > 0)
            .slice(0, 6)
            .map(([k, n]) => ({ name: k === "img" ? "Image" : k === "svg" ? "Icon" : k.charAt(0).toUpperCase() + k.slice(1), description: `${n} ${k === "img" ? "image" : k}${n > 1 ? "s" : ""} in this section` })),
        })),
        media: s.media.slice(0, 24).map((m) => {
          const file = m.src.split("/").pop()?.split("?")[0] ?? "asset";
          return { name: m.alt || decodeURIComponent(file).slice(0, 60), description: m.kind === "video" ? "Background / inline video" : m.alt ? `Image: ${m.alt}` : m.kind === "illustration" ? "Vector illustration" : "Image asset", kind: (m.kind === "video" ? "video" : m.kind === "illustration" ? "illustration" : "image") as "video" | "image" | "illustration", url: m.src };
        }),
      };
    }
  }
  return {};
}
