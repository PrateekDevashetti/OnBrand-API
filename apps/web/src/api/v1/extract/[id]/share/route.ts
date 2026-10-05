import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, getExtraction, schema } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, apiError } from "@/lib/http";
import { config } from "@/lib/config";

/** Create (or return) a public, read-only share link for an extraction. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const row = await getExtraction(id);
  if (!row || row.userId !== actor.userId) return apiError(404, "not_found", "Extraction not found");
  let token = row.shareToken;
  if (!token) {
    token = crypto.randomBytes(12).toString("base64url");
    await db.update(schema.extractions).set({ shareToken: token }).where(eq(schema.extractions.id, id));
  }
  return json({ url: `${config.appUrl}/share/b/${token}` });
}
