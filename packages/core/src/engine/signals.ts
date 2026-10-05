export type Weighted = { value: string; count: number; weight: number; sample?: string };

export type ColorSignal = {
  hex: string;
  alpha: number;
  weight: number;
  text: number;
  bg: number;
  border: number;
  count: number;
};

export type TextStyleSignal = {
  tag: string;
  family: string;
  size: string;
  weight: string;
  lineHeight: string;
  letterSpacing: string;
  transform: string;
  color: string;
  count: number;
  chars: number;
  sample: string;
  top: number;
};

export type ButtonCss = Record<string, string>;

export type ButtonSignal = {
  index: number;
  text: string;
  tag: string;
  css: ButtonCss;
  hover?: ButtonCss | null;
  parentBg: string;
  top: number;
};

export type SectionSignal = {
  tag: string;
  top: number;
  height: number;
  bg: string;
  headline: string;
  text: string;
  counts: Record<string, number>;
};

export type PageSignals = {
  url: string;
  title: string;
  description: string;
  ogImage: string;
  siteName: string;
  favicon: string;
  lang: string;
  viewport: { w: number; h: number };
  docHeight: number;
  colors: ColorSignal[];
  textStyles: TextStyleSignal[];
  cssVars: { name: string; value: string }[];
  keyframes: { name: string; css: string }[];
  mediaQueries: string[];
  fontFaces: { family: string; weight: string; src: string }[];
  loadedFonts: string[];
  shadows: Weighted[];
  borders: Weighted[];
  radii: Weighted[];
  transitions: Weighted[];
  animations: Weighted[];
  gradients: Weighted[];
  backdrops: Weighted[];
  spacing: Weighted[];
  buttons: ButtonSignal[];
  inputs: { placeholder: string; css: ButtonCss }[];
  nav: { height: string; position: string; background: string; backdrop: string; links: string[] } | null;
  logo: { kind: "svg" | "img"; svg?: string; src?: string; alt: string; w: number; h: number } | null;
  icons: { svg: string; w: number; h: number; label: string; fill: string; stroke: string }[];
  media: { kind: string; src: string; poster?: string; alt: string; w: number; h: number }[];
  sections: SectionSignal[];
  headings: { level: string; text: string }[];
  links: string[];
  text: string;
};

export type Capture = {
  requestedUrl: string;
  finalUrl: string;
  signals: PageSignals;
  html: string;
  css: string;
  /** Full page JPEG */
  screenshot: Buffer | null;
  /** Above-the-fold JPEG at 1440x900 */
  hero: Buffer | null;
  /** Up to 6 viewport screenshots spread down the page */
  slices: Buffer[];
  via: "browser" | "fetch" | "firecrawl";
};
