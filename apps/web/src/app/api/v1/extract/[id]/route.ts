import { logged } from "@/lib/logged";
import { getExtraction } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, apiError } from "@/lib/http";
import { serializeExtraction } from "@/lib/serialize";

async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const row = await getExtraction(id);
  if (!row || row.userId !== actor.userId) return apiError(404, "not_found", "Extraction not found");
  const fields = new URL(req.url).searchParams.get("fields");
  return json(await serializeExtraction(row, { includeBrand: fields !== "status", children: row.pagesMode === "all" }));
}

export const GET = logged("GET /v1/extract/[id]", handleGET);
