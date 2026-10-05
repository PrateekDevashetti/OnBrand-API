import { logged } from "@/lib/logged";
import { createApiKey, listApiKeys } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";

// Key management is session-only (dashboard), never via API key.
async function handleGET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const keys = await listApiKeys(user.id);
  return json({ data: keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })) });
}

async function handlePOST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const body = await req.json().catch(() => ({}));
    const key = await createApiKey(user.id, String(body.name ?? "").slice(0, 60));
    return json(key, 201);
  } catch (e) {
    return handleError(e);
  }
}

export const GET = logged("GET /v1/keys", handleGET);

export const POST = logged("POST /v1/keys", handlePOST);
