import { logged } from "@/lib/logged";
import { z } from "zod";
import { recordFeedback } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";

const Body = z.object({ kind: z.enum(["extraction", "search", "adherence"]), ref_id: z.string(), section: z.string().optional(), rating: z.union([z.literal(1), z.literal(-1)]), comment: z.string().max(2000).optional() });

async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const b = Body.parse(await req.json());
    await recordFeedback({ userId: actor.userId, kind: b.kind, refId: b.ref_id, section: b.section, rating: b.rating, comment: b.comment });
    return json({ ok: true }, 201);
  } catch (e) {
    return handleError(e);
  }
}

export const POST = logged("POST /v1/feedback", handlePOST);
