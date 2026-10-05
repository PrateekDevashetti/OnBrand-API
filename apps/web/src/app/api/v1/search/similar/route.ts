import { logged } from "@/lib/logged";
import { similarStyles } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, notFound, apiError, handleError } from "@/lib/http";
import { serializeCard } from "@/lib/serialize";

/** Nearest visual neighbours in the index for one of your completed (full) extractions. 1 credit. */
async function handleGET(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const sp = new URL(req.url).searchParams;
    const extractionId = sp.get("extraction_id");
    if (!extractionId) return apiError(400, "invalid_request", "Pass `extraction_id` (a completed extraction of yours).");
    const out = await similarStyles(actor, extractionId, Number(sp.get("top_k") ?? 12) || 12);
    if (!out) return notFound("Completed extraction");
    return json({ object: "similar", id: out.id, source: out.source, results: out.results.map(serializeCard), latency_ms: out.latencyMs });
  } catch (e) {
    return handleError(e);
  }
}

export const GET = logged("GET /v1/search/similar", handleGET);
