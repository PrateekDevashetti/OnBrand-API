import { logged } from "@/lib/logged";
import { addCredits } from "@onbrand/core";
import { getSessionUser, clerkEnabled } from "@/lib/auth";
import { json, apiError, unauthorized } from "@/lib/http";

/** Local/test environments only: grant test credits so the playground can be exercised. */
async function handlePOST() {
  if (clerkEnabled && process.env.ONBRAND_ALLOW_TEST_CREDITS !== "true") return apiError(403, "forbidden", "Test credits are disabled in production");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  await addCredits(user.id, 50, "test_credits");
  return json({ ok: true, added: 50 });
}

export const POST = logged("POST /v1/billing/dev-credits", handlePOST);
