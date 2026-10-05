"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Segmented } from "../ui/Segmented";

type Plan = { id: string; name: string; monthly: number | null; credits: number | null; features: readonly string[]; cta: string };

export function BillingView({ plans, discount, balance, testCredits }: { plans: readonly Plan[]; discount: number; balance: number; testCredits: boolean }) {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const price = (m: number) => (period === "monthly" ? m : Math.round(m * (1 - discount)));
  return (
    <div className="px-[50px] pt-[50px] pb-[40px] max-md:px-[20px] max-md:pt-[28px]">
      <h1 className="text-[37px] leading-none text-cream">Billing</h1>
      <p className="mt-[24px] max-w-[810px] text-[15px] leading-[1.3] text-dim">Your plan adds its credit allowance to your balance every month. Anything you don&apos;t spend rolls over, and credits you already have are never removed.</p>
      <div className="mt-[56px] flex items-center justify-between">
        <Segmented value={period} onChange={setPeriod} options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: `Annual • ${Math.round(discount * 100)}% savings` }]} />
        <span className="text-[13px] text-dim">Balance: <span className="text-cream">{balance} credits</span></span>
      </div>
      <div className="mt-[12px] grid grid-cols-3 gap-[12px] max-lg:grid-cols-1">
        {plans.map((p) => (
          <div key={p.id} className="flex h-[584px] flex-col rounded-[2px] bg-card px-[30px] pt-[38px] pb-[34px]">
            <div className="text-[15px] text-cream">{p.name}</div>
            <div className="mt-[64px] text-[29px] leading-[1.17]">
              {p.monthly != null ? (
                <>
                  <div><span className="text-cream">${price(p.monthly)}</span> <span className="text-dim">per month</span></div>
                  <div><span className="text-cream">{p.credits!.toLocaleString()}</span> <span className="text-dim">credits</span></div>
                </>
              ) : (
                <>
                  <div><span className="text-cream">Let&apos;s talk</span> <span className="text-dim">volume pricing</span></div>
                  <div className="text-dim">SLA&apos;s &amp; support</div>
                </>
              )}
            </div>
            <ul className="mt-[58px] space-y-[5px] text-[15px] text-dim">
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <button
              type="button"
              onClick={() => (p.monthly == null ? (window.location.href = "mailto:hello@trycanopy.space?subject=OnBrand%20Enterprise") : setMsg("Checkout is being connected — reach us at hello@trycanopy.space to upgrade today."))}
              className="mt-auto h-[32px] w-full rounded-[2px] border border-cream/90 text-[15px] text-cream transition-colors hover:bg-cream hover:text-ink"
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
      {msg && <p className="mt-4 text-[13px] text-warn">{msg}</p>}
      <div className="mt-[36px] space-y-[4px] text-[15px]">
        <div><span className="text-cream">Search</span> <span className="text-dim">Light 1 credit, Deep 2 credits</span></div>
        <div><span className="text-cream">Extraction</span> <span className="text-dim">2 credits</span> <span className="text-mute">· cached results are free</span></div>
        <div><span className="text-cream">Verifier</span> <span className="text-dim">2 credits</span></div>
      </div>
      {testCredits && (
        <div id="coupon" className="mt-[36px] flex items-center gap-4 rounded-[6px] border border-dashed border-line-2 px-5 py-4">
          <span className="text-[13px] text-dim">Test environment — grant yourself credits to try the playground.</span>
          <button type="button" className="btn-outline h-[30px] text-[13px]" onClick={async () => { await fetch("/api/v1/billing/dev-credits", { method: "POST" }); router.refresh(); }}>
            Add 50 test credits
          </button>
        </div>
      )}
    </div>
  );
}
