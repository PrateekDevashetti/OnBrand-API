import { logged } from "@/lib/logged";
import { getStyle } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, apiError } from "@/lib/http";

async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const s = await getStyle(id);
  if (!s) return apiError(404, "not_found", "Style not found");
  return json({ ...s.style, similar: s.similar });
}

export const GET = logged("GET /v1/styles/[id]", handleGET);
