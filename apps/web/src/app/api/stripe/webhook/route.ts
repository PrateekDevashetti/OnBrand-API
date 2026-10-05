import { applyStripeEvent, verifyStripeSignature } from "@onbrand/core";

/** Stripe webhook: signature-verified, idempotent (event ids are recorded once). */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"))) return new Response("invalid signature", { status: 400 });
  const applied = await applyStripeEvent(JSON.parse(raw));
  return Response.json({ received: true, duplicate: !applied });
}
