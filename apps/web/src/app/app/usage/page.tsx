import { usageSummary, listApiKeys } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { UsageView } from "@/components/account/UsageView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usage" };

export default async function UsagePage() {
  const user = (await getSessionUser())!;
  const [initial, keys] = await Promise.all([usageSummary(user.id, { days: 30, feature: "extraction" }), listApiKeys(user.id)]);
  return <UsageView initial={JSON.parse(JSON.stringify(initial))} keys={keys.map((k) => ({ id: k.id, name: k.name }))} />;
}
