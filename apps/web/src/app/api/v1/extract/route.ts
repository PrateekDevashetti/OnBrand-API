import { logged } from "@/lib/logged";
import { z } from "zod";
import { createExtraction, getExtraction, listExtractions, extractionTotals, parseSections, MAX_SITE_PAGES } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError, apiError } from "@/lib/http";
import { serializeExtraction } from "@/lib/serialize";

export const maxDuration = 300;

const Body = z.object({
  url: z.string().min(3),
  depth: z.enum(["deep", "light"]).optional(),
  cache: z.boolean().optional(),
  force: z.boolean().optional(),
  pages: z.enum(["single", "all"]).optional(),
  /** Map mode: discover same-domain pages and extract each (alias of pages: "all"). */
  map: z.boolean().optional(),
  max_pages: z.number().int().min(1).max(MAX_SITE_PAGES).optional(),
  /** Selective extraction. Omit or null for a full extraction. */
  sections: z.array(z.string()).nullable().optional(),
});

async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = Body.parse(await req.json());
    const sections = parseSections(body.sections);
    const pages = body.map ? "all" : body.pages;
    if (sections && pages === "all") return apiError(422, "selective_map_unsupported", "`sections` can't be combined with map mode. Extract a single URL, or omit `sections`.");
    if (sections && body.depth === "deep") return apiError(422, "selective_deep_unsupported", "`sections` can't be combined with depth: \"deep\". Use light depth, or omit `sections`.");
    const row = await createExtraction(actor, {
      url: body.url,
      depth: sections ? "light" : body.depth,
      cache: body.force ? false : (body.cache ?? true),
      pages,
      maxPages: body.max_pages,
      sections,
    });
    const wait = new URL(req.url).searchParams.get("wait") === "true";
    if (wait && row.status !== "completed") {
      const deadline = Date.now() + 280_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const cur = await getExtraction(row.id);
        if (cur && (cur.status === "completed" || cur.status === "failed")) return json(await serializeExtraction(cur), 200);
      }
    }
    return json(await serializeExtraction(row), row.status === "completed" ? 200 : 202);
  } catch (e) {
    return handleError(e);
  }
}

async function handleGET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const filters = { q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, apiKeyId: sp.get("api_key_id") ?? undefined };
  const limit = Math.max(1, Math.min(Number(sp.get("limit") ?? 20) || 20, 100));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const [{ rows, total }, totals] = await Promise.all([listExtractions(actor.userId, { ...filters, limit, offset }), extractionTotals(actor.userId, filters)]);
  return json({ data: rows, total, totals, limit, offset });
}

export const POST = logged("POST /v1/extract", handlePOST);

export const GET = logged("GET /v1/extract", handleGET);
