import { logged } from "@/lib/logged";
import { usageSummary, type Feature } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

async function handleGET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const feature = (sp.get("feature") as Feature | null) ?? undefined;
  const days = Math.min(365, Math.max(1, Number(sp.get("days") ?? 30)));
  return json(await usageSummary(actor.userId, { days, feature, apiKeyId: sp.get("key") || null }));
}

export const GET = logged("GET /v1/usage", handleGET);
