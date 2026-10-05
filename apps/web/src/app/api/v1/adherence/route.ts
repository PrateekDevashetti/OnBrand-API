import { z } from "zod";
import { createAdherence, getAdherence, listAdherence } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";
import { serializeAdherence } from "@/lib/serialize";

export const maxDuration = 300;

const Body = z.object({ reference: z.string().min(3), design: z.string().min(3) });

export async function POST(req: Request) {
  try {
    const actor = await getActor(req, "api");
    if (!actor) return unauthorized();
    const body = Body.parse(await req.json());
    const row = await createAdherence(actor, body);
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

export async function GET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  return json({ data: await listAdherence(actor.userId, { limit: 50 }) });
}
