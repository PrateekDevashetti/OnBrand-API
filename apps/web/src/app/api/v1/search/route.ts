import { logged } from "@/lib/logged";
import { z } from "zod";
import { styleSearch, listSearches } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";

export const maxDuration = 120;

const Body = z.object({
  query: z.string().min(2).max(500),
  depth: z.enum(["light", "deep"]).optional(),
  limit: z.number().int().min(1).max(24).optional(),
  filters: z.array(z.string()).max(12).optional(),
});

async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = Body.parse(await req.json());
    const out = await styleSearch(actor, body);
    return json({ object: "search", ...out });
  } catch (e) {
    return handleError(e);
  }
}

async function handleGET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const rows = await listSearches(actor.userId, { q: sp.get("q") ?? undefined, limit: Number(sp.get("limit") ?? 20) });
  return json({ data: rows });
}

export const POST = logged("POST /v1/search", handlePOST);

export const GET = logged("GET /v1/search", handleGET);
