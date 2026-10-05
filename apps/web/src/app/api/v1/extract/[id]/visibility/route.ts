import { logged } from "@/lib/logged";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema, getExtraction } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, notFound, handleError } from "@/lib/http";
import { serializeExtraction } from "@/lib/serialize";

/** Make an extraction public (readable from /result and /download without a key) or private again. */
async function handlePATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const { id } = await ctx.params;
    const { is_public } = z.object({ is_public: z.boolean() }).parse(await req.json());
    const row = await getExtraction(id);
    if (!row || row.userId !== actor.userId) return notFound("Extraction");
    const [updated] = await db.update(schema.extractions).set({ isPublic: is_public }).where(eq(schema.extractions.id, id)).returning();
    return json(await serializeExtraction(updated, { includeBrand: false }));
  } catch (e) {
    return handleError(e);
  }
}

export const PATCH = logged("PATCH /v1/extract/[id]/visibility", handlePATCH);
