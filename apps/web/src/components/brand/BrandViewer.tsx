"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BrandSystem } from "@onbrand/core/types";
import { ArrowLeft, ShareIcon } from "../ui/icons";
import { Coverflow } from "../Coverflow";
import * as S from "./Sections";

export type ViewerData = {
  id: string;
  status: string;
  url: string;
  createdAt: string;
  error: string | null;
  stages: { key: string; label: string; status: string }[];
  brand: Partial<BrandSystem> | null;
  artifacts: { screenshot: string | null; html: string | null; css: string | null };
};

const NAV: ({ key: string; label: string } | "divider")[] = [
  { key: "overview", label: "Overview" },
  { key: "identity", label: "Brand Identity" },
  { key: "prompt", label: "Prompt Enhancer" },
  "divider",
  { key: "colors", label: "Colours" },
  { key: "typography", label: "Typography" },
  { key: "surfaces", label: "Surfaces" },
  { key: "layout", label: "Layout" },
  { key: "elevation", label: "Elevation" },
  { key: "interactions", label: "Interactions" },
  { key: "structure", label: "Structure" },
  { key: "dataDisplay", label: "Data Display" },
  { key: "motion", label: "Motion Design" },
  { key: "navigation", label: "Navigation" },
  { key: "icons", label: "Icons" },
  { key: "sections", label: "Page Sections" },
  { key: "media", label: "Media" },
];

export function BrandViewer({ initial, shared = false, backHref = "/app/extract" }: { initial: ViewerData; shared?: boolean; backHref?: string }) {
  const [data, setData] = useState(initial);
  const [active, setActive] = useState("overview");
  const [toast, setToast] = useState("");
  const [atTop, setAtTop] = useState(true);
  const running = data.status === "queued" || data.status === "running";

  useEffect(() => {
    if (!running || shared) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/v1/extract/${data.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      setData({ id: j.id, status: j.status, url: j.url, createdAt: j.created_at, error: j.error, stages: j.stages, brand: j.brand, artifacts: j.artifacts });
    }, 2000);
    return () => clearInterval(t);
  }, [running, data.id, shared]);

  useEffect(() => {
    const panel = document.getElementById("panel") ?? window;
    const onScroll = () => {
      const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
      let cur = "overview";
      for (const s of secs) if (s.getBoundingClientRect().top < 180) cur = s.dataset.section!;
      setActive(cur);
      setAtTop((panel instanceof HTMLElement ? panel.scrollTop : window.scrollY) < 8);
    };
    panel.addEventListener("scroll", onScroll, { passive: true });
    return () => panel.removeEventListener("scroll", onScroll);
  }, []);

  const go = useCallback((key: string) => {
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(key);
  }, []);

  async function share() {
    const res = await fetch(`/api/v1/extract/${data.id}/share`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (j.url) {
      await navigator.clipboard.writeText(j.url).catch(() => {});
      setToast("Share link copied");
      setTimeout(() => setToast(""), 2200);
    }
  }

  const b = data.brand ?? {};
  const failed = data.status === "failed";
  const pendingLabel = failed ? `Extraction failed: ${data.error ?? "unknown error"}` : "Extracting…";
  const sec = (has: unknown, node: React.ReactNode) => (has ? node : <S.Pending label={pendingLabel} />);
  const artifacts = useMemo(
    () => [
      { name: "Source HTML", type: "text/html", url: data.artifacts.html },
      { name: "Styles CSS", type: "text/css", url: data.artifacts.css },
      { name: "Full Page Screenshot", type: "image/jpeg", url: data.artifacts.screenshot },
    ],
    [data.artifacts],
  );

  return (
    <div className={`relative flex flex-col pr-[18px] pl-[17px] ${atTop ? "pt-[12px]" : ""} ${shared ? "h-[calc(100vh-72px)]" : "h-full"}`}>
      <div className="flex h-[40px] shrink-0 items-center justify-between">
        {shared ? <span /> : (
          <Link href={backHref} aria-label="Back" className="pl-[15px] text-cream transition-opacity hover:opacity-70">
            <ArrowLeft />
          </Link>
        )}
        {!shared && (
          <button type="button" onClick={share} className="flex h-[32px] items-center gap-[7px] rounded-[4px] border border-cream/90 px-[21px] text-[15px] text-cream transition-colors hover:bg-cream hover:text-ink">
            <ShareIcon /> Share
          </button>
        )}
      </div>
      <div className="mt-[10px] flex min-h-0 flex-1 items-stretch gap-[10px]">
        <nav className={`w-[191px] shrink-0 overflow-y-auto rounded-t-[2px] bg-[#222222] px-[12px] pb-[24px] ${atTop ? "pt-[18px]" : "pt-0"}`}>
          {NAV.map((n, i) =>
            n === "divider" ? (
              <div key={i} className="mx-[12px] mt-[15px] mb-[21px] h-px w-[136px] bg-[#3a3a39]" />
            ) : (
              <button
                key={n.key}
                type="button"
                onClick={() => go(n.key)}
                className={`mb-[6px] block h-[34px] w-full rounded-[4px] px-[12px] text-left text-[14px] transition-colors ${active === n.key ? "bg-[#2c2c2b] text-cream" : "text-dim hover:text-cream"}`}
              >
                {n.label}
              </button>
            ),
          )}
        </nav>
        <div id="panel" className="min-w-0 flex-1 space-y-[10px] overflow-y-auto pb-[18px]">
          {running && (
            <div className="flex items-center gap-[12px] rounded-[2px] bg-[#222] px-[21px] py-[14px] font-mono text-[12px] text-dim">
              <span className="pulse-dot h-[7px] w-[7px] rounded-full bg-warn" />
              {data.stages.find((s) => s.status === "running")?.label ?? "Queued"} — results stream in as they land.
              <span className="ml-auto text-mute">
                {data.stages.filter((s) => s.status === "done").length}/{data.stages.length}
              </span>
            </div>
          )}
          <S.OverviewSection
            brand={b}
            url={data.url}
            status={data.status}
            createdAt={data.createdAt}
            artifacts={artifacts}
            screenshot={data.artifacts.screenshot}
            loader={running ? <Coverflow scale={0.95} /> : <span className="font-mono text-[12px] text-mute">{failed ? data.error : "No screenshot"}</span>}
            downloadAll={shared ? undefined : `/api/v1/extract/${data.id}/bundle`}
          />
          <S.Panel id="identity" title="Brand Identity">{sec(b.identity, <S.IdentitySection brand={b} />)}</S.Panel>
          {!shared && (
            <S.Panel id="prompt" title="Prompt Enhancer">
              <S.PromptEnhancer extractionId={data.id} ready={data.status === "completed"} />
            </S.Panel>
          )}
          <S.Panel id="colors" title="Colours">{sec(b.colors, <S.ColorsSection brand={b} />)}</S.Panel>
          <S.Panel id="typography" title="Typography">{sec(b.typography, <S.TypographySection brand={b} />)}</S.Panel>
          <S.Panel id="surfaces" title="Surfaces">{sec(b.surfaces, <S.SurfacesSection brand={b} />)}</S.Panel>
          <div className="grid grid-cols-2 items-start gap-[10px]">
            <S.Panel id="layout" title="Layout">{sec(b.layout, <S.LayoutSection brand={b} />)}</S.Panel>
            <S.Panel id="elevation" title="Elevation">{sec(b.elevation, <S.ElevationSection brand={b} />)}</S.Panel>
          </div>
          <S.Panel id="interactions" title="Interactions">{sec(b.interactions, <S.InteractionsSection brand={b} />)}</S.Panel>
          <div className="grid grid-cols-2 items-start gap-[10px]">
            <S.Panel id="structure" title="Structure">{sec(b.structure, <S.StructureSection brand={b} />)}</S.Panel>
            <S.Panel id="dataDisplay" title="Data Display">{sec(b.dataDisplay, <S.DataDisplaySection brand={b} />)}</S.Panel>
          </div>
          <S.Panel id="motion" title="Motion Design">{sec(b.motion, <S.MotionSection brand={b} />)}</S.Panel>
          <div className="grid grid-cols-2 items-start gap-[10px]">
            <S.Panel id="navigation" title="Navigation">{sec(b.navigation, <S.NavigationSection brand={b} />)}</S.Panel>
            <S.Panel id="icons" title="Icons">{sec(b.icons, <S.IconsSection brand={b} />)}</S.Panel>
          </div>
          <S.Panel id="sections" title="Page Sections">{sec(b.sections, <S.PageSectionsSection brand={b} />)}</S.Panel>
          <S.Panel id="media" title="Media">{sec(b.media, <S.MediaSection brand={b} />)}</S.Panel>
        </div>
      </div>
      {toast && <div className="animate-in fixed right-8 bottom-8 z-50 rounded-[6px] bg-cream px-4 py-2.5 text-[13px] text-ink shadow-xl">{toast}</div>}
    </div>
  );
}
