/** Hand-verified expectations. Keep small and certain; grow it from feedback on bad extractions. */
export type Golden = { url: string; colors: string[]; fonts: string[]; mode: "dark" | "light"; minSections: number };

export const GOLDEN: Golden[] = [
  { url: "https://tastelabs.com", colors: ["#1E1E1E", "#F5F7F2", "#111111"], fonts: ["Matter", "Azeret"], mode: "dark", minSections: 3 },
  { url: "https://linear.app", colors: ["#08090A", "#F7F8F8"], fonts: ["Inter"], mode: "dark", minSections: 4 },
  { url: "https://stripe.com", colors: ["#635BFF|#533AFD", "#0A2540"], fonts: ["sohne"], mode: "light", minSections: 4 },
  { url: "https://vercel.com", colors: ["#000000", "#FFFFFF"], fonts: ["Geist"], mode: "light", minSections: 3 },
  // Added 2026-10-05; fonts/mode verified with qa/truth.mts (loaded document.fonts + computed backgrounds).
  { url: "https://raycast.com", colors: ["#FF6363", "#07080A|#0A0A0A"], fonts: ["Inter"], mode: "dark", minSections: 4 },
  { url: "https://www.airbnb.com", colors: ["#FF385C"], fonts: ["Airbnb Cereal"], mode: "light", minSections: 2 },
  { url: "https://resend.com", colors: ["#000000", "#FFFFFF|#F0F0F0|#EDEDED"], fonts: ["inter", "domaine|favorit"], mode: "dark", minSections: 4 },
  { url: "https://www.notion.com", colors: ["#FFFFFF", "#000000|#191919|#1E1E1E"], fonts: ["NotionInter|Notion"], mode: "light", minSections: 4 },
  { url: "https://www.duolingo.com", colors: ["#58CC02|#58A700"], fonts: ["feather|duolingo"], mode: "light", minSections: 3 },
  { url: "https://github.com", colors: ["#0D1117"], fonts: ["Mona Sans"], mode: "dark", minSections: 4 },
  { url: "https://supabase.com", colors: ["#3ECF8E|#3FCF8E|#34B27B|#00C573"], fonts: ["Manrope|Inter"], mode: "light", minSections: 4 },
  { url: "https://www.figma.com", colors: ["#000000|#1E1E1E", "#FFFFFF"], fonts: ["figmaSans"], mode: "light", minSections: 4 },
];

/** Adherence sanity pairs: same brand should score high, unrelated brands low. */
export const ADHERENCE_PAIRS = [
  { reference: "https://tastelabs.com", design: "https://tastelabs.com/careers", expect: "high" as const },
  { reference: "https://tastelabs.com", design: "https://gumroad.com", expect: "low" as const },
];
