import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema, getBalance } from "@onbrand/core";
import { getActor, getSessionUser } from "@/lib/auth";
import { json, unauthorized, handleError } from "@/lib/http";

export async function GET(req: Request) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, actor.userId) });
  return json({ id: u?.id, email: u?.email, name: u?.name, company_name: u?.companyName, company_website: u?.companyWebsite, plan: u?.plan, credits: await getBalance(actor.userId) });
}

const Patch = z.object({ name: z.string().max(120).optional(), email: z.string().max(200).optional(), company_name: z.string().max(120).optional(), company_website: z.string().max(300).optional() });

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const b = Patch.parse(await req.json());
    await db
      .update(schema.users)
      .set({ ...(b.name !== undefined && { name: b.name }), ...(b.email !== undefined && { email: b.email }), ...(b.company_name !== undefined && { companyName: b.company_name }), ...(b.company_website !== undefined && { companyWebsite: b.company_website }) })
      .where(eq(schema.users.id, user.id));
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const id = user.id;
  for (const t of [schema.apiKeys, schema.extractions, schema.searches, schema.adherenceRuns, schema.usageEvents, schema.creditLedger] as const) {
    await db.delete(t).where(eq(t.userId, id));
  }
  await db.delete(schema.users).where(eq(schema.users.id, id));
  if (process.env.CLERK_SECRET_KEY) {
    const { clerkClient } = await import("@clerk/nextjs/server");
    await (await clerkClient()).users.deleteUser(id).catch(() => {});
  }
  return json({ ok: true });
}
