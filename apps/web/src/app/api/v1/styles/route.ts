import { logged } from "@/lib/logged";
import { featuredStyles } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

async function handleGET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 12);
  return json({ data: await featuredStyles(Math.min(limit, 100)) });
}

export const GET = logged("GET /v1/styles", handleGET);
