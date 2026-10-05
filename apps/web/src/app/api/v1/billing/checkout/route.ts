import { z } from "zod";
import { BillingUnavailableError, createCheckout } from "@onbrand/core";
import { logged } from "@/lib/logged";
import { getSessionUser } from "@/lib/auth";
import { apiError, handleError, json, unauthorized } from "@/lib/http";

const Body = z.object({ kind: z.enum(["plan", "topup"]), plan: z.enum(["starter", "pro"]), period: z.enum(["monthly", "annual"]).optional() });

/** Starts Stripe Checkout for a plan or a credit pack. 503 billing_unavailable when Stripe is not configured. */
async function handlePOST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = Body.parse(await req.json());
    const url = await createCheckout(user.id, body, new URL(req.url).origin);
    return json({ url });
  } catch (e) {
    if (e instanceof BillingUnavailableError) return apiError(503, "billing_unavailable", e.message);
    return handleError(e);
  }
}

export const POST = logged("POST /v1/billing/checkout", handlePOST);
