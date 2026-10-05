"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoCircle } from "../ui/icons";

const PRESETS = [
  { label: "Reducto Home vs Pricing", reference: "https://reducto.ai", design: "https://reducto.ai/pricing", icon: "reducto.ai" },
  { label: "Stripe Home vs Payments", reference: "https://stripe.com", design: "https://stripe.com/payments", icon: "stripe.com" },
];

export function AdherenceForm() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [design, setDesign] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(r = reference, d = design) {
    if (!r.trim() || !d.trim()) return setError("Add both a reference brand and your design URL");
    setBusy(true);
    setError("");
    const res = await fetch("/api/v1/adherence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: r, design: d }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(j?.error?.message ?? "Could not start verification");
    }
    router.push(`/app/adherence/${j.id}`);
  }

  return (
    <>
      <form
        className="mx-auto mt-[47px] flex w-[1042px] max-w-full items-end gap-[16px] max-md:flex-col max-md:items-stretch"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex-1">
          <span className="mb-[10px] block text-[11.5px] text-cream">Reference Brand</span>
          <input className="cream-input" placeholder="https://linear.app" value={reference} onChange={(e) => setReference(e.target.value)} spellCheck={false} />
        </label>
        <span className="pb-[15px] text-[13px] text-dim">vs</span>
        <label className="flex-1">
          <span className="mb-[10px] block text-[11.5px] text-cream">Your design</span>
          <input className="cream-input" placeholder="https://redesign.linear.vercel.app" value={design} onChange={(e) => setDesign(e.target.value)} spellCheck={false} />
        </label>
        <button type="submit" disabled={busy} aria-label="Verify" className="mb-[6px] ml-[10px] text-cream transition-transform hover:scale-105 disabled:opacity-50">
          {busy ? <span className="spin block h-[36px] w-[36px] rounded-full border border-cream/30 border-t-cream" /> : <GoCircle size={37} />}
        </button>
      </form>
      {error && <p className="mt-4 text-center text-[13px] text-bad">{error}</p>}
      <div className="absolute right-[60px] bottom-[28px] flex items-center gap-[12px]">
        <div className="mr-[28px]">
          <div className="text-[15px] text-cream">Want a sneak peek first?</div>
          <div className="mt-[4px] text-[11.5px] text-dim">Prefill a pair and checkout scoring</div>
        </div>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => (setReference(p.reference), setDesign(p.design))} className="flex h-[40px] items-center gap-[10px] rounded-[4px] border border-cream/80 px-[20px] text-[13.5px] text-cream transition-colors hover:bg-cream hover:text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${p.icon}&sz=32`} alt="" className="h-[15px] w-[15px] rounded-[3px]" />
            {p.label}
          </button>
        ))}
      </div>
    </>
  );
}
