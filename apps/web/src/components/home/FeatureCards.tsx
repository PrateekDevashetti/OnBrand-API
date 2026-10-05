"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SWATCHES = ["#0f3d2e", "#1d5a43", "#2e7d5b", "#4caf50", "#8fd19e", "#cfe8d4", "#e9f5ec", "#f3f6f0", "#15201b"];

function ExtractArt() {
  const [pct, setPct] = useState(12);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 8 : p + 3)), 140);
    return () => clearInterval(t);
  }, []);
  const cells = 36;
  const lit = Math.round((pct / 100) * cells);
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="absolute top-[26px] left-[60px] flex gap-[3px]">
        <span className="h-[7px] w-[7px] rounded-full bg-cream" />
        <span className="h-[7px] w-[7px] rounded-full bg-cream/60" />
      </div>
      <span className="absolute top-[24px] right-[24px] font-mono text-[8.5px] text-dim">[EXTRACTING]</span>
      <div className="rounded-[34px] bg-cream p-[18px] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="grid h-[118px] w-[118px] grid-cols-6 gap-0 overflow-hidden rounded-[14px] bg-[#0d1512]">
          {Array.from({ length: cells }, (_, i) => (
            <span key={i} className="transition-colors duration-300" style={{ background: i < lit ? SWATCHES[(i * 7) % SWATCHES.length] : "#16201b" }} />
          ))}
        </div>
      </div>
      <span className="absolute right-[44px] bottom-[28px] font-mono text-[8.5px] text-dim">{pct}%</span>
    </div>
  );
}

const QUERIES = ["brands with a playful, hand-drawn illustration style?", "dark bold creative studio with expressive type", "calm fintech with editorial serif headlines"];

function SearchArt() {
  const [qi, setQi] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const q = QUERIES[qi];
    const t = setTimeout(() => {
      if (n < q.length) setN(n + 1);
      else {
        setN(0);
        setQi((qi + 1) % QUERIES.length);
      }
    }, n < q.length ? 45 : 1800);
    return () => clearTimeout(t);
  }, [n, qi]);
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="flex w-full items-center gap-2 rounded-[6px] bg-cream py-[9px] pr-[7px] pl-3">
        <span className="min-h-[20px] flex-1 font-mono text-[8.5px] leading-[1.2] text-ink">
          {QUERIES[qi].slice(0, n)}
          <span className="pulse-dot">▍</span>
        </span>
        <span className="rounded-[3px] bg-ink px-2 py-[3px] font-mono text-[8px] text-cream">Search</span>
      </div>
    </div>
  );
}

function AdherenceArt() {
  const rows = [
    ["[TYPOGRAPHY]", "100% CORRECT"],
    ["[COLOURS]", "100% CORRECT"],
    ["[SPACING]", "96% CORRECT"],
    ["[TOTAL]", "98% CORRECT"],
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative h-[108px] w-[176px] overflow-hidden rounded-[3px] bg-[#0e1210]">
        <div className="absolute inset-x-0 top-0 flex h-[10px] items-center gap-1 bg-[#1a221d] px-1.5">
          <span className="h-[3px] w-6 bg-[#4caf50]" />
          <span className="ml-auto h-[3px] w-10 bg-white/30" />
        </div>
        <div className="absolute top-[22px] left-[12px] font-serif text-[11px] leading-[1.05] text-[#e9f5ec]">
          Grow anything,
          <br />
          on brand.
        </div>
        <div className="absolute right-[10px] bottom-[10px] h-[54px] w-[64px] rounded-[2px] bg-gradient-to-br from-[#2e7d5b] to-[#0f3d2e]" />
        <div className="absolute bottom-[12px] left-[12px] h-[8px] w-[34px] rounded-full border border-[#4caf50]/70" />
      </div>
      <div className="mt-[8px] grid grid-cols-2 gap-x-6 font-mono text-[6.5px] leading-[1.5] text-dim">
        {rows.map(([a, b]) => (
          <div key={a} className="contents">
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CARDS = [
  { href: "/app/extract", title: "Brand Extraction", badge: "BETA", body: "Turn any website into reusable design tokens and components. Built for agents.", Art: ExtractArt },
  { href: "/app/search", title: "Style Search", badge: "ALPHA", body: "Your end user doesn't have a brand? Search in natural language and retrieve any brand from our curated index of brand systems.", Art: SearchArt },
  { href: "/app/adherence", title: "Verify Adherence", badge: "ALPHA", body: "Verify if the assets your agent is producing are staying on brand. Get a score, critique or even instructions for agent loops to improve brand adherence.", Art: AdherenceArt },
] as const;

export function FeatureCards() {
  return (
    <div className="grid grid-cols-3 gap-[20px]">
      {CARDS.map(({ href, title, badge, body, Art }) => (
        <Link key={href} href={href} className="group block">
          <div className="h-[222px] overflow-hidden rounded-[14px] bg-card-2 transition-colors group-hover:bg-[#282827]">
            <Art />
          </div>
          <div className="mt-[20px] flex items-center gap-[10px]">
            <span className="text-[13.5px] text-cream">{title}</span>
            <span className={badge === "BETA" ? "badge-beta" : "badge-alpha"}>{badge}</span>
          </div>
          <p className="mt-[14px] text-[11.5px] leading-[1.55] text-dim">{body}</p>
        </Link>
      ))}
    </div>
  );
}
