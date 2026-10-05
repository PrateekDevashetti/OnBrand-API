import { logged } from "@/lib/logged";
import { z } from "zod";
import { getExtraction, enhancePrompt, recordUsage, env } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, notFound, apiError, handleError } from "@/lib/http";

export const maxDuration = 120;

/** Rewrite a prompt so it is grounded in an extracted brand. Synchronous. Free. */
async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = z.object({ extraction_id: z.string().min(3), prompt: z.string().min(3).max(8000) }).parse(await req.json());
    const row = await getExtraction(body.extraction_id);
    if (!row || row.userId !== actor.userId) return notFound("Extraction");
    if (row.status !== "completed" || !row.brand) return apiError(409, "not_ready", "That extraction hasn't completed yet.");
    if (row.sections) return apiError(422, "full_extraction_required", "Prompt enhancement needs a full extraction. Extract the URL again without `sections`.");
    const t = Date.now();
    const enhanced = await enhancePrompt(row.brand, body.prompt);
    await recordUsage(actor, "enhance", 0, row.id, Date.now() - t);
    return json({ object: "enhanced_prompt", enhanced_prompt: enhanced, prompt: enhanced, brand_name: row.brand.identity?.companyName ?? row.company, source_url: row.url, extraction_id: row.id, model: env.model });
  } catch (e) {
    return handleError(e);
  }
}

export const POST = logged("POST /v1/enhance", handlePOST);
