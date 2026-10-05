"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Segmented } from "../ui/Segmented";
import { Select } from "../ui/Select";
import { SpikeChart, MultiLine } from "../ui/charts";

type Summary = {
  balance: number;
  totals: { requests: number; creditsSpent: number; featureCredits: number; highestCreditSpent: number; avgLatencyMs: number; peakDayRequests: number; byFeature: Record<string, number> };
  series: { label: string; extraction: number; search: number; adherence: number; credits: number; requests: number; creditsByKey: number }[];
};

const FEATURE_LABEL: Record<string, string> = { extraction: "extractions", search: "search calls", adherence: "verifier runs" };

function latency(ms: number) {
  if (!ms) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function Big({ n, label, extra }: { n: React.ReactNode; label: string; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-[10px]">
        <span className="text-[33px] leading-none text-cream">{n}</span>
        {extra}
      </div>
      <div className="mt-[10px] text-[19px] text-dim">{label}</div>
    </div>
  );
}

export function UsageView({ initial, keys }: { initial: Summary; keys: { id: string; name: string }[] }) {
  const [feature, setFeature] = useState<"extraction" | "search" | "adherence">("extraction");
  const [days, setDays] = useState("30");
  const [key, setKey] = useState("all");
  const [data, setData] = useState(initial);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/v1/usage?feature=${feature}&days=${days}${key !== "all" ? `&key=${key}` : ""}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    return () => ctl.abort();
  }, [feature, days, key]);

  const s = data.series;
  const labels: [string, string] = [s[0]?.label ?? "", s[s.length - 1]?.label ?? ""];
  const low = data.balance <= 5;

  return (
    <div className="px-[50px] pt-[50px] pb-[40px]">
      <h1 className="text-[37px] leading-none text-cream">Usage</h1>
      <p className="mt-[22px] text-[19px] text-dim">See what&apos;s running, what&apos;s idle, and what it&apos;s costing you.</p>
      <div className="mt-[34px] flex items-center justify-between">
        <Segmented value={feature} onChange={setFeature} options={[{ value: "extraction", label: "Extraction" }, { value: "search", label: "Search" }, { value: "adherence", label: "Adherence" }]} />
        <div className="flex gap-[8px]">
          <Select value={key} onChange={setKey} options={[{ value: "all", label: "All API Keys" }, ...keys.map((k) => ({ value: k.id, label: k.name }))]} />
          <Select value={days} onChange={setDays} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} />
        </div>
      </div>
      <div className="mt-[24px] grid grid-cols-3 gap-[12px]">
        <div className="card flex h-[646px] flex-col px-[36px] pt-[36px] pb-[30px]">
          <div className="eyebrow text-[13.5px] text-cream">API Keys</div>
          <div className="mt-[86px] flex gap-[34px]">
            <Big n={data.totals.requests} label={FEATURE_LABEL[feature]} />
            <Big n={data.totals.highestCreditSpent} label="highest credit spent" />
          </div>
          <div className="mt-[56px] h-px bg-line-2" />
          <div className="mt-[38px] text-[13px] text-dim">
            Credits used per key <span className="ml-2 text-cream">{data.totals.featureCredits}</span>
          </div>
          <div className="mt-auto">
            <SpikeChart values={s.map((x) => x.creditsByKey)} labels={labels} />
          </div>
        </div>
        <div className="card flex h-[646px] flex-col px-[36px] pt-[36px] pb-[30px]">
          <div className="eyebrow text-[13.5px] text-cream">Requests</div>
          <div className="mt-[86px] flex gap-[60px]">
            <Big n={data.totals.requests} label="requests" />
            <Big n={latency(data.totals.avgLatencyMs)} label="avg latency" />
          </div>
          <div className="mt-[56px] h-px bg-line-2" />
          <div className="mt-[38px] text-[13px] text-dim">
            Requests made everyday <span className="ml-2 text-cream">{data.totals.peakDayRequests}</span>
          </div>
          <div className="mt-auto">
            <SpikeChart values={s.map((x) => x.requests)} labels={labels} />
          </div>
        </div>
        <div className="card flex h-[646px] flex-col px-[36px] pt-[36px] pb-[30px]">
          <div className="flex items-start justify-between">
            <div className="eyebrow text-[13.5px] text-cream">Credits</div>
            <div className="flex flex-col items-center">
              <Link href="/app/billing" className="inline-flex h-[44px] items-center rounded-[4px] border border-cream/90 px-[20px] text-[15px] text-cream hover:bg-cream hover:text-ink">
                Top up Credits
              </Link>
              <Link href="/app/billing#coupon" className="mt-[8px] text-[11px] text-dim hover:text-cream">
                Apply Coupon
              </Link>
            </div>
          </div>
          <div className="mt-[32px] flex gap-[24px]">
            <Big n={data.totals.creditsSpent} label="credits spent" />
            <Big n={data.balance} label="credits remaining" extra={low ? <span className="text-[14px] text-bad">Running Low</span> : null} />
          </div>
          <div className="mt-[56px] h-px bg-line-2" />
          <div className="mt-[38px] text-[13px] text-dim">
            Credits burnt by feature <span className="ml-2 text-cream">{data.totals.creditsSpent}</span>
          </div>
          <div className="mt-[34px] flex justify-end gap-[16px] text-[13.5px] text-dim">
            <span className="flex items-center gap-[6px]"><span className="h-[9px] w-[8px] rounded-[2px] border border-dim" />Extraction</span>
            <span className="flex items-center gap-[6px]"><span className="h-[9px] w-[8px] rounded-[2px] border border-dim/70" />Verifier</span>
            <span className="flex items-center gap-[6px]"><span className="h-[9px] w-[9px] rounded-full border border-dashed border-dim" />Search</span>
          </div>
          <div className="mt-auto">
            <MultiLine
              labels={labels}
              height={230}
              series={[
                { values: s.map((x) => x.extraction * 2) },
                { values: s.map((x) => x.adherence * 2), dash: "5 3", color: "#a3a5a1" },
                { values: s.map((x) => x.search), dash: "2 3", color: "#8b8d89" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
