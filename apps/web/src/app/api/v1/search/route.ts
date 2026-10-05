import { logged } from "@/lib/logged";
import { z } from "zod";
import { styleSearch, searchHistory, parseFilters } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";
import { serializeCard } from "@/lib/serialize";

export const maxDuration = 300;

const Body = z.object({
  query: z.string().min(2).max(400),
  /** fast (default, seconds) or deep (LLM re-rank with reasoning). "light" is accepted as an alias of fast. */
  depth: z.enum(["fast", "light", "deep"]).optional(),
  top_k: z.number().int().min(1).max(30).optional(),
  limit: z.number().int().min(1).max(30).optional(),
  /** Hard constraints from the closed vocabulary (page_type, industry, hue, layout), or playground facet chips. */
  filters: z.union([z.record(z.string(), z.string().nullable()), z.array(z.string()).max(12)]).optional(),
});

async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = Body.parse(await req.json());
    const structured = body.filters && !Array.isArray(body.filters) ? parseFilters(body.filters) : undefined;
    const out = await styleSearch(actor, {
      query: body.query,
      depth: body.depth === "deep" ? "deep" : "light",
      limit: body.top_k ?? body.limit,
      filters: Array.isArray(body.filters) ? body.filters : [],
      where: structured,
    });
    return json({
      object: "search",
      id: out.id,
      query: out.query,
      depth: out.depth === "deep" ? "deep" : "fast",
      filters: out.filters,
      query_tags: out.tags,
      results: out.results.map(serializeCard),
      latency_ms: out.latencyMs,
      // Playground compatibility: the dashboard renders the internal shape.
      tags: out.tags,
      raw: new URL(req.url).searchParams.get("raw") === "true" ? out.results : undefined,
    });
  } catch (e) {
    return handleError(e);
  }
}

/** Search history: past searches and similarity lookups, newest first. Free. */
async function handleGET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const limit = Math.max(1, Math.min(Number(sp.get("limit") ?? 20) || 20, 100));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const { rows, total, totalByStatus } = await searchHistory(actor.userId, { kind: sp.get("kind") ?? undefined, depth: sp.get("depth") ?? undefined, q: sp.get("q") ?? undefined, apiKeyId: sp.get("api_key_id") ?? undefined, limit, offset });
  return json({
    data: rows.map((r) => ({ id: r.id, kind: r.kind, query: r.query, depth: r.kind === "similar" ? null : r.depth === "deep" ? "deep" : "fast", filters: r.filters, query_tags: r.tags, status: r.status, result_count: r.results.length, credits: r.credits, latency_ms: r.latencyMs, created_at: r.createdAt })),
    total,
    total_by_status: totalByStatus,
    limit,
    offset,
  });
}

export const POST = logged("POST /v1/search", handlePOST);
export const GET = logged("GET /v1/search", handleGET);
