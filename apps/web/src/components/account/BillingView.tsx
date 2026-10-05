"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "../ui/Segmented";

type Plan = { id: string; name: string; monthly: number | null; credits: number | null; features: readonly string[]; cta: string };

export function BillingView({ plans, discount, balance, testCredits, checkout }: { plans: readonly Plan[]; discount: number; balance: number; testCredits: boolean; checkout: boolean }) {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("checkout") === "success") setMsg("Payment received — your credits will appear in a few seconds.");
    if (params.get("checkout") === "cancelled") setMsg("Checkout cancelled. Nothing was charged.");
  }, [params]);

  /** Stripe Checkout when configured; otherwise record an upgrade request for follow-up. */
  async function buy(kind: "plan" | "topup", plan: string) {
    if (plan === "enterprise") return void (window.location.href = "mailto:hello@trycanopy.space?subject=OnBrand%20Enterprise");
    setBusy(`${kind}:${plan}`);
    setMsg("");
    try {
      if (checkout) {
        const res = await fetch("/api/v1/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, plan, period }) });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j.url) return void (window.location.href = j.url);
        if (j?.error?.code !== "billing_unavailable") return setMsg(j?.error?.message ?? "Checkout failed. Try again.");
      }
      await fetch("/api/v1/billing/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: kind === "topup" ? "topup" : plan, period }) });
      setMsg("Request received — we'll email you a payment link within one business day.");
    } finally {
      setBusy("");
    }
  }
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
              onClick={() => buy("plan", p.id)}
              disabled={busy === `plan:${p.id}`}
              className="mt-auto h-[32px] w-full rounded-[2px] border border-cream/90 text-[15px] text-cream transition-colors hover:bg-cream hover:text-ink disabled:opacity-60"
            >
              {busy === `plan:${p.id}` ? "Opening checkout…" : p.cta}
            </button>
          </div>
        ))}
      </div>
      {msg && <p role="status" className="mt-4 text-[13px] text-cream">{msg}</p>}
      <div className="mt-[28px] flex flex-wrap items-center gap-[12px] rounded-[2px] bg-card px-[30px] py-[20px]">
        <div className="mr-auto">
          <div className="text-[15px] text-cream">Top up credits</div>
          <div className="mt-[4px] text-[13px] text-dim">One-off packs. Credits never expire while your account is active.</div>
        </div>
        {plans.filter((p) => p.monthly != null).map((p) => (
          <button key={p.id} type="button" onClick={() => buy("topup", p.id)} disabled={busy === `topup:${p.id}`} className="btn-outline h-[34px] text-[13.5px] disabled:opacity-60">
            {p.credits!.toLocaleString()} credits · ${p.monthly}
          </button>
        ))}
      </div>
      <div className="mt-[36px] space-y-[4px] text-[15px]">
        <div><span className="text-cream">Search</span> <span className="text-dim">Light 1 credit, Deep 2 credits</span></div>
        <div><span className="text-cream">Extraction</span> <span className="text-dim">2 credits</span> <span className="text-mute">· cached results are free</span></div>
        <div><span className="text-cream">Verifier</span> <span className="text-dim">2 credits</span></div>
        <div className="pt-[10px] text-[13px] text-dim">600 credits ≈ 300 brand extractions, or 600 light searches. Failed jobs are refunded automatically.</div>
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
