import { logged } from "@/lib/logged";
import { z } from "zod";
import { getExtraction, enhancePrompt, recordUsage } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, apiError, handleError } from "@/lib/http";

export const maxDuration = 120;

async function handlePOST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const { id } = await ctx.params;
    const { prompt } = z.object({ prompt: z.string().min(3).max(8000) }).parse(await req.json());
    const row = await getExtraction(id);
    if (!row || row.userId !== actor.userId || !row.brand) return apiError(404, "not_found", "Brand system not ready");
    const t = Date.now();
    const enhanced = await enhancePrompt(row.brand, prompt);
    await recordUsage(actor, "enhance", 0, id, Date.now() - t);
    return json({ prompt: enhanced });
  } catch (e) {
    return handleError(e);
  }
}

export const POST = logged("POST /v1/extract/[id]/enhance", handlePOST);
