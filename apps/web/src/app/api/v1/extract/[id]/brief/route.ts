import { getExtraction, brandBrief } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { unauthorized, apiError } from "@/lib/http";

/** Agent-ready markdown brief of the brand system. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const row = await getExtraction(id);
  if (!row || row.userId !== actor.userId || row.status !== "completed" || !row.brand) return apiError(404, "not_found", "Brand system not ready");
  return new Response(brandBrief(row.brand), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
