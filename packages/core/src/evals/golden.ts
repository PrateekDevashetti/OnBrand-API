/** Hand-verified expectations. Keep small and certain; grow it from feedback on bad extractions. */
export type Golden = { url: string; colors: string[]; fonts: string[]; mode: "dark" | "light"; minSections: number };

export const GOLDEN: Golden[] = [
  { url: "https://tastelabs.com", colors: ["#1E1E1E", "#F5F7F2", "#111111"], fonts: ["Matter", "Azeret"], mode: "dark", minSections: 3 },
  { url: "https://linear.app", colors: ["#08090A", "#F7F8F8"], fonts: ["Inter"], mode: "dark", minSections: 4 },
  { url: "https://stripe.com", colors: ["#635BFF", "#0A2540"], fonts: ["sohne"], mode: "light", minSections: 4 },
  { url: "https://vercel.com", colors: ["#000000", "#FFFFFF"], fonts: ["Geist"], mode: "light", minSections: 3 },
];

/** Adherence sanity pairs: same brand should score high, unrelated brands low. */
export const ADHERENCE_PAIRS = [
  { reference: "https://tastelabs.com", design: "https://tastelabs.com/careers", expect: "high" as const },
  { reference: "https://tastelabs.com", design: "https://gumroad.com", expect: "low" as const },
];
