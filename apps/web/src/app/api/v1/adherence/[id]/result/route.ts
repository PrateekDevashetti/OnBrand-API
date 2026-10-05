import { logged } from "@/lib/logged";
import { getAdherence } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, notFound, notReady, apiError } from "@/lib/http";
import { serializeVerdict } from "@/lib/serialize";

/**
 * The verdict: `score` (0-1), worst-first `recommendations` and structured `fixes`.
 * 409 not_ready while both sides are still extracting; 424 if the run failed (stop polling).
 * Public runs are readable without a key.
 */
async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await getAdherence(id);
  const actor = await getActor(req, "api");
  if (!row || (!row.isPublic && row.userId !== actor?.userId)) return notFound("Adherence run");
  if (row.status === "failed") return apiError(424, "adherence_failed", row.error ?? "This adherence run failed and won't produce a verdict. Credits were refunded.");
  if (!row.report) return notReady(`Adherence run is ${row.status === "running" ? "extracting both pages" : row.status}. Poll again shortly.`);
  return json(await serializeVerdict(row));
}

export const GET = logged("GET /v1/adherence/[id]/result", handleGET);
