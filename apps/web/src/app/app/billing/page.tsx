import { PLANS, ANNUAL_DISCOUNT, getBalance } from "@onbrand/core";
import { getSessionUser, clerkEnabled } from "@/lib/auth";
import { BillingView } from "@/components/account/BillingView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = (await getSessionUser())!;
  const balance = await getBalance(user.id);
  return <BillingView plans={PLANS} discount={ANNUAL_DISCOUNT} balance={balance} testCredits={!clerkEnabled || process.env.ONBRAND_ALLOW_TEST_CREDITS === "true"} />;
}
