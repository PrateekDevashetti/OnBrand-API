import { PLANS, ANNUAL_DISCOUNT, getBalance, stripeEnabled } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { testCreditsAllowed } from "@/lib/config";
import { BillingView } from "@/components/account/BillingView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = (await getSessionUser())!;
  const balance = await getBalance(user.id);
  return <BillingView plans={PLANS} discount={ANNUAL_DISCOUNT} balance={balance} testCredits={testCreditsAllowed()} checkout={stripeEnabled()} />;
}
