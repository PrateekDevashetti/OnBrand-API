"use client";

import Link from "next/link";
import { useState } from "react";
import { Select } from "../ui/Select";
import { BarMeter, LineChart } from "../ui/charts";

export type HomeUsage = {
  days: number;
  credits: number;
  requests: number;
  balance: number;
  series: { label: string; extraction: number; search: number; adherence: number }[];
};

export function CreditsCard({ data }: { data: Record<string, HomeUsage> }) {
  const [range, setRange] = useState("7");
  const d = data[range];
  const ratio = d.credits + d.balance > 0 ? d.credits / (d.credits + d.balance) : 0;
  return (
    <div className="card px-[24px] pt-[24px] pb-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] text-cream">Credits Usage</h3>
        <Select value={range} onChange={setRange} options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} />
      </div>
      <div className="mt-[30px] flex items-baseline gap-[14px]">
        <span className="text-[33px] leading-none text-cream">{d.credits}</span>
        <span className="text-[13.5px] text-dim">credits used</span>
      </div>
      <div className="mt-[30px]">
        <BarMeter ratio={ratio} />
      </div>
      <div className="mt-[38px] text-right">
        <Link href="/app/usage" className="text-[13.5px] text-dim transition-colors hover:text-cream">
          More Details →
        </Link>
      </div>
    </div>
  );
}

export function ApiUsageCard({ data, rangeLabel }: { data: Record<string, HomeUsage>; rangeLabel: string }) {
  const [range, setRange] = useState("30");
  const d = data[range];
  const first = d.series[0]?.label ?? "";
  const last = d.series[d.series.length - 1]?.label ?? "";
  return (
    <div className="card px-[24px] pt-[24px] pb-[24px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] text-cream">API Usage</h3>
        <Select value={range} onChange={setRange} options={[{ value: "30", label: rangeLabel }, { value: "7", label: "Last 7 days" }, { value: "90", label: "Last 90 days" }]} />
      </div>
      <div className="mt-[28px] flex items-baseline gap-[14px]">
        <span className="text-[33px] leading-none text-cream">{d.requests}</span>
        <span className="text-[13.5px] text-dim">requests</span>
      </div>
      <div className="mt-[52px] mb-[6px] flex justify-end gap-[16px] text-[13.5px] text-dim">
        <span className="flex items-center gap-[6px]">
          <span className="h-[9px] w-[8px] rounded-[2px] border border-dim" />
          Extraction
        </span>
        <span className="flex items-center gap-[6px]">
          <span className="h-[9px] w-[9px] rounded-full border border-dashed border-dim" />
          Search
        </span>
      </div>
      <LineChart
        labels={[first, last]}
        series={[
          { values: d.series.map((s) => s.extraction + s.adherence) },
          { values: d.series.map((s) => s.search), dashed: true },
        ]}
      />
    </div>
  );
}
