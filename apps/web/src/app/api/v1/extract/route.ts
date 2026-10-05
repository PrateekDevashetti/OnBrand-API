import { logged } from "@/lib/logged";
import { z } from "zod";
import { createExtraction, getExtraction, listExtractions } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";
import { serializeExtraction } from "@/lib/serialize";

export const maxDuration = 300;

const Body = z.object({
  url: z.string().min(3),
  depth: z.enum(["deep", "light"]).optional(),
  cache: z.boolean().optional(),
  force: z.boolean().optional(),
  pages: z.enum(["single", "all"]).optional(),
  max_pages: z.number().int().min(1).max(20).optional(),
});

async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = Body.parse(await req.json());
    const row = await createExtraction(actor, {
      url: body.url,
      depth: body.depth,
      cache: body.force ? false : (body.cache ?? true),
      pages: body.pages,
      maxPages: body.max_pages,
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
  const { rows, total } = await listExtractions(actor.userId, { q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, limit: Number(sp.get("limit") ?? 20), offset: Number(sp.get("offset") ?? 0) });
  return json({ data: rows, total });
}

export const POST = logged("POST /v1/extract", handlePOST);

export const GET = logged("GET /v1/extract", handleGET);
