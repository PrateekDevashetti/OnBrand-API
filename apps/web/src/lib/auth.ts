import "server-only";
import { authenticateApiKey, ensureUser, type Actor } from "@onbrand/core";

export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
/** Single-user dev mode never runs in production unless explicitly opted in (private staging only). */
export const devAuthEnabled = !clerkEnabled && (process.env.NODE_ENV !== "production" || process.env.ONBRAND_DEV_AUTH === "true");

const DEV_USER = { id: "dev_user", email: "dev@onbrand.local", name: "OnBrand Developer" };

export type SessionUser = { id: string; email: string; name: string };

/** The signed-in dashboard user (Clerk), or the local dev user when Clerk isn't configured. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!clerkEnabled) {
    if (!devAuthEnabled) return null;
    await ensureUser(DEV_USER.id, DEV_USER);
    return DEV_USER;
  }
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;
  const u = await currentUser();
  const email = u?.primaryEmailAddress?.emailAddress ?? "";
  const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.username || "";
  await ensureUser(userId, { email, name });
  return { id: userId, email, name };
}

export function readApiKey(req: Request): string | null {
  const x = req.headers.get("x-api-key");
  if (x) return x.trim();
  const a = req.headers.get("authorization");
  if (a?.toLowerCase().startsWith("bearer ")) return a.slice(7).trim();
  return null;
}

/** Resolve who is calling: an API key (REST / MCP) or the dashboard session (playground). */
export async function getActor(req: Request, via: Actor["via"] = "api"): Promise<Actor | null> {
  const key = readApiKey(req);
  if (key) {
    const hit = await authenticateApiKey(key);
    return hit ? { userId: hit.userId, apiKeyId: hit.apiKeyId, via } : null;
  }
  const user = await getSessionUser();
  return user ? { userId: user.id, apiKeyId: null, via: "playground" } : null;
}
