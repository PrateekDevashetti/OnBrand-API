"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BrandSystem, Color } from "@onbrand/core/types";
import type { AdherenceReport, AdherenceCategory } from "@onbrand/core/adherence";
import { ArrowLeft, ShareIcon } from "../ui/icons";
import { CodeBlock } from "../ui/CodeBlock";

type Side = { id: string; status: string; url: string; company: string; hero: string | null; favicon: string | null; brand: Partial<BrandSystem> | null } | null;

export type AdherenceData = {
  id: string;
  status: string;
  reference_url: string;
  design_url: string;
  score: number | null;
  report: AdherenceReport | null;
  error: string | null;
  reference: Side;
  design: Side;
};

const NAV = [
  { key: "overall", label: "Overall Adherence" },
  { key: "visual", label: "Visual Identity" },
  { key: "spatial", label: "Spatial Identity" },
  { key: "colors", label: "Colours" },
  { key: "typography", label: "Typography" },
  { key: "layout", label: "Layout" },
  { key: "surfaces", label: "Surfaces" },
  { key: "elevation", label: "Elevation" },
];

function host(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

function scoreColor(n: number) {
  return n >= 85 ? "text-ok" : n >= 65 ? "text-warn" : "text-bad";
}

function SideHeader({ eyebrow, side, url }: { eyebrow: string; side: Side; url: string }) {
  const h = host(url);
  return (
    <div>
      <div className="font-mono text-[13px] tracking-[0.08em] text-mute uppercase">{eyebrow}</div>
      <div className="mt-[28px] text-[20px] text-cream">{side?.company && side.status === "completed" ? side.company : h}</div>
      <div className="mt-[12px] flex items-center gap-[8px] font-mono text-[12.5px] text-cream">
        <img src={side?.favicon || `https://www.google.com/s2/favicons?domain=${h}&sz=32`} alt="" className="h-[13px] w-[13px] rounded-[2px]" />
        {h}
      </div>
      <div className="mt-[16px] rounded-[2px] border border-[#2c2c2b] bg-black p-[12px]">
        <div className="relative aspect-[586/396] overflow-hidden bg-cream">
          {side?.hero ? (
            <img src={side.hero} alt={h} className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="spin h-[18px] w-[18px] rounded-full border-[1.5px] border-[#9a9c98]/40 border-t-[#5c5e5a]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SwatchList({ colors }: { colors: Color[] }) {
  return (
    <div className="space-y-[34px]">
      {colors.slice(0, 5).map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_142px] gap-[16px]">
          <div>
            <div className="text-[15px] text-cream">{c.name}</div>
            <p className="mt-[12px] text-[11.5px] leading-[1.5] text-dim">{c.description}</p>
          </div>
          <div>
            <div className="font-mono text-[10px] text-dim">{c.hex} / base / 100%</div>
            <div className="mt-[8px] h-[24px] rounded-[2px] border border-white/5" style={{ background: c.hex }} />
            <div className="mt-[10px] space-y-[8px]">
              {c.shades?.slice(0, 4).map((s) => (
                <div key={s} className="flex items-center gap-[10px]">
                  <span className="h-[18px] w-[18px] rounded-[2px] border border-white/5" style={{ background: s }} />
                  <span className="font-mono text-[9.5px] leading-tight text-dim">
                    {s}
                    <br />
                    <span className="text-mute">{s}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryBody({ k, brand }: { k: string; brand: Partial<BrandSystem> }) {
  switch (k) {
    case "colors":
      return brand.colors ? <SwatchList colors={[...brand.colors.baseline, ...brand.colors.secondary]} /> : null;
    case "typography":
      return brand.typography ? (
        <div className="space-y-[26px]">
          {[...brand.typography.titles.slice(0, 2), ...brand.typography.body.slice(0, 2), ...brand.typography.labels.slice(0, 1)].map((t, i) => (
            <div key={i} className="border-b border-[#2c2c2b] pb-[18px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] text-cream">{t.family}</div>
                  <div className="mt-[4px] text-[11.5px] text-dim">{t.role}</div>
                </div>
                <div className="grid grid-cols-3 gap-[18px] text-[11px]">
                  {[[t.size, "size"], [t.weight, "weight"], [t.lineHeight, "line height"]].map(([v, l]) => (
                    <div key={l}>
                      <div className="text-cream">{v}</div>
                      <div className="text-mute">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-[14px] text-[11px] text-mute">code in css</div>
              <div className="mt-[6px] font-mono text-[11px] text-dim">{t.stack}</div>
            </div>
          ))}
        </div>
      ) : null;
    case "layout":
      return brand.layout ? (
        <div className="space-y-[16px] text-[12.5px] text-dim">
          <div className="flex flex-wrap gap-2">{brand.layout.classification.map((c) => <span key={c} className="chip">{c}</span>)}</div>
          {brand.layout.breakpoints.map((b) => (
            <div key={b.name + b.range} className="flex justify-between border-b border-[#2c2c2b] pb-[10px]">
              <span className="text-cream">{b.name}</span>
              <span>{b.range}</span>
            </div>
          ))}
          <div className="flex justify-between"><span className="text-cream">Grid</span><span>{brand.layout.grid.columns} cols · {brand.layout.grid.gutter} · {brand.layout.grid.maxWidth}</span></div>
          {brand.layout.sectionSeparation && <p className="text-[11.5px] leading-[1.5]">{brand.layout.sectionSeparation}</p>}
        </div>
      ) : null;
    case "surfaces":
      return brand.surfaces ? (
        <div className="space-y-[18px]">
          <div className="flex flex-wrap gap-2">{brand.surfaces.textures.map((t) => <span key={t} className="chip">{t}</span>)}</div>
          {brand.surfaces.solids.slice(0, 6).map((s) => (
            <div key={s.hex + s.name} className="grid grid-cols-[1fr_142px] gap-4">
              <div>
                <div className="text-[14px] text-cream">{s.name}</div>
                <p className="mt-1 text-[11.5px] text-dim">{s.description}</p>
              </div>
              <div>
                <div className="font-mono text-[10px] text-dim">{s.hex}</div>
                <div className="mt-[6px] h-[24px] rounded-[2px] border border-white/5" style={{ background: s.hex }} />
              </div>
            </div>
          ))}
        </div>
      ) : null;
    case "elevation":
      return brand.elevation ? (
        <div className="space-y-[14px]">
          {[...brand.elevation.shadows.map((s) => s.css), ...brand.elevation.borders.map((b) => b.css)].slice(0, 10).map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_142px] items-center gap-4">
              <span className="font-mono text-[11px] text-dim">{c}</span>
              <span className="h-[24px] rounded-[2px] bg-[#232322]" style={c.includes("px") && c.includes("solid") ? { border: c } : { boxShadow: c }} />
            </div>
          ))}
        </div>
      ) : null;
    case "visual":
      return brand.identity ? (
        <div className="space-y-[14px]">
          <p className="text-[14px] leading-[1.45] text-cream">{brand.identity.summary}</p>
          <div className="flex flex-wrap gap-2">{brand.identity.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
          <p className="text-[11.5px] leading-[1.5] text-dim">{brand.identity.accentStrategy}</p>
        </div>
      ) : null;
    case "spatial":
      return brand.layout ? (
        <div className="space-y-[12px] text-[12px] text-dim">
          {brand.layout.insights.slice(0, 4).map((t, i) => (
            <p key={i} className="leading-[1.5]">{t}</p>
          ))}
          {!brand.layout.insights.length && <p>{brand.layout.sectionSeparation}</p>}
        </div>
      ) : null;
  }
  return null;
}

function Category({ cat, label, k, data }: { cat?: AdherenceCategory; label: string; k: string; data: AdherenceData }) {
  const refB = data.reference?.brand;
  const desB = data.design?.brand;
  const waiting = data.status !== "completed";
  return (
    <section id={`cat-${k}`} data-cat={k} className="scroll-mt-6">
      <div className="inline-flex h-[44px] items-center gap-[14px] rounded-[6px] bg-[#1c1c1c] px-[15px] text-[18px] text-dim">
        {label}
        <span className="h-[18px] w-px bg-[#3a3a39]" />
        <span className={cat ? scoreColor(cat.score) : ""}>{cat ? cat.score : "—"}</span>
      </div>
      {waiting && !(refB && desB) ? (
        <div className="mt-[22px] rounded-[2px] bg-[#1c1c1c] px-[30px] py-[24px] font-mono text-[12px] text-dim">{data.status === "failed" ? `Failed: ${data.error}` : "Extracting both pages…"}</div>
      ) : (
        <div className="mt-[22px] rounded-[2px] bg-[#1c1c1c]">
          <div className="grid grid-cols-2">
            <div className="border-r border-[#2c2c2b] px-[30px] py-[26px]">
              <div className="mb-[18px] font-mono text-[11px] tracking-[0.08em] text-mute uppercase">Reference brand</div>
              {refB ? <CategoryBody k={k} brand={refB} /> : <p className="font-mono text-[12px] text-dim">Waiting for {label}…</p>}
            </div>
            <div className="px-[30px] py-[26px]">
              <div className="mb-[18px] font-mono text-[11px] tracking-[0.08em] text-mute uppercase">Page you built</div>
              {desB ? <CategoryBody k={k} brand={desB} /> : <p className="font-mono text-[12px] text-dim">Waiting for {label}…</p>}
            </div>
          </div>
          {cat && (
            <div className="border-t border-[#2c2c2b] px-[30px] py-[24px]">
              <p className="text-[14px] text-cream">{cat.verdict}</p>
              <div className="mt-[16px] grid grid-cols-3 gap-[24px] text-[12px]">
                {[
                  ["Matches", cat.matches, "text-ok"],
                  ["Deviations", cat.deviations, "text-bad"],
                  ["Fixes for your agent", cat.fixes, "text-cream"],
                ].map(([t, items, cls]) => (
                  <div key={t as string}>
                    <div className={`mb-[8px] font-mono text-[10.5px] tracking-[0.08em] uppercase ${cls}`}>{t as string}</div>
                    <ul className="space-y-[6px] text-dim">
                      {(items as string[]).length ? (items as string[]).map((x, i) => <li key={i}>• {x}</li>) : <li className="text-mute">—</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function AdherenceView({ initial }: { initial: AdherenceData }) {
  const [data, setData] = useState(initial);
  const [active, setActive] = useState("overall");
  const [toast, setToast] = useState("");
  const running = data.status === "queued" || data.status === "running";

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/v1/adherence/${data.id}?include=sides`, { cache: "no-store" });
      if (r.ok) setData(await r.json());
    }, 2500);
    return () => clearInterval(t);
  }, [running, data.id]);

  useEffect(() => {
    const panel = document.getElementById("panel");
    if (!panel) return;
    const on = () => {
      let cur = "overall";
      for (const s of Array.from(document.querySelectorAll<HTMLElement>("[data-cat]"))) if (s.getBoundingClientRect().top < 220) cur = s.dataset.cat!;
      setActive(cur);
    };
    panel.addEventListener("scroll", on, { passive: true });
    return () => panel.removeEventListener("scroll", on);
  }, []);

  const report = data.report;
  const statusLine = running
    ? data.reference?.status === "completed" && data.design?.status === "completed"
      ? "Both pages extracted. Scoring adherence…"
      : "Extracting both pages. Results stream in as they land."
    : data.status === "failed"
      ? `Verification failed: ${data.error}`
      : `Verified ${host(data.design_url)} against ${host(data.reference_url)}.`;

  return (
    <div className="relative px-[24px] pt-[14px] pb-[40px]">
      <div className="flex items-center justify-between">
        <Link href="/app/adherence" aria-label="Back" className="text-cream hover:opacity-70">
          <ArrowLeft />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.href).catch(() => {});
            setToast("Link copied");
            setTimeout(() => setToast(""), 2000);
          }}
          className="flex h-[32px] items-center gap-[7px] rounded-[4px] border border-cream/90 px-[21px] text-[15px] text-cream hover:bg-cream hover:text-ink"
        >
          <ShareIcon /> Share
        </button>
      </div>
      <div className="mt-[44px] flex gap-[46px]">
        <nav className="sticky top-[20px] ml-[18px] w-[166px] shrink-0 self-start">
          {NAV.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => document.getElementById(`cat-${n.key}`)?.scrollIntoView({ behavior: "smooth" })}
              className={`mb-[6px] block h-[34px] w-full rounded-[4px] px-[12px] text-left text-[13.5px] transition-colors ${active === n.key ? "bg-[#1f1f1f] text-cream" : "text-dim hover:text-cream"}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 space-y-[48px] pr-[36px]">
          <section id="cat-overall" data-cat="overall" className="pt-[6px] pb-[16px]">
            <div className="flex h-[38px] items-center gap-[12px] rounded-[2px] bg-[#1c1c1c] px-[16px] font-mono text-[12px] text-cream">
              <span className={`h-[7px] w-[7px] rounded-full ${running ? "pulse-dot bg-warn" : data.status === "failed" ? "bg-bad" : "bg-ok"}`} />
              {statusLine}
            </div>
            <div className="mt-[52px] grid grid-cols-2 gap-[64px] px-[30px]">
              <SideHeader eyebrow="Reference brand" side={data.reference} url={data.reference_url} />
              <SideHeader eyebrow="Page you built" side={data.design} url={data.design_url} />
            </div>
            {report && (
              <div className="animate-in mt-[40px] rounded-[2px] bg-[#1c1c1c] px-[30px] py-[28px]">
                <div className="flex items-start gap-[40px]">
                  <div>
                    <div className="font-mono text-[11px] tracking-[0.08em] text-mute uppercase">Overall adherence</div>
                    <div className={`mt-[10px] text-[64px] leading-none ${scoreColor(report.overall.score)}`}>
                      {report.overall.score}
                      <span className="ml-2 text-[22px] text-dim">/100 · {report.overall.grade}</span>
                    </div>
                  </div>
                  <p className="mt-[24px] max-w-[640px] text-[14px] leading-[1.55] text-dim">{report.overall.summary}</p>
                </div>
                <div className="mt-[28px] grid grid-cols-7 gap-[12px]">
                  {report.categories.map((c) => (
                    <div key={c.key}>
                      <div className="text-[11.5px] text-dim">{c.label}</div>
                      <div className="mt-[8px] h-[4px] rounded-full bg-[#2c2c2b]">
                        <div className={`h-full rounded-full ${c.score >= 85 ? "bg-ok" : c.score >= 65 ? "bg-warn" : "bg-bad"}`} style={{ width: `${c.score}%` }} />
                      </div>
                      <div className="mt-[6px] text-[13px] text-cream">{c.score}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-[28px] font-mono text-[11px] tracking-[0.08em] text-mute uppercase">Instructions for your agent loop</div>
                <CodeBlock className="mt-[10px] max-h-[320px] overflow-y-auto" code={report.agentInstructions} plain />
              </div>
            )}
          </section>
          {NAV.slice(1).map((n) => (
            <Category key={n.key} k={n.key} label={n.label} cat={report?.categories.find((c) => c.key === n.key)} data={data} />
          ))}
        </div>
      </div>
      {toast && <div className="animate-in fixed right-8 bottom-8 z-50 rounded-[6px] bg-cream px-4 py-2.5 text-[13px] text-ink">{toast}</div>}
    </div>
  );
}
