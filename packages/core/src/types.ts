import { z } from "zod";

/**
 * The OnBrand "brand system": everything an agent needs to stay on brand.
 * Every section is its own schema so it can be synthesized (and streamed) independently.
 */

export const ColorSchema = z.object({
  name: z.string().describe("Evocative but plain color name, e.g. 'Charcoal Black'"),
  hex: z.string().describe("Uppercase #RRGGBB"),
  tone: z.enum(["Neutral", "Light", "Dark", "Accent"]),
  description: z.string().describe("One or two sentences on the role this color plays in the brand"),
  usage: z.array(z.string()).describe("2-4 short usage tags, e.g. 'Hero section background'"),
  shades: z.array(z.string()).describe("Related observed hex values (tints/shades) for this color family"),
});

export const ColorsSchema = z.object({
  baseline: z.array(ColorSchema).describe("The 1-3 colors that anchor the brand"),
  secondary: z.array(ColorSchema).describe("Supporting colors"),
  others: z.array(ColorSchema).describe("Rare / functional colors (status, links, etc.)"),
  notes: z.array(z.string()).describe("2-4 observations on how color is used"),
});

export const TypeStyleSchema = z.object({
  family: z.string(),
  role: z.string().describe("e.g. 'Global Headline L', 'Body M', 'Mono Label'"),
  size: z.string().describe("CSS value as observed, e.g. 'clamp(2.5rem, 4vw, 4rem)' or '16px'"),
  weight: z.string(),
  lineHeight: z.string(),
  letterSpacing: z.string(),
  textTransform: z.string().describe("'none' or 'uppercase' etc."),
  stack: z.string().describe("Full font-family stack as CSS"),
});

export const TypographySchema = z.object({
  summary: z.string().describe("One line, e.g. 'single-typeface · strong' or 'sans + mono pairing'"),
  families: z.array(
    z.object({
      family: z.string(),
      classification: z.string().describe("e.g. 'Geometric sans-serif', 'Monospace'"),
      usage: z.string(),
      source: z.string().describe("Where the font is loaded from (self-hosted, Google Fonts, Adobe, system) "),
      downloadUrl: z.string().describe("Font file or provider URL if observed, else empty string"),
    }),
  ),
  titles: z.array(TypeStyleSchema),
  body: z.array(TypeStyleSchema),
  labels: z.array(TypeStyleSchema),
  others: z.array(TypeStyleSchema),
  notes: z.array(z.string()),
});

const UsageItem = z.object({
  name: z.string(),
  description: z.string(),
  usage: z.array(z.string()),
});

export const SurfacesSchema = z.object({
  textures: z.array(z.string()).describe("e.g. 'gradient linear', 'glass blur', 'noise', 'flat'"),
  solids: z.array(UsageItem.extend({ hex: z.string() })),
  gradients: z.array(UsageItem.extend({ css: z.string() })),
});

export const LayoutSchema = z.object({
  classification: z.array(z.string()).describe("e.g. 'card based', 'centered symmetric', 'asymmetric grid'"),
  grid: z.object({ columns: z.string(), gutter: z.string(), maxWidth: z.string() }),
  breakpoints: z.array(z.object({ name: z.string(), range: z.string(), detail: z.string() })),
  sectionSeparation: z.string(),
  template: z.string().describe("ASCII wireframe of the page, box-drawing characters, max ~90 cols wide"),
  annotations: z.string().describe("Markdown-ish per-section visual annotations (background, imagery, components, typography, colors)"),
  insights: z.array(z.string()),
});

export const ElevationSchema = z.object({
  summary: z.string(),
  shadows: z.array(UsageItem.extend({ kind: z.string().describe("drop | inset | glow"), css: z.string() })),
  borders: z.array(z.object({ css: z.string(), description: z.string() })),
});

export const ButtonSchema = z.object({
  name: z.string().describe("Label + variant, e.g. 'Try the API (Secondary Outline Light)'"),
  label: z.string(),
  description: z.string(),
  radius: z.string().describe("e.g. 'rounded', 'rounded-md', 'rounded-full', 'rounded-none'"),
  surface: z.enum(["light", "dark"]).describe("Background the button appears on"),
  defaultCss: z.string().describe("Inline CSS declarations for the default state"),
  hoverCss: z.string().describe("Inline CSS declarations for the hover state"),
  sizes: z.array(z.string()).describe("e.g. 'Default: 15px · 0.43rem 2rem'"),
});

export const InteractionsSchema = z.object({
  buttons: z.array(ButtonSchema),
  links: z.array(UsageItem),
  inputs: z.array(UsageItem.extend({ css: z.string() })),
});

export const StructureSchema = z.object({
  dividers: z.array(UsageItem.extend({ css: z.string() })),
});

export const DataDisplaySchema = z.object({
  tiles: z.array(UsageItem),
});

export const MotionSchema = z.object({
  patterns: z.array(z.string()).describe("e.g. 'sticky header', 'scroll reveal', 'marquee'"),
  animations: z.array(z.object({ name: z.string(), description: z.string(), code: z.string() })),
});

export const NavigationSchema = z.object({
  height: z.string(),
  position: z.string(),
  background: z.string(),
  tabs: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      states: z.array(z.object({ state: z.string(), description: z.string() })),
    }),
  ),
});

export const IconsSchema = z.object({
  sets: z.array(
    z.object({
      name: z.string(),
      format: z.string(),
      style: z.string(),
      description: z.string(),
      whenToUse: z.array(z.string()),
      sizes: z.string(),
      examples: z.array(z.string()).describe("Names of example icons observed"),
    }),
  ),
});

export const PageSectionSchema = z.object({
  name: z.string(),
  layout: z.string(),
  headline: z.string(),
  components: z.array(z.object({ name: z.string(), description: z.string() })),
});

export const MediaItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  kind: z.enum(["video", "image", "illustration", "icon", "logo"]),
  url: z.string(),
});

export const IdentitySchema = z.object({
  companyName: z.string(),
  pageTitle: z.string(),
  pageTags: z.array(z.string()).describe("3 tags: page category, page type, industry — e.g. 'Core Marketing', 'Homepage', 'SaaS / AI'"),
  purpose: z.string(),
  mainCta: z.string(),
  summary: z.string().describe("3 sentences: the visual identity in plain, vivid language"),
  keywords: z.array(z.string()).describe("5-7 single/double words"),
  copyTone: z.array(z.string()).describe("3 words"),
  visualHighlights: z.string(),
  accentStrategy: z.string(),
  targetAudience: z.array(z.string()).describe("3-4 audience lines"),
  executiveSynthesis: z.string(),
  primaryStyle: z.object({ name: z.string(), rationale: z.string() }),
  secondaryStyle: z.object({ name: z.string(), rationale: z.string() }),
  styleTags: z.array(z.string()).describe("Short searchable tags, e.g. 'Agency/Studio', 'Asymmetric', 'All-Caps System'"),
  mode: z.enum(["dark", "light", "mixed"]),
});

export type Color = z.infer<typeof ColorSchema>;
export type TypeStyle = z.infer<typeof TypeStyleSchema>;
export type BrandIdentity = z.infer<typeof IdentitySchema>;

export type BrandSystem = {
  version: 1;
  url: string;
  domain: string;
  extractedAt: string;
  depth: "deep" | "light";
  logo: { url: string; svg?: string; alt: string } | null;
  favicon: string | null;
  identity: BrandIdentity;
  colors: z.infer<typeof ColorsSchema>;
  typography: z.infer<typeof TypographySchema>;
  surfaces: z.infer<typeof SurfacesSchema>;
  layout: z.infer<typeof LayoutSchema>;
  elevation: z.infer<typeof ElevationSchema>;
  interactions: z.infer<typeof InteractionsSchema>;
  structure: z.infer<typeof StructureSchema>;
  dataDisplay: z.infer<typeof DataDisplaySchema>;
  motion: z.infer<typeof MotionSchema>;
  navigation: z.infer<typeof NavigationSchema>;
  icons: z.infer<typeof IconsSchema> & { svgs: { name: string; svg: string }[] };
  sections: z.infer<typeof PageSectionSchema>[];
  media: z.infer<typeof MediaItemSchema>[];
  tokens: DesignTokens;
  /** Same-domain pages discovered on this page (used for "All pages" extraction). */
  pages?: string[];
};

/** Machine-friendly tokens for agents (CSS variables, Tailwind theme, etc.). */
export type DesignTokens = {
  color: Record<string, string>;
  font: Record<string, string>;
  fontSize: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  spacing: Record<string, string>;
  css: string;
};

export const BRAND_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "identity", label: "Brand Identity" },
  { key: "prompt", label: "Prompt Enhancer" },
  { key: "colors", label: "Colours" },
  { key: "typography", label: "Typography" },
  { key: "surfaces", label: "Surfaces" },
  { key: "layout", label: "Layout" },
  { key: "elevation", label: "Elevation" },
  { key: "interactions", label: "Interactions" },
  { key: "structure", label: "Structure" },
  { key: "dataDisplay", label: "Data Display" },
  { key: "motion", label: "Motion Design" },
  { key: "navigation", label: "Navigation" },
  { key: "icons", label: "Icons" },
  { key: "sections", label: "Page Sections" },
  { key: "media", label: "Media" },
] as const;
