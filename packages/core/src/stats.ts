import { and, desc, eq, gte, isNull, sql, ilike, or } from "drizzle-orm";
import { db } from "./db/client";
import { usageEvents, extractions, searches, adherenceRuns, users } from "./db/schema";

export type Feature = "extraction" | "search" | "adherence";

function since(days: number) {
  return new Date(Date.now() - days * 86400_000);
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Daily buckets for the last `days` days (oldest first). */
export function emptySeries(days: number) {
  const out: { day: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    out.push({ day: dayKey(d), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
  }
  return out;
}

export async function usageSummary(userId: string, opts: { days?: number; feature?: Feature; apiKeyId?: string | null } = {}) {
  const days = opts.days ?? 30;
  const conds = [eq(usageEvents.userId, userId), gte(usageEvents.createdAt, since(days))];
  if (opts.apiKeyId) conds.push(eq(usageEvents.apiKeyId, opts.apiKeyId));
  const events = await db.query.usageEvents.findMany({ where: and(...conds), orderBy: [desc(usageEvents.createdAt)] });
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const series = emptySeries(days).map((s) => ({ ...s, extraction: 0, search: 0, adherence: 0, credits: 0, requests: 0, creditsByKey: 0 }));
  const idx = new Map(series.map((s, i) => [s.day, i]));
  for (const e of events) {
    const i = idx.get(dayKey(e.createdAt));
    if (i === undefined) continue;
    const s = series[i];
    const f = (e.feature === "enhance" ? null : e.feature) as Feature | null;
    if (f) s[f] += 1;
    s.credits += e.credits;
    if (!opts.feature || e.feature === opts.feature) {
      s.requests += 1;
      s.creditsByKey += e.credits;
    }
  }
  const featureEvents = opts.feature ? events.filter((e) => e.feature === opts.feature) : events;
  const latencies = featureEvents.map((e) => e.latencyMs ?? 0).filter((n) => n > 0);
  const creditsSpent = events.reduce((a, e) => a + e.credits, 0);
  return {
    days,
    balance: user?.credits ?? 0,
    plan: user?.plan ?? "free",
    totals: {
      requests: featureEvents.length,
      allRequests: events.length,
      creditsSpent,
      featureCredits: featureEvents.reduce((a, e) => a + e.credits, 0),
      highestCreditSpent: Math.max(0, ...series.map((s) => s.creditsByKey)),
      avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
      byFeature: {
        extraction: events.filter((e) => e.feature === "extraction").length,
        search: events.filter((e) => e.feature === "search").length,
        adherence: events.filter((e) => e.feature === "adherence").length,
      },
      peakDayRequests: Math.max(0, ...series.map((s) => s.requests)),
    },
    series,
  };
}

export async function listExtractions(userId: string, opts: { q?: string; status?: string; apiKeyId?: string; from?: string; limit?: number; offset?: number } = {}) {
  const conds = [eq(extractions.userId, userId), isNull(extractions.parentId)];
  if (opts.status) conds.push(eq(extractions.status, opts.status));
  if (opts.apiKeyId) conds.push(eq(extractions.apiKeyId, opts.apiKeyId));
  if (opts.from) conds.push(eq(extractions.requestFrom, opts.from));
  if (opts.q) conds.push(or(ilike(extractions.url, `%${opts.q}%`), ilike(extractions.company, `%${opts.q}%`))!);
  const where = and(...conds);
  const rows = await db
    .select({
      id: extractions.id,
      url: extractions.url,
      domain: extractions.domain,
      normalizedUrl: extractions.normalizedUrl,
      company: extractions.company,
      status: extractions.status,
      source: extractions.source,
      depth: extractions.depth,
      pagesMode: extractions.pagesMode,
      requestFrom: extractions.requestFrom,
      apiKeyId: extractions.apiKeyId,
      palette: extractions.palette,
      credits: extractions.credits,
      createdAt: extractions.createdAt,
      children: sql<number>`(select count(*)::int from extractions c where c.parent_id = ${extractions.id})`,
    })
    .from(extractions)
    .where(where)
    .orderBy(desc(extractions.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(extractions).where(where);
  return { rows, total: count };
}

export async function listChildExtractions(parentId: string) {
  return db.query.extractions.findMany({
    where: eq(extractions.parentId, parentId),
    orderBy: [desc(extractions.createdAt)],
    columns: { id: true, url: true, normalizedUrl: true, status: true, palette: true, company: true, createdAt: true, credits: true },
  });
}

export async function listSearches(userId: string, opts: { q?: string; depth?: string; limit?: number } = {}) {
  const conds = [eq(searches.userId, userId)];
  if (opts.q) conds.push(ilike(searches.query, `%${opts.q}%`));
  if (opts.depth) conds.push(eq(searches.depth, opts.depth));
  return db.query.searches.findMany({ where: and(...conds), orderBy: [desc(searches.createdAt)], limit: opts.limit ?? 50 });
}

export async function listAdherence(userId: string, opts: { q?: string; status?: string; limit?: number } = {}) {
  const conds = [eq(adherenceRuns.userId, userId)];
  if (opts.status) conds.push(eq(adherenceRuns.status, opts.status));
  if (opts.q) conds.push(or(ilike(adherenceRuns.designUrl, `%${opts.q}%`), ilike(adherenceRuns.referenceUrl, `%${opts.q}%`))!);
  return db.query.adherenceRuns.findMany({
    where: and(...conds),
    orderBy: [desc(adherenceRuns.createdAt)],
    limit: opts.limit ?? 50,
    columns: { report: false },
  });
}

/** Counts by outcome for the extraction list (ignores pagination). */
export async function extractionTotals(userId: string, opts: { q?: string; status?: string; apiKeyId?: string } = {}) {
  const conds = [eq(extractions.userId, userId), isNull(extractions.parentId)];
  if (opts.status) conds.push(eq(extractions.status, opts.status));
  if (opts.apiKeyId) conds.push(eq(extractions.apiKeyId, opts.apiKeyId));
  if (opts.q) conds.push(or(ilike(extractions.url, `%${opts.q}%`), ilike(extractions.company, `%${opts.q}%`))!);
  const rows = await db.select({ status: extractions.status, n: sql<number>`count(*)::int` }).from(extractions).where(and(...conds)).groupBy(extractions.status);
  const get = (s: string) => rows.find((r) => r.status === s)?.n ?? 0;
  return { completed: get("completed"), failed: get("failed"), in_progress: get("queued") + get("running") };
}

/** Adherence runs with total count for pagination. */
export async function listAdherencePage(userId: string, opts: { q?: string; status?: string; limit?: number; offset?: number } = {}) {
  const conds = [eq(adherenceRuns.userId, userId)];
  if (opts.status) conds.push(eq(adherenceRuns.status, opts.status === "in_progress" ? "running" : opts.status));
  if (opts.q) conds.push(or(ilike(adherenceRuns.designUrl, `%${opts.q}%`), ilike(adherenceRuns.referenceUrl, `%${opts.q}%`))!);
  const where = and(...conds);
  const rows = await db.query.adherenceRuns.findMany({ where, orderBy: [desc(adherenceRuns.createdAt)], limit: Math.max(1, Math.min(opts.limit ?? 20, 100)), offset: opts.offset ?? 0, columns: { report: false } });
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adherenceRuns).where(where);
  return { rows, total };
}
