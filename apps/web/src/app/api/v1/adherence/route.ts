import { logged } from "@/lib/logged";
import { z } from "zod";
import { createAdherence, getAdherence, listAdherencePage } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError, apiError } from "@/lib/http";
import { serializeAdherence } from "@/lib/serialize";

export const maxDuration = 300;

// `reference_url` is the brand standard; `candidate_url` is the page being judged.
// Older field names (`reference`, `design`, `design_url`) are still accepted.
const Body = z.object({
  reference_url: z.string().min(3).optional(),
  candidate_url: z.string().min(3).optional(),
  reference: z.string().min(3).optional(),
  design: z.string().min(3).optional(),
  design_url: z.string().min(3).optional(),
});

async function handlePOST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = Body.parse(await req.json());
    const reference = body.reference_url ?? body.reference;
    const design = body.candidate_url ?? body.design_url ?? body.design;
    if (!reference || !design) return apiError(400, "invalid_request", "Send both `reference_url` (the brand standard) and `candidate_url` (the page to judge).");
    const row = await createAdherence(actor, { reference, design });
    if (new URL(req.url).searchParams.get("wait") === "true") {
      const deadline = Date.now() + 280_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2500));
        const cur = await getAdherence(row.id);
        if (cur && (cur.status === "completed" || cur.status === "failed")) return json(serializeAdherence(cur));
      }
    }
    return json(serializeAdherence(row), 202);
  } catch (e) {
    return handleError(e);
  }
}

async function handleGET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const limit = Math.max(1, Math.min(Number(sp.get("limit") ?? 20) || 20, 100));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const { rows, total } = await listAdherencePage(actor.userId, { q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, limit, offset });
  return json({ data: rows.map((r) => serializeAdherence({ ...r, report: null })), total, limit, offset });
}

export const POST = logged("POST /v1/adherence", handlePOST);

export const GET = logged("GET /v1/adherence", handleGET);
