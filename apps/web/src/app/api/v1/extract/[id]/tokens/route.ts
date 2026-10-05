import { logged } from "@/lib/logged";
import { getExtraction } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, apiError } from "@/lib/http";

/** Design tokens as CSS variables, JSON, or a Tailwind v4 @theme block. */
async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const row = await getExtraction(id);
  if (!row || row.userId !== actor.userId || !row.brand?.tokens) return apiError(404, "not_found", "Tokens not available yet");
  const t = row.brand.tokens;
  const format = new URL(req.url).searchParams.get("format") ?? "json";
  if (format === "css") return new Response(t.css, { headers: { "Content-Type": "text/css; charset=utf-8" } });
  if (format === "tailwind") {
    const lines = ["@theme {"];
    for (const [k, v] of Object.entries(t.color)) lines.push(`  --color-${k}: ${v};`);
    for (const [k, v] of Object.entries(t.font)) lines.push(`  --font-${k}: ${v};`);
    for (const [k, v] of Object.entries(t.radius)) lines.push(`  --radius-${k}: ${v};`);
    for (const [k, v] of Object.entries(t.shadow)) lines.push(`  --shadow-${k}: ${v};`);
    lines.push("}");
    return new Response(lines.join("\n"), { headers: { "Content-Type": "text/css; charset=utf-8" } });
  }
  return json(t);
}

export const GET = logged("GET /v1/extract/[id]/tokens", handleGET);
