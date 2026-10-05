import { getAdherence } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, apiError } from "@/lib/http";
import { serializeAdherence } from "@/lib/serialize";
import { loadAdherence } from "@/lib/adherence";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  if (new URL(req.url).searchParams.get("include") === "sides") {
    const full = await loadAdherence(id, actor.userId);
    return full ? json(full) : apiError(404, "not_found", "Adherence run not found");
  }
  const row = await getAdherence(id);
  if (!row || row.userId !== actor.userId) return apiError(404, "not_found", "Adherence run not found");
  return json(serializeAdherence(row));
}
