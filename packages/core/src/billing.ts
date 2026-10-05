/**
 * Self-serve billing on Stripe (REST, no SDK). Plans are subscriptions that add their credit
 * allowance on every paid invoice; top-ups are one-off credit packs. Prices are sent inline
 * (price_data), so no Stripe dashboard setup is needed beyond the API key and webhook secret.
 * Without STRIPE_SECRET_KEY the dashboard records an upgrade request instead.
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { billingEvents, billingRequests, users } from "./db/schema";
import { addCredits } from "./accounts";
import { newId } from "./ids";
import { ANNUAL_DISCOUNT, PLANS } from "./plans";

export class BillingUnavailableError extends Error {
  constructor() {
    super("Self-serve checkout is not configured yet.");
  }
}

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

function form(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) return [];
    if (Array.isArray(v)) return v.flatMap((x, i) => (typeof x === "object" ? form(x as Record<string, unknown>, `${key}[${i}]`) : [`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`]));
    if (typeof v === "object") return form(v as Record<string, unknown>, key);
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });
}

async function stripe<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form(params).join("&"),
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(`Stripe: ${json.error?.message ?? res.status}`);
  return json;
}

export type CheckoutInput = { kind: "plan" | "topup"; plan: "starter" | "pro"; period?: "monthly" | "annual" };

/** Creates a Stripe Checkout session and returns its URL. */
export async function createCheckout(userId: string, input: CheckoutInput, origin: string): Promise<string> {
  if (!stripeEnabled()) throw new BillingUnavailableError();
  const plan = PLANS.find((p) => p.id === input.plan);
  if (!plan || plan.monthly == null || plan.credits == null) throw new Error("Unknown plan");
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const annual = input.kind === "plan" && input.period === "annual";
  const credits = annual ? plan.credits * 12 : plan.credits;
  const cents = input.kind === "topup" ? plan.monthly * 100 : annual ? Math.round(plan.monthly * 12 * (1 - ANNUAL_DISCOUNT) * 100) : plan.monthly * 100;
  const meta = { user_id: userId, kind: input.kind, plan: plan.id, credits: String(credits), period: annual ? "annual" : "monthly" };
  const session = await stripe<{ url: string }>("checkout/sessions", {
    mode: input.kind === "plan" ? "subscription" : "payment",
    success_url: `${origin}/app/billing?checkout=success`,
    cancel_url: `${origin}/app/billing?checkout=cancelled`,
    client_reference_id: userId,
    ...(user?.stripeCustomerId ? { customer: user.stripeCustomerId } : user?.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: { name: input.kind === "topup" ? `OnBrand credit pack · ${plan.credits.toLocaleString()} credits` : `OnBrand ${plan.name} (${annual ? "annual" : "monthly"})` },
          ...(input.kind === "plan" ? { recurring: { interval: annual ? "year" : "month" } } : {}),
        },
      },
    ],
    metadata: meta,
    ...(input.kind === "plan" ? { subscription_data: { metadata: meta } } : { payment_intent_data: { metadata: meta } }),
  });
  return session.url;
}

/** Verifies the Stripe-Signature header (v1 scheme, 5-minute tolerance). */
export function verifyStripeSignature(raw: string, header: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET ?? "") {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const sig = p.slice(3);
      return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    });
}

type Meta = { user_id?: string; kind?: string; plan?: string; credits?: string };
type StripeEvent = { id: string; type: string; data: { object: Record<string, any> } }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Applies a verified Stripe event exactly once. Returns false for duplicates. */
export async function applyStripeEvent(evt: StripeEvent): Promise<boolean> {
  const inserted = await db.insert(billingEvents).values({ id: evt.id, type: evt.type }).onConflictDoNothing().returning({ id: billingEvents.id });
  if (!inserted.length) return false;
  const o = evt.data.object;
  if (evt.type === "checkout.session.completed") {
    const m = (o.metadata ?? {}) as Meta;
    if (!m.user_id) return true;
    if (o.mode === "payment" && m.kind === "topup" && o.payment_status === "paid") {
      await addCredits(m.user_id, Number(m.credits ?? 0), `topup:${m.plan}`);
    }
    if (o.mode === "subscription") {
      await db.update(users).set({ plan: m.plan ?? "starter", stripeCustomerId: o.customer ?? null, stripeSubscriptionId: o.subscription ?? null }).where(eq(users.id, m.user_id));
    }
  } else if (evt.type === "invoice.paid") {
    // Every paid subscription invoice (first and renewals) adds the plan allowance.
    const m = (o.parent?.subscription_details?.metadata ?? o.subscription_details?.metadata ?? {}) as Meta;
    if (m.user_id && m.credits) await addCredits(m.user_id, Number(m.credits), `plan:${m.plan}:${o.id}`);
  } else if (evt.type === "customer.subscription.deleted") {
    const m = (o.metadata ?? {}) as Meta;
    if (m.user_id) await db.update(users).set({ plan: "free", stripeSubscriptionId: null }).where(eq(users.id, m.user_id));
  }
  return true;
}

/** Recorded when checkout is unavailable so sales can follow up. */
export async function requestUpgrade(userId: string, email: string, plan: string, period: string) {
  await db.insert(billingRequests).values({ id: newId("breq"), userId, email, plan, period });
}
