import type { BrandSystem } from "./types";
import { complete, llmAvailable } from "./llm";

/** Compile a brand system into a compact, agent-ready brief (deterministic, no LLM). */
export function brandBrief(b: BrandSystem): string {
  const colors = [...(b.colors?.baseline ?? []), ...(b.colors?.secondary ?? []), ...(b.colors?.others ?? [])];
  const lines: string[] = [];
  lines.push(`# ${b.identity?.companyName ?? b.domain} — brand brief (OnBrand by Canopy Labs)`);
  if (b.identity?.summary) lines.push(b.identity.summary);
  if (b.identity?.keywords?.length) lines.push(`Keywords: ${b.identity.keywords.join(", ")}. Voice: ${b.identity.copyTone?.join(", ")}.`);
  lines.push("", "## Colour");
  for (const c of colors.slice(0, 10)) lines.push(`- ${c.name} ${c.hex} (${c.tone}) — ${c.usage.join(", ")}`);
  if (b.identity?.accentStrategy) lines.push(`Accent strategy: ${b.identity.accentStrategy}`);
  lines.push("", "## Typography");
  for (const f of b.typography?.families ?? []) lines.push(`- ${f.family} (${f.classification}) — ${f.usage}`);
  for (const t of [...(b.typography?.titles ?? []).slice(0, 3), ...(b.typography?.body ?? []).slice(0, 2), ...(b.typography?.labels ?? []).slice(0, 2)])
    lines.push(`- ${t.role}: ${t.stack} · ${t.size} / ${t.weight} / lh ${t.lineHeight}${t.letterSpacing && t.letterSpacing !== "normal" ? ` / ls ${t.letterSpacing}` : ""}${t.textTransform && t.textTransform !== "none" ? ` / ${t.textTransform}` : ""}`);
  lines.push("", "## Layout & surfaces");
  if (b.layout?.classification?.length) lines.push(`- Layout: ${b.layout.classification.join(", ")}; grid ${b.layout.grid?.columns} cols, gutter ${b.layout.grid?.gutter}, max-width ${b.layout.grid?.maxWidth}`);
  if (b.layout?.sectionSeparation) lines.push(`- Sections: ${b.layout.sectionSeparation}`);
  if (b.surfaces?.textures?.length) lines.push(`- Textures: ${b.surfaces.textures.join(", ")}`);
  if (b.elevation?.summary) lines.push(`- Elevation: ${b.elevation.summary}`);
  lines.push("", "## Components");
  for (const btn of (b.interactions?.buttons ?? []).slice(0, 4)) lines.push(`- Button “${btn.label}” (${btn.radius}, on ${btn.surface}): ${btn.defaultCss}; hover: ${btn.hoverCss}`);
  if (b.motion?.patterns?.length) lines.push(`- Motion: ${b.motion.patterns.join(", ")}`);
  if (b.tokens?.css) lines.push("", "## CSS tokens", "```css", b.tokens.css, "```");
  return lines.join("\n");
}

export async function enhancePrompt(b: BrandSystem, prompt: string): Promise<string> {
  const brief = brandBrief(b);
  if (!llmAvailable()) return `${prompt.trim()}\n\nFollow this brand system exactly:\n\n${brief}`;
  return complete(
    "You are OnBrand's Prompt Enhancer. Rewrite a user's design prompt into a 'golden prompt' a senior designer or an AI design agent can execute to produce an on-brand result. Keep the user's intent and scope; weave in the brand's exact colours (hex), type stacks and sizes, layout rhythm, surfaces, components, motion and voice. Be concrete and structured (short sections, bullet points). Do not invent brand values that are not in the brief. Output only the enhanced prompt.",
    `User prompt:\n${prompt}\n\nBrand brief:\n${brief}`,
    "low",
  );
}
