import { eq, and, isNull, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "./db/client";
import { users, apiKeys, creditLedger, usageEvents } from "./db/schema";
import { newId, sha256 } from "./ids";
import { env } from "./env";

export type Actor = { userId: string; apiKeyId?: string | null; via: "playground" | "api" | "mcp" };

export const PRICING = {
  extraction: 2,
  searchLight: 1,
  searchDeep: 2,
  adherence: 2,
  enhance: 0,
} as const;

export class InsufficientCreditsError extends Error {
  status = 402;
  constructor(public needed: number, public balance: number) {
    super(`Not enough credits: need ${needed}, have ${balance}. Top up at /app/billing.`);
  }
}

export async function ensureUser(id: string, profile: { email?: string; name?: string } = {}) {
  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (existing) {
    if ((profile.email && !existing.email) || (profile.name && !existing.name)) {
      await db.update(users).set({ email: existing.email || profile.email || "", name: existing.name || profile.name || "" }).where(eq(users.id, id));
    }
    return existing;
  }
  const credits = env.signupCredits;
  const [row] = await db
    .insert(users)
    .values({ id, email: profile.email ?? "", name: profile.name ?? "", credits })
    .onConflictDoNothing()
    .returning();
  if (row) await db.insert(creditLedger).values({ id: newId("led"), userId: id, delta: credits, reason: "signup_bonus" });
  return row ?? (await db.query.users.findFirst({ where: eq(users.id, id) }))!;
}

export async function getBalance(userId: string) {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return u?.credits ?? 0;
}

/** Atomically debit credits; throws InsufficientCreditsError. */
export async function debit(userId: string, amount: number, reason: string, refId?: string) {
  if (amount <= 0) return;
  const rows = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(and(eq(users.id, userId), sql`${users.credits} >= ${amount}`))
    .returning({ credits: users.credits });
  if (!rows.length) throw new InsufficientCreditsError(amount, await getBalance(userId));
  await db.insert(creditLedger).values({ id: newId("led"), userId, delta: -amount, reason, refId });
}

export async function refund(userId: string, amount: number, reason: string, refId?: string) {
  if (amount <= 0) return;
  await db.update(users).set({ credits: sql`${users.credits} + ${amount}` }).where(eq(users.id, userId));
  await db.insert(creditLedger).values({ id: newId("led"), userId, delta: amount, reason, refId });
}

export async function addCredits(userId: string, amount: number, reason: string) {
  await refund(userId, amount, reason);
}

export async function recordUsage(actor: Actor, feature: string, credits: number, refId: string, latencyMs?: number) {
  await db.insert(usageEvents).values({ id: newId("use"), userId: actor.userId, apiKeyId: actor.apiKeyId ?? null, feature, credits, refId, latencyMs });
}

// ---------------- API keys ----------------

export async function createApiKey(userId: string, name: string) {
  const secret = `ob_live_${crypto.randomBytes(24).toString("base64url")}`;
  const id = newId("key");
  await db.insert(apiKeys).values({ id, userId, name: name || "Default key", prefix: secret.slice(0, 14), hash: sha256(secret) });
  return { id, name, secret, prefix: secret.slice(0, 14) };
}

export async function listApiKeys(userId: string) {
  return db.query.apiKeys.findMany({ where: and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)), orderBy: (k, { desc }) => [desc(k.createdAt)] });
}

export async function revokeApiKey(userId: string, id: string) {
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function authenticateApiKey(secret: string): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!secret?.startsWith("ob_")) return null;
  const key = await db.query.apiKeys.findFirst({ where: and(eq(apiKeys.hash, sha256(secret)), isNull(apiKeys.revokedAt)) });
  if (!key) return null;
  void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).catch(() => {});
  return { userId: key.userId, apiKeyId: key.id };
}
