import { db } from "./db/client";
import { apiRequests, feedback } from "./db/schema";
import { newId } from "./ids";

export async function logRequest(r: { method: string; route: string; status: number; latencyMs: number; keyPrefix?: string | null; via: string; error?: string | null; userAgent?: string | null }) {
  await db
    .insert(apiRequests)
    .values({ id: newId("req"), ...r, userAgent: r.userAgent?.slice(0, 200) ?? null, error: r.error?.slice(0, 500) ?? null })
    .catch((e) => console.error("[onbrand] request log failed", (e as Error).message));
}

export async function recordFeedback(f: { userId: string; kind: string; refId: string; section?: string | null; rating: 1 | -1; comment?: string | null }) {
  await db.insert(feedback).values({ id: newId("fb"), ...f, comment: f.comment?.slice(0, 2000) ?? null });
}
