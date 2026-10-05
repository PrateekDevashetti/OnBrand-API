import { usageSummary } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { FeatureCards } from "@/components/home/FeatureCards";
import { CreditsCard, ApiUsageCard, type HomeUsage } from "@/components/home/UsageCards";
import { Integrations } from "@/components/home/Integrations";
import { NewKeyButton } from "@/components/NewKeyButton";

export const dynamic = "force-dynamic";

async function load(userId: string, days: number): Promise<HomeUsage> {
  const u = await usageSummary(userId, { days });
  return {
    days,
    credits: u.totals.creditsSpent,
    requests: u.totals.allRequests,
    balance: u.balance,
    series: u.series.map((s) => ({ label: s.label, extraction: s.extraction, search: s.search, adherence: s.adherence })),
  };
}

export default async function HomePage() {
  const user = (await getSessionUser())!;
  const [d7, d30, d90] = await Promise.all([load(user.id, 7), load(user.id, 30), load(user.id, 90)]);
  const data = { "7": d7, "30": d30, "90": d90 };
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const rangeLabel = `${fmt(new Date(Date.now() - 29 * 86400_000))} - ${fmt(new Date())}`;
  return (
    <div className="mx-auto w-[952px] max-w-[calc(100%-48px)] pt-[48px] pb-[48px]">
      <h1 className="text-[31px] leading-[1.06] tracking-[-0.012em]">
        <span className="text-[#8a8c88]">Everything your agent needs to stay on brand.</span>
        <br />
        <span className="text-cream">In three endpoints.</span>
      </h1>
      <div className="mt-[40px]">
        <FeatureCards />
      </div>
      <div className="mt-[64px] grid grid-cols-2 items-start gap-[8px]">
        <div className="flex flex-col gap-[8px]">
          <CreditsCard data={data} />
          <ApiUsageCard data={data} rangeLabel={rangeLabel} />
        </div>
        <div className="card px-[24px] pt-[24px] pb-[24px]">
          <h3 className="text-[20px] text-cream">API Key</h3>
          <p className="mt-[6px] text-[13px] text-dim">Start extracting brands right away</p>
          <div className="mt-[22px]">
            <NewKeyButton />
          </div>
          <div className="my-[24px] h-px bg-line" />
          <Integrations />
        </div>
      </div>
    </div>
  );
}
