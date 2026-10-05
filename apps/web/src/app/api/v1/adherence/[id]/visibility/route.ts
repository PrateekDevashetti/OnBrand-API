import { logged } from "@/lib/logged";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema, getAdherence } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, notFound, handleError } from "@/lib/http";
import { serializeAdherence } from "@/lib/serialize";

/** Make an adherence verdict public (readable from /result without a key) or private again. */
async function handlePATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const { id } = await ctx.params;
    const { is_public } = z.object({ is_public: z.boolean() }).parse(await req.json());
    const row = await getAdherence(id);
    if (!row || row.userId !== actor.userId) return notFound("Adherence run");
    const [updated] = await db.update(schema.adherenceRuns).set({ isPublic: is_public }).where(eq(schema.adherenceRuns.id, id)).returning();
    return json(serializeAdherence({ ...updated, report: null }));
  } catch (e) {
    return handleError(e);
  }
}

export const PATCH = logged("PATCH /v1/adherence/[id]/visibility", handlePATCH);
