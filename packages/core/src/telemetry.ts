import { db } from "./db/client";
import { apiRequests, feedback } from "./db/schema";
import { newId } from "./ids";
import { lt } from "drizzle-orm";

/** Request logs older than this are pruned (usage views look back at most 90 days). */
export const REQUEST_LOG_RETENTION_DAYS = 180;

export async function pruneRequestLogs(days = REQUEST_LOG_RETENTION_DAYS): Promise<number> {
  const gone = await db.delete(apiRequests).where(lt(apiRequests.createdAt, new Date(Date.now() - days * 86_400_000))).returning({ id: apiRequests.id });
  return gone.length;
}

export async function logRequest(r: { method: string; route: string; status: number; latencyMs: number; keyPrefix?: string | null; via: string; error?: string | null; userAgent?: string | null }) {
  await db
    .insert(apiRequests)
    .values({ id: newId("req"), ...r, userAgent: r.userAgent?.slice(0, 200) ?? null, error: r.error?.slice(0, 500) ?? null })
    .catch((e) => console.error("[onbrand] request log failed", (e as Error).message));
}

export async function recordFeedback(f: { userId: string; kind: string; refId: string; section?: string | null; rating: 1 | -1; comment?: string | null }) {
  await db.insert(feedback).values({ id: newId("fb"), ...f, comment: f.comment?.slice(0, 2000) ?? null });
}
