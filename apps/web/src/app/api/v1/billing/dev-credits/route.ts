import { logged } from "@/lib/logged";
import { addCredits } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { testCreditsAllowed } from "@/lib/config";
import { json, apiError, unauthorized } from "@/lib/http";

/** Local/test environments only: grant test credits so the playground can be exercised. */
async function handlePOST() {
  if (!testCreditsAllowed()) return apiError(403, "forbidden", "Test credits are disabled in production");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  await addCredits(user.id, 50, "test_credits");
  return json({ ok: true, added: 50 });
}

export const POST = logged("POST /v1/billing/dev-credits", handlePOST);
