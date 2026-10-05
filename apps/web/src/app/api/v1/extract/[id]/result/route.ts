import { logged } from "@/lib/logged";
import { getExtraction, parseSections } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, notFound, notReady, handleError } from "@/lib/http";
import { serializeExtraction } from "@/lib/serialize";

/**
 * The brand system for an extraction. Streams: while running it returns whatever sections have
 * landed (200), or 409 not_ready before the first one. Public extractions are readable without a key.
 * ?sections=colors,typography narrows the payload.
 */
async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await getExtraction(id);
    const actor = await getActor(req, "api");
    if (!row || (!row.isPublic && row.userId !== actor?.userId)) return notFound("Extraction");
    const filter = parseSections(new URL(req.url).searchParams.get("sections"));
    const landed = row.brand ? Object.keys(row.brand).some((k) => !["version", "url", "domain", "depth", "extractedAt", "logo", "favicon"].includes(k)) : false;
    if (row.status !== "completed" && row.status !== "failed" && !landed) return notReady(`Extraction is ${row.status}. Poll again shortly.`);
    return json(await serializeExtraction(row, { sections: filter }));
  } catch (e) {
    return handleError(e);
  }
}

export const GET = logged("GET /v1/extract/[id]/result", handleGET);
