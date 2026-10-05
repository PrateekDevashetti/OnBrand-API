/**
 * Abuse controls: per-subject request rate limits (Postgres fixed-window counters, safe across
 * serverless instances) and a cap on concurrently queued/running jobs per user.
 */
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "./db/client";
import { adherenceRuns, extractions, rateCounters } from "./db/schema";

export class RateLimitError extends Error {
  constructor(
    public limit: number,
    public retryAfter: number,
    message = `Rate limit exceeded: ${limit} requests per minute. Retry in ${retryAfter}s.`,
  ) {
    super(message);
  }
}

export class TooManyJobsError extends Error {
  constructor(public limit: number) {
    super(`You already have ${limit} jobs queued or running. Wait for one to finish, then retry.`);
  }
}

const num = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
export const LIMITS = {
  get rpm() {
    return num("ONBRAND_RATE_LIMIT_RPM", 120);
  },
  get jobsRpm() {
    return num("ONBRAND_RATE_LIMIT_JOBS_RPM", 30);
  },
  get inflight() {
    return num("ONBRAND_MAX_INFLIGHT_JOBS", 6);
  },
};

/** Count one hit for `subject` in `bucket`; throws RateLimitError when over `limit` this minute. */
export async function hitRateLimit(subject: string, bucket: string, limit: number) {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 60_000) * 60_000);
  const [row] = await db
    .insert(rateCounters)
    .values({ subject, bucket, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateCounters.subject, rateCounters.bucket, rateCounters.windowStart], set: { count: sql`${rateCounters.count} + 1` } })
    .returning({ count: rateCounters.count });
  // Opportunistic cleanup of old windows (~1% of calls).
  if (Math.random() < 0.01) void db.delete(rateCounters).where(lt(rateCounters.windowStart, new Date(now - 3_600_000))).catch(() => {});
  const count = row?.count ?? 1;
  const remaining = Math.max(0, limit - count);
  if (count > limit) throw new RateLimitError(limit, Math.max(1, Math.ceil((windowStart.getTime() + 60_000 - now) / 1000)));
  return { limit, remaining };
}

/** Throws TooManyJobsError when the user already has too many queued/running jobs. */
export async function assertJobCapacity(userId: string) {
  const active = ["queued", "running"];
  const [e] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(extractions)
    .where(and(eq(extractions.userId, userId), inArray(extractions.status, active)));
  const [a] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(adherenceRuns)
    .where(and(eq(adherenceRuns.userId, userId), inArray(adherenceRuns.status, active)));
  if ((e?.n ?? 0) + (a?.n ?? 0) >= LIMITS.inflight) throw new TooManyJobsError(LIMITS.inflight);
}
