import { revokeApiKey } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  await revokeApiKey(user.id, id);
  return json({ ok: true });
}
