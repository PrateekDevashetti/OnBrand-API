import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { jobs } from "./db/schema";
import { env } from "./env";
import { newId } from "./ids";

/**
 * Job dispatch.
 * - inline: run in this process with a small concurrency limit (local dev, single-box deploys).
 * - worker: persist to the jobs table; apps/worker claims with SKIP LOCKED.
 */
const MAX_INLINE = Number(process.env.ONBRAND_INLINE_CONCURRENCY ?? 3);
const g = globalThis as unknown as { __onbrandRunning?: number; __onbrandWaiting?: (() => void)[] };
g.__onbrandRunning ??= 0;
g.__onbrandWaiting ??= [];

async function withSlot(fn: () => Promise<void>) {
  if (g.__onbrandRunning! >= MAX_INLINE) await new Promise<void>((r) => g.__onbrandWaiting!.push(r));
  g.__onbrandRunning!++;
  try {
    await fn();
  } finally {
    g.__onbrandRunning!--;
    g.__onbrandWaiting!.shift()?.();
  }
}

export async function dispatch(kind: "extract" | "adherence", refId: string, run: () => Promise<void>) {
  if (env.engineMode === "worker") {
    await db.insert(jobs).values({ id: newId("job"), kind, refId });
    return;
  }
  void withSlot(run).catch((e) => console.error(`[onbrand] inline job ${kind}/${refId} crashed`, e));
}

/** Claim the next queued job (worker mode). */
export async function claimJob() {
  const rows = await db.execute<{ id: string; kind: string; ref_id: string }>(sql`
    update jobs set status = 'running', locked_at = now(), attempts = attempts + 1
    where id = (
      select id from jobs
      where status = 'queued' or (status = 'running' and locked_at < now() - interval '15 minutes' and attempts < 3)
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, kind, ref_id`);
  const r = (rows as unknown as { id: string; kind: string; ref_id: string }[])[0];
  return r ? { id: r.id, kind: r.kind as "extract" | "adherence", refId: r.ref_id } : null;
}

export async function finishJob(id: string, ok: boolean) {
  await db.update(jobs).set({ status: ok ? "done" : "failed" }).where(and(eq(jobs.id, id)));
}
