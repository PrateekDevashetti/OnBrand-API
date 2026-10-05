import { z } from "zod";
import {
  IdentitySchema,
  ColorsSchema,
  SurfacesSchema,
  TypographySchema,
  LayoutSchema,
  ElevationSchema,
  StructureSchema,
  InteractionsSchema,
  NavigationSchema,
  IconsSchema,
  MotionSchema,
  DataDisplaySchema,
  PageSectionSchema,
  MediaItemSchema,
} from "../types";
import { structured, llmAvailable, type Effort } from "../llm";
import type { Capture } from "./signals";
import { digest } from "./analyze";
import * as H from "./heuristics";

export const SECTION_GROUPS = {
  identity: z.object({ identity: IdentitySchema }),
  palette: z.object({ colors: ColorsSchema, surfaces: SurfacesSchema }),
  typography: z.object({ typography: TypographySchema }),
  spatial: z.object({ layout: LayoutSchema, elevation: ElevationSchema, structure: StructureSchema }),
  components: z.object({
    interactions: InteractionsSchema,
    navigation: NavigationSchema,
    icons: IconsSchema,
    motion: MotionSchema,
    dataDisplay: DataDisplaySchema,
  }),
  sections: z.object({ sections: z.array(PageSectionSchema), media: z.array(MediaItemSchema) }),
} as const;

export type GroupKey = keyof typeof SECTION_GROUPS;
export type GroupResult<K extends GroupKey> = z.infer<(typeof SECTION_GROUPS)[K]>;

const SYSTEM = `You are OnBrand, a senior brand designer and design-systems engineer at Canopy Labs.
You turn raw, measured signals from a live website (computed styles, CSS, DOM structure, screenshots) into a precise, agent-ready brand system.

Rules:
- Ground every value in the measured signals. Prefer exact observed hex codes, font stacks, sizes, CSS values. Never invent fonts or colors that are not in the signals or clearly visible in the screenshots.
- Names should be plain and evocative ("Charcoal Black", "Hyperlink Blue"), descriptions concise and specific to this brand (no generic filler).
- Hex values are uppercase #RRGGBB.
- Write for two readers: a designer skimming, and an AI agent that must reproduce the brand faithfully.
- When something is not observable, return an empty array or empty string rather than guessing.`;

const GROUP_BRIEF: Record<GroupKey, string> = {
  identity:
    "Describe the brand identity: company name, page title and 3 page tags (category, page type, industry), purpose, main CTA, a vivid 3-sentence visual-identity summary, keywords, copy tone, visual highlights, accent strategy, target audience, an executive synthesis (positioning + how the visuals support it), primary and secondary style classification with rationale citing evidence, searchable style tags, and the overall mode.",
  palette:
    "Build the color system from colorFamilies (share = visual weight; asText/asBackground/asBorder show roles). baseline = the 1-3 anchor colors (usually dominant background + primary text + primary accent), secondary = supporting surfaces/text, others = rare functional colors. Put observed member hexes into shades. Then describe surfaces: texture styles (from gradients/backdropFilters), solid surface colors with usage, gradients with exact CSS.",
  typography:
    "Build the typography system from fonts, fontFaces and typeScale. Name each style with a role (Global Headline L/M/S/XS, Body L/M/S, Label/Mono, Button, Caption). Use the exact observed size/weight/line-height/letter-spacing values; use clamp() only if seen in CSS. families[] lists every real family with classification, usage and source (self-hosted URL from fontFaces, Google Fonts, Adobe, or system). summary is a 2-4 word descriptor like 'single-typeface · strong' or 'sans + mono pairing'. notes: 2-4 observations about hierarchy and pairing.",
  spatial:
    "Describe layout (classification, grid columns/gutter/max-width, breakpoints from breakpointsPx with column counts, section separation strategy, an ASCII wireframe template of the whole page in box-drawing characters, per-section visual annotations, and 4-6 insights), elevation (shadows with exact CSS + usage, borders with exact CSS), and structure (divider styles with exact CSS + usage).",
  components:
    "Describe interactive components: buttons (one per distinct style, with default & hover inline CSS taken from the measured default/hover values, radius keyword, the surface they sit on, sizes as 'Default: <font-size> · <padding>'), links, inputs; navigation (height, position, background, tab/link item states default/hover/selected); icons (icon sets with format, style, sizes, when to use, example names); motion (global patterns like sticky header / scroll reveal / marquee / carousel, and named animations with the exact keyframes or transition code); data display tiles (card/tile patterns with usage).",
  sections:
    "List the page sections top-to-bottom (navigation, hero, ..., footer). For each: name, layout pattern (e.g. 'Centered with background video', 'Horizontal split 3-column'), the headline copy, and its key components with short visual descriptions. Then list notable media assets (videos, hero images, illustrations, logos, icons) with a name, a one-line description, kind, and the absolute URL from the media signals.",
};

function pickImages(capture: Capture, key: GroupKey) {
  const all = [capture.hero, ...capture.slices].filter(Boolean) as Buffer[];
  const uniq = all.filter((b, i) => all.findIndex((x) => x.length === b.length) === i);
  const n = key === "typography" || key === "palette" ? 2 : key === "identity" ? 3 : 5;
  return uniq.slice(0, n).map((data) => ({ data, mediaType: "image/jpeg" as const }));
}

function digestFor(key: GroupKey, d: ReturnType<typeof digest>) {
  const base = { url: d.url, title: d.title, description: d.description, siteName: d.siteName };
  switch (key) {
    case "identity":
      return { ...base, headings: d.headings, sections: d.sections, nav: d.nav, pageText: d.pageText, colorFamilies: d.colorFamilies.slice(0, 6), fonts: d.fonts, buttons: d.buttons.map((b) => b.text) };
    case "palette":
      return { ...base, colorFamilies: d.colorFamilies, translucentColors: d.translucentColors, cssVariables: d.cssVariables.filter((v) => /#|rgb|hsl|oklch/i.test(v.value)), gradients: d.gradients, backdropFilters: d.backdropFilters, sections: d.sections.map((s) => ({ bg: s.bg, headline: s.headline })) };
    case "typography":
      return { ...base, fonts: d.fonts, fontFaces: d.fontFaces, typeScale: d.typeScale, cssVariables: d.cssVariables.filter((v) => /font|text|size|leading|tracking/i.test(v.name)) };
    case "spatial":
      return { ...base, breakpointsPx: d.breakpointsPx, mediaQueries: d.mediaQueries, spacing: d.spacing, shadows: d.shadows, borders: d.borders, radii: d.radii, sections: d.sections, cssVariables: d.cssVariables.filter((v) => /space|gap|width|container|grid|radius|shadow/i.test(v.name)) };
    case "components":
      return { ...base, buttons: d.buttons, inputs: d.inputs, nav: d.nav, icons: d.icons, keyframes: d.keyframes, transitions: d.transitions, animations: d.animations, radii: d.radii, sections: d.sections.map((s) => ({ headline: s.headline, counts: s.counts })) };
    case "sections":
      return { ...base, sections: d.sections, headings: d.headings, media: d.media, nav: d.nav };
  }
}

export type SynthOptions = { depth: "deep" | "light"; onGroupDone?: (key: GroupKey, result: Record<string, unknown>) => void | Promise<void> };

async function runGroup<K extends GroupKey>(key: K, capture: Capture, d: ReturnType<typeof digest>, opts: SynthOptions): Promise<GroupResult<K>> {
  const fallback = () => H.heuristicGroup(key, capture, d) as GroupResult<K>;
  if (!llmAvailable()) return fallback();
  const schema = SECTION_GROUPS[key];
  const payload = JSON.stringify(digestFor(key, d));
  const effort: Effort = opts.depth === "deep" ? "medium" : "low";
  try {
    let draft = await structured({
      system: SYSTEM,
      schema,
      effort,
      images: pickImages(capture, key),
      text: `${GROUP_BRIEF[key]}\n\nMeasured signals (JSON):\n${payload}\n\nScreenshots are attached top-to-bottom (1440px wide viewport).`,
    });
    if (opts.depth === "deep") {
      draft = await structured({
        system: SYSTEM,
        schema,
        effort: "medium",
        images: pickImages(capture, key),
        text: `Review pass. Here is a draft for this part of the brand system, plus the measured signals and screenshots. Correct any value that disagrees with the signals or screenshots, fill gaps that are clearly observable, tighten vague descriptions, and remove anything invented. Return the full corrected object.\n\nTask: ${GROUP_BRIEF[key]}\n\nDraft (JSON):\n${JSON.stringify(draft)}\n\nMeasured signals (JSON):\n${payload}`,
      });
    }
    return draft as GroupResult<K>;
  } catch (err) {
    console.error(`[onbrand] synth group ${key} failed, using heuristics:`, (err as Error).message);
    return fallback();
  }
}

export async function synthesize(capture: Capture, opts: SynthOptions) {
  const d = digest(capture.signals);
  const keys = Object.keys(SECTION_GROUPS) as GroupKey[];
  const results = await Promise.all(
    keys.map(async (k) => {
      const r = await runGroup(k, capture, d, opts);
      await opts.onGroupDone?.(k, r as Record<string, unknown>);
      return r;
    }),
  );
  return Object.assign({}, ...results) as GroupResult<"identity"> &
    GroupResult<"palette"> &
    GroupResult<"typography"> &
    GroupResult<"spatial"> &
    GroupResult<"components"> &
    GroupResult<"sections">;
}
