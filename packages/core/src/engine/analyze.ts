import { differenceCiede2000, parse, converter, formatHex } from "culori";
import type { PageSignals, TextStyleSignal } from "./signals";
import type { DesignTokens } from "../types";

const toLch = converter("lch");
const de = differenceCiede2000();

export type ColorFamily = {
  hex: string;
  weight: number;
  role: { text: number; bg: number; border: number };
  members: string[];
  lightness: number;
  chroma: number;
  tone: "Neutral" | "Light" | "Dark" | "Accent";
};

export function primaryFamily(stack: string): string {
  return (stack.split(",")[0] ?? "").replace(/["']/g, "").trim();
}

export function classifyTone(hex: string): ColorFamily["tone"] {
  const c = toLch(parse(hex));
  const l = c?.l ?? 50;
  const ch = c?.c ?? 0;
  if (ch > 22) return "Accent";
  if (l >= 80) return "Light";
  if (l <= 22) return "Dark";
  return "Neutral";
}

/** Cluster observed colors into perceptual families (ΔE2000 < 6). */
export function clusterColors(signals: PageSignals): ColorFamily[] {
  const fams: ColorFamily[] = [];
  const sorted = [...signals.colors].filter((c) => c.alpha >= 0.5).sort((a, b) => b.weight - a.weight);
  for (const c of sorted) {
    const p = parse(c.hex);
    if (!p) continue;
    // Neutrals cluster tighter: #111 vs #1E1E1E are distinct design tokens, not shades of one.
    const neutral = (toLch(p)?.c ?? 0) < 8;
    const hit = fams.find((f) => de(parse(f.hex)!, p) < (neutral && f.chroma < 8 ? 3.5 : 6));
    if (hit) {
      hit.weight += c.weight;
      hit.role.text += c.text;
      hit.role.bg += c.bg;
      hit.role.border += c.border;
      if (!hit.members.includes(c.hex)) hit.members.push(c.hex);
    } else {
      const lch = toLch(p);
      fams.push({
        hex: c.hex.toUpperCase(),
        weight: c.weight,
        role: { text: c.text, bg: c.bg, border: c.border },
        members: [c.hex.toUpperCase()],
        lightness: Math.round(lch?.l ?? 0),
        chroma: Math.round(lch?.c ?? 0),
        tone: classifyTone(c.hex),
      });
    }
  }
  // Chromatic design tokens declared as CSS custom properties are brand colours even when the
  // captured viewport never paints them (e.g. a link blue used only on sub-pages).
  for (const v of signals.cssVars ?? []) {
    if (!/colou?r|brand|primary|accent|blue|red|green|link/i.test(v.name)) continue;
    const p = parse(v.value.trim());
    const lch = p && toLch(p);
    if (!p || !lch || (lch.c ?? 0) <= 22 || ("alpha" in p && (p.alpha ?? 1) < 0.5)) continue;
    const hex = formatHex(p)!.toUpperCase();
    if (fams.some((f) => de(parse(f.hex)!, p) < 6)) continue;
    fams.push({ hex, weight: 0.05, role: { text: 0, bg: 0, border: 0 }, members: [hex], lightness: Math.round(lch.l ?? 0), chroma: Math.round(lch.c ?? 0), tone: classifyTone(hex) });
  }
  // Accents are rare by area but matter; keep any chromatic family even with low weight.
  return fams.sort((a, b) => b.weight - a.weight).slice(0, 16);
}

/** Generate a 4-step tint/shade ramp for a color, used when the site shows only one value. */
export function ramp(hex: string): string[] {
  const c = toLch(parse(hex));
  if (!c) return [];
  // Light colours ramp lightest-first (white, then deeper tints); dark colours ramp four subtle lifts.
  const steps = c.l > 60 ? [4, -6, -12] : [3, 6, 9, 13];
  return steps.map((d) => formatHex({ ...c, l: Math.max(0, Math.min(100, c.l + d)) })!.toUpperCase());
}

export type TypeBucket = "titles" | "body" | "labels" | "others";

export function bucketText(t: TextStyleSignal): TypeBucket {
  const px = parseFloat(t.size);
  const fam = t.family.toLowerCase();
  const mono = /mono|code|courier|consol/.test(fam);
  if (/^h[1-3]$/.test(t.tag) || px >= 26) return "titles";
  if (mono || t.transform === "uppercase" || t.tag === "button" || t.tag === "label" || px <= 12.5) return "labels";
  if (["p", "li", "div", "span", "a", "td", "blockquote"].includes(t.tag) && px >= 13 && px <= 22) return "body";
  return "others";
}

export function typeScale(signals: PageSignals) {
  const seen = new Set<string>();
  const out: Record<TypeBucket, (TextStyleSignal & { primary: string })[]> = { titles: [], body: [], labels: [], others: [] };
  const sorted = [...signals.textStyles].sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  for (const t of sorted) {
    const key = [primaryFamily(t.family), t.size, t.weight, t.lineHeight].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const b = bucketText(t);
    if (out[b].length < 6) out[b].push({ ...t, primary: primaryFamily(t.family) });
  }
  return out;
}

export function fontFamilies(signals: PageSignals) {
  const usage = new Map<string, number>();
  for (const t of signals.textStyles) {
    const f = primaryFamily(t.family);
    if (!f) continue;
    usage.set(f, (usage.get(f) ?? 0) + t.chars);
  }
  return [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([family, chars]) => {
      const face = signals.fontFaces.find((ff) => ff.family.toLowerCase() === family.toLowerCase());
      const url = face?.src.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? "";
      return { family, chars, src: url, stack: signals.textStyles.find((t) => primaryFamily(t.family) === family)?.family ?? family };
    });
}

export function breakpoints(signals: PageSignals): number[] {
  const nums = new Set<number>();
  for (const q of signals.mediaQueries) {
    for (const m of q.matchAll(/(min|max)-width:\s*([\d.]+)(px|em|rem)/g)) {
      let v = parseFloat(m[2]);
      if (m[3] !== "px") v *= 16;
      if (v >= 300 && v <= 2600) nums.add(Math.round(v));
    }
  }
  return [...nums].sort((a, b) => a - b);
}

export function buildTokens(
  signals: PageSignals,
  palette: { name: string; hex: string }[],
  fonts: { family: string; stack: string }[],
): DesignTokens {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const color: Record<string, string> = {};
  for (const p of palette) color[slug(p.name) || p.hex.slice(1)] = p.hex;
  const font: Record<string, string> = {};
  fonts.forEach((f, i) => (font[i === 0 ? "sans" : /mono/i.test(f.family) ? "mono" : `alt-${i}`] = f.stack));
  const scale = typeScale(signals);
  const fontSize: Record<string, string> = {};
  [...scale.titles, ...scale.body, ...scale.labels].slice(0, 10).forEach((t) => {
    const px = Math.round(parseFloat(t.size));
    fontSize[`${px}`] = t.size;
  });
  const radius: Record<string, string> = {};
  signals.radii.slice(0, 5).forEach((r, i) => (radius[["sm", "md", "lg", "xl", "full"][i] ?? `r${i}`] = r.value));
  const shadow: Record<string, string> = {};
  signals.shadows.slice(0, 4).forEach((s, i) => (shadow[["sm", "md", "lg", "xl"][i]] = s.value));
  const spacing: Record<string, string> = {};
  signals.spacing
    .map((s) => s.value)
    .filter((v) => /^\d+(\.\d+)?px$/.test(v))
    .map((v) => parseFloat(v))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)
    .slice(0, 10)
    .forEach((v, i) => (spacing[`${i + 1}`] = `${v}px`));
  const lines = [
    ":root {",
    ...Object.entries(color).map(([k, v]) => `  --color-${k}: ${v};`),
    ...Object.entries(font).map(([k, v]) => `  --font-${k}: ${v};`),
    ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v};`),
    ...Object.entries(shadow).map(([k, v]) => `  --shadow-${k}: ${v};`),
    ...Object.entries(spacing).map(([k, v]) => `  --space-${k}: ${v};`),
    "}",
  ];
  return { color, font, fontSize, radius, shadow, spacing, css: lines.join("\n") };
}

/** Compact, LLM-friendly digest of the raw signals. */
export function digest(signals: PageSignals) {
  const fams = clusterColors(signals);
  const scale = typeScale(signals);
  return {
    url: signals.url,
    title: signals.title,
    description: signals.description,
    siteName: signals.siteName,
    colorFamilies: fams.map((f) => ({
      hex: f.hex,
      share: Math.round(f.weight),
      asText: Math.round(f.role.text),
      asBackground: Math.round(f.role.bg),
      asBorder: Math.round(f.role.border),
      tone: f.tone,
      members: f.members.slice(0, 6),
    })),
    translucentColors: signals.colors.filter((c) => c.alpha < 0.5).slice(0, 8).map((c) => `${c.hex}@${c.alpha}`),
    fonts: fontFamilies(signals),
    fontFaces: signals.fontFaces.slice(0, 12),
    typeScale: Object.fromEntries(
      Object.entries(scale).map(([k, v]) => [
        k,
        v.map((t) => ({ tag: t.tag, stack: t.family, size: t.size, weight: t.weight, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, transform: t.transform, color: t.color, sample: t.sample })),
      ]),
    ),
    cssVariables: signals.cssVars.slice(0, 80),
    breakpointsPx: breakpoints(signals),
    mediaQueries: signals.mediaQueries.slice(0, 12),
    keyframes: signals.keyframes.slice(0, 12),
    transitions: signals.transitions.slice(0, 10),
    animations: signals.animations.slice(0, 10),
    shadows: signals.shadows.slice(0, 8),
    borders: signals.borders.slice(0, 12),
    radii: signals.radii.slice(0, 8),
    gradients: signals.gradients.slice(0, 8),
    backdropFilters: signals.backdrops,
    spacing: signals.spacing.slice(0, 14).map((s) => s.value),
    buttons: signals.buttons.slice(0, 10).map((b) => ({ text: b.text, onBackground: b.parentBg, default: b.css, hover: b.hover })),
    inputs: signals.inputs.slice(0, 4),
    nav: signals.nav,
    icons: signals.icons.slice(0, 16).map((i) => ({ label: i.label, size: `${i.w}x${i.h}`, fill: i.fill, stroke: i.stroke, svgHead: i.svg.slice(0, 160) })),
    media: signals.media.slice(0, 24),
    sections: signals.sections,
    headings: signals.headings,
    pageText: signals.text.slice(0, 3500),
  };
}
