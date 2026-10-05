import { z } from "zod";
import { requestUpgrade } from "@onbrand/core";
import { logged } from "@/lib/logged";
import { getSessionUser } from "@/lib/auth";
import { handleError, json, unauthorized } from "@/lib/http";

const Body = z.object({ plan: z.enum(["starter", "pro", "enterprise", "topup"]), period: z.enum(["monthly", "annual"]).default("monthly") });

/** Records an upgrade request (used while self-serve checkout is not configured). */
async function handlePOST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = Body.parse(await req.json());
    await requestUpgrade(user.id, user.email ?? "", body.plan, body.period);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export const POST = logged("POST /v1/billing/request", handlePOST);
