import type { BrandSystem } from "./types";
import type { GroupKey } from "./engine/synthesize";

/**
 * Top-level sections of a brand system, as named in the public API.
 * `identity` is the brand profile; `data_display` maps to the camelCase `dataDisplay` key.
 */
export const SECTION_NAMES = [
  "identity",
  "colors",
  "surfaces",
  "typography",
  "layout",
  "elevation",
  "structure",
  "interactions",
  "navigation",
  "icons",
  "motion",
  "data_display",
  "sections",
  "media",
  "tokens",
] as const;
export type SectionName = (typeof SECTION_NAMES)[number];

const KEY: Record<SectionName, keyof BrandSystem> = {
  identity: "identity",
  colors: "colors",
  surfaces: "surfaces",
  typography: "typography",
  layout: "layout",
  elevation: "elevation",
  structure: "structure",
  interactions: "interactions",
  navigation: "navigation",
  icons: "icons",
  motion: "motion",
  data_display: "dataDisplay",
  sections: "sections",
  media: "media",
  tokens: "tokens",
};

const GROUP: Record<SectionName, GroupKey[]> = {
  identity: ["identity"],
  colors: ["palette"],
  surfaces: ["palette"],
  typography: ["typography"],
  layout: ["spatial"],
  elevation: ["spatial"],
  structure: ["spatial"],
  interactions: ["components"],
  navigation: ["components"],
  icons: ["components"],
  motion: ["components"],
  data_display: ["components"],
  sections: ["sections"],
  media: ["sections"],
  tokens: ["palette", "typography"], // tokens are compiled from colours + type
};

/** Brand-system keys that are always returned (metadata, not sections). */
const META: (keyof BrandSystem)[] = ["version", "url", "domain", "depth", "extractedAt", "pages"];

export class UnknownSectionError extends Error {
  constructor(public names: string[]) {
    super(`Unknown section${names.length > 1 ? "s" : ""}: ${names.join(", ")}. Valid sections: ${SECTION_NAMES.join(", ")}.`);
  }
}

/** Validate + dedupe a requested selection. `null`/`undefined` means "everything". */
export function parseSections(input: unknown): SectionName[] | null {
  if (input == null) return null;
  const list = (Array.isArray(input) ? input : String(input).split(",")).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  if (!list.length) throw new UnknownSectionError(["(empty list)"]);
  const norm = list.map((s) => (s === "profile" ? "identity" : s === "datadisplay" || s === "data-display" ? "data_display" : s));
  const bad = norm.filter((s) => !(SECTION_NAMES as readonly string[]).includes(s));
  if (bad.length) throw new UnknownSectionError(bad);
  return [...new Set(norm)] as SectionName[];
}

/** Synthesis groups needed to produce a selection. */
export function groupsFor(sections: SectionName[] | null): GroupKey[] | null {
  if (!sections) return null;
  return [...new Set(sections.flatMap((s) => GROUP[s]))];
}

/** Return only the selected sections of a brand system (plus metadata). */
export function pickSections<T extends Partial<BrandSystem>>(brand: T | null | undefined, sections: SectionName[] | null): Partial<BrandSystem> | null {
  if (!brand) return null;
  if (!sections) return brand;
  const out: Record<string, unknown> = {};
  for (const k of META) if (k in brand) out[k] = brand[k];
  for (const s of sections) {
    const k = KEY[s];
    if (k in brand) out[k] = brand[k];
  }
  return out as Partial<BrandSystem>;
}

/** Intersection of an extraction's stored selection with a read-time filter. */
export function effectiveSections(stored: string[] | null | undefined, filter: SectionName[] | null): SectionName[] | null {
  const s = (stored ?? null) as SectionName[] | null;
  if (!filter) return s;
  if (!s) return filter;
  return filter.filter((f) => s.includes(f));
}
