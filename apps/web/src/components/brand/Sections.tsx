"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { BrandSystem, Color, TypeStyle } from "@onbrand/core/types";
import { DownloadIcon, LinkIcon, Sparkle } from "../ui/icons";
import { CodeBlock } from "../ui/CodeBlock";

// ---------- primitives ----------

export function Panel({ id, title, children, className = "" }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={`sec-${id}`} data-section={id} className={`scroll-mt-0 rounded-[2px] bg-[#222222] px-[21px] pt-[20px] pb-[28px] ${className}`}>
      <h2 className="text-[33px] leading-none tracking-[-0.01em] text-cream">{title}</h2>
      <div className="mt-[30px]">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow mb-[14px] ${className}`}>{children}</div>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[8px] bg-[#171717] px-[16px] py-[18px] ${className}`}>{children}</div>;
}

export function Chips({ items, className = "" }: { items?: string[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <div className={`flex flex-wrap gap-[8px] ${className}`}>
      {items.filter(Boolean).map((t, i) => (
        <span key={i} className="chip">
          {t}
        </span>
      ))}
    </div>
  );
}

export function Pills({ items, filled = false }: { items?: string[]; filled?: boolean }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-[8px]">
      {items.map((t, i) => (
        <span key={i} className={filled ? "inline-flex h-[32px] items-center rounded-full bg-[#2c2c2b] px-[15px] text-[12.5px] text-cream" : "inline-flex h-[30px] items-center rounded-full border border-[#4a4a49] px-[10px] text-[12px] text-dim"}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[12px] text-dim ${className}`}>{children}</div>;
}

export function Pending({ label = "Extracting…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] bg-[#1b1b1b] px-5 py-6 font-mono text-[12px] text-dim">
      <span className="pulse-dot h-[7px] w-[7px] rounded-full bg-warn" />
      {label}
    </div>
  );
}

function Empty({ text = "Nothing observed on this page." }: { text?: string }) {
  return <p className="font-mono text-[12px] text-mute">{text}</p>;
}

function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

// ---------- Overview ----------

export type Artifact = { name: string; type: string; url: string | null };

export function OverviewSection({
  brand,
  url,
  status,
  createdAt,
  artifacts,
  screenshot,
  loader,
  downloadAll,
}: {
  brand?: Partial<BrandSystem> | null;
  url: string;
  status: string;
  createdAt: string;
  artifacts: Artifact[];
  screenshot: string | null;
  loader?: React.ReactNode;
  downloadAll?: string;
}) {
  const id = brand?.identity;
  const statusCls = status === "completed" ? "bg-[#17331f] text-ok" : status === "failed" ? "bg-[#3a1717] text-bad" : "bg-[#3a3017] text-warn";
  return (
    <section id="sec-overview" data-section="overview" className="scroll-mt-4 rounded-[2px] bg-[#222222] px-[21px] pt-[20px] pb-[24px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] text-cream">Overview</h2>
        <span className={`rounded-[4px] px-[10px] py-[5px] text-[12px] capitalize ${statusCls}`}>{status === "running" || status === "queued" ? "Extracting" : status}</span>
      </div>
      <div className="px-[3px]">
        <h3 className="mt-[20px] text-[32px] leading-none text-cream">{id?.companyName || new URL(url).hostname.replace(/^www\./, "")}</h3>
        <div className="mt-[12px] font-mono text-[15px] text-dim">{url}</div>
        {id?.pageTags?.length ? (
          <div className="mt-[18px] flex flex-wrap gap-[8px]">
            {id.pageTags.map((t) => (
              <span key={t} className="inline-flex h-[34px] items-center rounded-[4px] border border-[#4a4a49] px-[12px] text-[13px] text-dim">
                {t}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-[20px] h-px bg-[#333]" />
        <dl className="mt-[24px] space-y-[22px] text-[14px]">
          {id?.purpose ? (
            <div className="flex gap-[18px]">
              <dt className="shrink-0 text-cream">Purpose</dt>
              <dd className="text-dim">{id.purpose}</dd>
            </div>
          ) : null}
          {id?.mainCta ? (
            <div className="flex gap-[18px]">
              <dt className="shrink-0 text-cream">Main CTA</dt>
              <dd className="text-dim">{id.mainCta}</dd>
            </div>
          ) : null}
          <div className="flex gap-[18px]">
            <dt className="shrink-0 text-cream">Extraction</dt>
            <dd className="text-dim">{new Date(createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</dd>
          </div>
        </dl>
        <div className="mt-[24px] h-px bg-[#333]" />
        <div className="mt-[20px] flex items-center justify-between">
          <span className="eyebrow">Artifacts ({artifacts.filter((a) => a.url).length})</span>
          {downloadAll && (
            <a href={downloadAll} className="inline-flex h-[36px] items-center gap-[7px] rounded-[4px] bg-cream px-[14px] text-[12px] font-medium text-ink transition-opacity hover:opacity-85">
              <DownloadIcon /> Download All
            </a>
          )}
        </div>
        <div className="mt-[16px] grid grid-cols-3 gap-[12px] max-md:grid-cols-1">
          {artifacts.map((a) => (
            <a key={a.name} href={a.url ? `${a.url}?download=1` : undefined} className={`flex items-center justify-between rounded-[4px] bg-[#1c1c1c] px-[12px] py-[13px] ${a.url ? "hover:bg-[#262626]" : "opacity-50"}`}>
              <div>
                <div className="text-[13px] text-cream">{a.name}</div>
                <div className="mt-[3px] text-[10.5px] text-dim">{a.type}</div>
              </div>
              <DownloadIcon className="text-dim" />
            </a>
          ))}
        </div>
        <div className="mt-[22px] overflow-hidden rounded-[14px] bg-black p-[12px]">
          <div className="relative max-h-[760px] overflow-y-auto rounded-[8px] bg-[#111]">
            {screenshot ? <img src={screenshot} alt="Full page screenshot" className="block w-full" /> : <div className="flex h-[520px] items-center justify-center">{loader}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Brand identity ----------

export function IdentitySection({ brand }: { brand: Partial<BrandSystem> }) {
  const id = brand.identity;
  if (!id) return <Pending />;
  return (
    <>
      <Eyebrow>Brand Identity</Eyebrow>
      <p className="text-[21px] leading-[1.3] text-cream">{id.summary}</p>
      <div className="mt-[28px] grid grid-cols-[1fr_auto] gap-10">
        <div>
          <Eyebrow>Keywords</Eyebrow>
          <Pills items={id.keywords} />
        </div>
        <div className="w-[540px] max-w-full">
          <Eyebrow>Copy Tone</Eyebrow>
          <Pills items={id.copyTone} />
        </div>
      </div>
      {(id.visualHighlights || id.accentStrategy) && (
        <div className="mt-[30px] rounded-[8px] bg-[#1c1c1c] px-[22px] py-[22px]">
          {id.visualHighlights && (
            <>
              <Eyebrow className="text-mute">Visual Highlights</Eyebrow>
              <p className="text-[13.5px] leading-[1.5] text-[#c9cbc7]">{id.visualHighlights}</p>
            </>
          )}
          {id.accentStrategy && (
            <>
              <Eyebrow className="mt-[22px] text-mute">Accent Strategy</Eyebrow>
              <p className="text-[13.5px] leading-[1.5] text-[#c9cbc7]">{id.accentStrategy}</p>
            </>
          )}
        </div>
      )}
      {id.targetAudience?.length ? (
        <>
          <Eyebrow className="mt-[34px] text-mute">Target Audience</Eyebrow>
          <ul className="space-y-[12px]">
            {id.targetAudience.map((t, i) => (
              <li key={i} className="border-l-2 border-[#4a4a49] pl-[13px] text-[13.5px] text-[#c9cbc7]">
                {t}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {id.executiveSynthesis && (
        <>
          <div className="my-[30px] h-px bg-[#3a3a39]" />
          <Eyebrow>Executive Synthesis</Eyebrow>
          <p className="text-[15px] leading-[1.6] text-dim">{id.executiveSynthesis}</p>
        </>
      )}
      <Eyebrow className="mt-[36px]">Style Classification</Eyebrow>
      <div className="grid grid-cols-2 gap-[20px] max-md:grid-cols-1">
        {[
          ["Primary Style", id.primaryStyle],
          ["Secondary Style", id.secondaryStyle],
        ].map(([label, st]) => {
          const s = st as { name: string; rationale: string } | undefined;
          return (
            <div key={label as string} className="rounded-[8px] bg-[#1c1c1c] px-[20px] py-[24px]">
              <div className="eyebrow text-[10.5px] text-dim">{label as string}</div>
              <div className="mt-[16px] text-[15px] text-cream">{s?.name}</div>
              {s?.rationale && <p className="mt-[12px] text-[12px] leading-[1.55] text-mute">{s.rationale}</p>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------- Prompt enhancer ----------

export function PromptEnhancer({ extractionId, ready }: { extractionId: string; ready: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function run() {
    if (!prompt.trim()) return;
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/v1/extract/${extractionId}/enhance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j?.error?.message ?? "Could not enhance prompt");
    setOut(j.prompt);
  }
  return (
    <>
      <span className="inline-flex h-[24px] items-center rounded-[3px] bg-[#2a2a2a] px-[9px] font-mono text-[9.5px] tracking-[0.06em] text-dim uppercase">Golden Prompt</span>
      <p className="mt-[14px] text-[13px] text-dim">Enter a design prompt and enhance it using this brand&apos;s guidelines. Perfect for senior designers creating detailed briefs.</p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., Create a modern landing page with hero, features, and pricing sections..."
        className="mt-[12px] h-[122px] w-full resize-none rounded-[4px] border border-[#2c2c2b] bg-[#1c1c1c] px-[18px] py-[16px] text-[13px] text-cream outline-none placeholder:text-mute focus:border-[#4a4a49]"
      />
      <button
        type="button"
        onClick={run}
        disabled={!ready || busy || !prompt.trim()}
        className="mt-[10px] flex h-[36px] w-full items-center justify-center gap-[8px] rounded-[4px] bg-[#2c2c2b] text-[13px] text-cream transition-colors enabled:hover:bg-cream enabled:hover:text-ink disabled:text-mute"
      >
        <Sparkle /> {busy ? "Enhancing…" : "Enhance Prompt"}
      </button>
      {err && <p className="mt-3 text-[12px] text-bad">{err}</p>}
      {out && <CodeBlock className="mt-[16px] max-h-[460px] overflow-y-auto !text-[12px]" code={out} plain />}
    </>
  );
}

// ---------- Colours ----------

function ColorCard({ c }: { c: Color }) {
  const shades = (c.shades ?? []).slice(0, 4);
  return (
    <Card className="px-[16px] pt-[14px] pb-[16px]">
      <div className="flex items-start gap-[13px]">
        <span className="h-[46px] w-[46px] shrink-0 rounded-[6px] border border-white/5" style={{ background: c.hex }} />
        <div>
          <div className="flex items-center gap-[10px]">
            <span className="text-[15px] text-dim">{c.name}</span>
            <span className="rounded-[3px] bg-[#2a2a2a] px-[7px] py-[2px] text-[10.5px] text-dim">{c.tone}</span>
          </div>
          <div className="mt-[6px] text-[12px] text-cream">{c.hex}</div>
        </div>
      </div>
      <p className="mt-[12px] text-[13px] text-dim">{c.description}</p>
      {shades.length > 0 && (
        <div className="mt-[14px] grid gap-[8px]" style={{ gridTemplateColumns: `repeat(${shades.length}, minmax(0, 1fr))` }}>
          {shades.map((s, i) => (
            <div key={i} title={s} className="group relative h-[38px] rounded-[4px] border border-white/5" style={{ background: s }}>
              <span className={`absolute bottom-1 left-2 font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-100 ${isLight(s) ? "text-ink" : "text-cream"}`}>{s}</span>
            </div>
          ))}
        </div>
      )}
      <Chips className="mt-[14px]" items={c.usage} />
    </Card>
  );
}

export function ColorsSection({ brand }: { brand: Partial<BrandSystem> }) {
  const c = brand.colors;
  if (!c) return <Pending />;
  const groups: [string, Color[]][] = [
    ["Baseline", c.baseline],
    ["Secondary", c.secondary],
    ["Others", c.others],
  ];
  return (
    <>
      {groups.map(([label, list]) =>
        list?.length ? (
          <div key={label} className="mb-[26px]">
            <Eyebrow>{label}</Eyebrow>
            <div className="space-y-[12px]">
              {list.map((col, i) => (
                <ColorCard key={i} c={col} />
              ))}
            </div>
          </div>
        ) : null,
      )}
      {c.notes?.length ? (
        <div className="space-y-2">
          {c.notes.map((n, i) => (
            <p key={i} className="text-[13px] text-dim">
              {n}
            </p>
          ))}
        </div>
      ) : null}
    </>
  );
}

// ---------- Typography ----------

function TypeCard({ t, fonts }: { t: TypeStyle; fonts?: BrandSystem["typography"]["families"] }) {
  const dl = fonts?.find((f) => f.family.toLowerCase() === t.family.toLowerCase())?.downloadUrl;
  return (
    <Card className="px-[16px] pt-[22px] pb-[18px]">
      <div className="text-[15px] text-dim">{t.family}</div>
      <div className="mt-[4px] text-[12px] text-mute">{t.role}</div>
      <div className="mt-[16px] grid grid-cols-3 gap-4">
        {[
          ["Size", t.size],
          ["Weight", t.weight],
          ["Line Height", t.lineHeight],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-[11px] text-mute">{k}</div>
            <div className="mt-[8px] text-[14px] text-[#c9cbc7]">{v}</div>
          </div>
        ))}
      </div>
      {(t.letterSpacing && t.letterSpacing !== "normal") || (t.textTransform && t.textTransform !== "none") ? (
        <div className="mt-[12px] flex gap-6 text-[11.5px] text-mute">
          {t.letterSpacing && t.letterSpacing !== "normal" && <span>Letter spacing {t.letterSpacing}</span>}
          {t.textTransform && t.textTransform !== "none" && <span>Transform {t.textTransform}</span>}
        </div>
      ) : null}
      <div className="mt-[14px] text-[11px] text-mute">Font Stack</div>
      <div className="mt-[8px] rounded-[4px] bg-[#222] px-[12px] py-[11px] font-mono text-[12px] text-dim">{t.stack}</div>
      {dl ? (
        <a href={dl} target="_blank" rel="noreferrer" className="mt-[14px] inline-flex items-center gap-[7px] text-[12.5px] text-dim hover:text-cream">
          <DownloadIcon /> Download Font
        </a>
      ) : null}
    </Card>
  );
}

export function TypographySection({ brand }: { brand: Partial<BrandSystem> }) {
  const t = brand.typography;
  if (!t) return <Pending />;
  const groups: [string, TypeStyle[]][] = [
    ["Titles", t.titles],
    ["Body", t.body],
    ["Labels", t.labels],
    ["Others", t.others],
  ];
  return (
    <>
      {t.summary && <p className="-mt-[14px] mb-[22px] text-[13px] text-dim">{t.summary}</p>}
      {groups.map(([label, list]) =>
        list?.length ? (
          <div key={label} className="mb-[26px]">
            <Eyebrow>{label}</Eyebrow>
            <div className="space-y-[12px]">
              {list.map((s, i) => (
                <TypeCard key={i} t={s} fonts={t.families} />
              ))}
            </div>
          </div>
        ) : null,
      )}
      {t.notes?.length ? (
        <div className="space-y-2 font-mono text-[11.5px] leading-[1.5] text-mute">
          {t.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

// ---------- Surfaces ----------

export function SurfacesSection({ brand }: { brand: Partial<BrandSystem> }) {
  const s = brand.surfaces;
  if (!s) return <Pending />;
  return (
    <>
      <Eyebrow>Texture Style</Eyebrow>
      <Pills filled items={s.textures} />
      <Eyebrow className="mt-[30px]">Solid Colors</Eyebrow>
      <div className="space-y-[12px]">
        {s.solids?.map((x, i) => (
          <Card key={i} className="flex gap-[13px] px-[16px] py-[16px]">
            <span className="h-[40px] w-[40px] shrink-0 rounded-[6px] border border-white/5" style={{ background: x.hex }} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between">
                <span className="text-[15px] text-dim">{x.name}</span>
                <span className="font-mono text-[12px] text-cream">{x.hex}</span>
              </div>
              <p className="mt-[8px] text-[13px] text-dim">{x.description}</p>
              <Chips className="mt-[14px]" items={x.usage} />
            </div>
          </Card>
        ))}
      </div>
      {s.gradients?.length ? (
        <>
          <Eyebrow className="mt-[30px]">Gradients</Eyebrow>
          <div className="space-y-[12px]">
            {s.gradients.map((g, i) => (
              <Card key={i} className="flex gap-[13px]">
                <span className="h-[40px] w-[160px] shrink-0 rounded-[6px] border border-white/5" style={{ background: g.css }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] text-dim">{g.name}</div>
                  <p className="mt-[6px] text-[13px] text-dim">{g.description}</p>
                  <Mono className="mt-[8px] truncate">{g.css}</Mono>
                  <Chips className="mt-[10px]" items={g.usage} />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

// ---------- Layout ----------

export function LayoutSection({ brand }: { brand: Partial<BrandSystem> }) {
  const l = brand.layout;
  if (!l) return <Pending />;
  return (
    <>
      <Card className="px-[16px] pt-[18px] pb-[6px]">
        <Eyebrow>Classification</Eyebrow>
        <Pills filled items={l.classification} />
        <Eyebrow className="mt-[18px]">Grid</Eyebrow>
        {[
          ["Columns", l.grid?.columns],
          ["Gutter", l.grid?.gutter],
          ["Max Width", l.grid?.maxWidth],
        ].map(([k, v], i) => (
          <div key={k} className={`flex items-center justify-between py-[14px] ${i < 2 ? "border-b border-[#333]" : ""}`}>
            <span className="text-[13px] text-dim">{k}</span>
            {v ? <span className="rounded-[4px] bg-[#2a2a2a] px-[9px] py-[5px] text-[12px] text-dim">{v}</span> : <span className="text-mute">—</span>}
          </div>
        ))}
      </Card>
      {l.breakpoints?.length ? (
        <>
          <Eyebrow className="mt-[30px]">Breakpoints</Eyebrow>
          <div className="grid grid-cols-2 gap-[10px]">
            {l.breakpoints.map((b, i) => (
              <Card key={i} className="py-[16px]">
                <div className="eyebrow mb-[10px] text-[10.5px] text-[#c9cbc7]">{b.name}</div>
                <div className="text-[13px] text-dim">
                  {b.range}
                  {b.detail ? ` (${b.detail})` : ""}
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}
      {l.sectionSeparation && (
        <>
          <Eyebrow className="mt-[30px]">Section Separation</Eyebrow>
          <p className="text-[13px] leading-[1.55] text-dim">{l.sectionSeparation}</p>
        </>
      )}
      {l.template && (
        <>
          <Eyebrow className="mt-[30px]">Layout Template</Eyebrow>
          <Card className="overflow-x-auto px-[14px]">
            <pre className="ascii">{l.template}</pre>
            {l.annotations && <pre className="ascii mt-6 !whitespace-pre-wrap">{l.annotations}</pre>}
          </Card>
        </>
      )}
      {l.insights?.length ? (
        <>
          <Eyebrow className="mt-[30px]">Insights</Eyebrow>
          <div className="space-y-[16px]">
            {l.insights.map((t, i) => (
              <p key={i} className="text-[13px] leading-[1.55] text-dim">
                {t}
              </p>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

// ---------- Elevation ----------

function borderColor(css: string) {
  return css.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/)?.[0] ?? "#888";
}

export function ElevationSection({ brand }: { brand: Partial<BrandSystem> }) {
  const e = brand.elevation;
  if (!e) return <Pending />;
  return (
    <>
      <Eyebrow>Shadows</Eyebrow>
      {e.summary && <p className="mb-[20px] text-[12.5px] leading-[1.5] text-dim">{e.summary}</p>}
      <div className="space-y-[12px]">
        {e.shadows?.length ? (
          e.shadows.map((s, i) => (
            <Card key={i} className="flex gap-[18px] bg-[#1c1c1c]">
              <span className="h-[62px] w-[62px] shrink-0 rounded-[8px] bg-[#232322]" style={{ boxShadow: s.css }} />
              <div className="min-w-0">
                <div className="flex items-center gap-[10px]">
                  <span className="text-[14.5px] text-dim">{s.name}</span>
                  <span className="rounded-[3px] bg-[#2a2a2a] px-[7px] py-[1px] text-[10.5px] text-dim">{s.kind}</span>
                </div>
                <p className="mt-[8px] text-[12.5px] text-dim">{s.description}</p>
                <Chips className="mt-[12px]" items={s.usage} />
                <Mono className="mt-[12px] break-all">{s.css}</Mono>
              </div>
            </Card>
          ))
        ) : (
          <Empty text="No box-shadows — elevation is expressed with borders and surface contrast." />
        )}
      </div>
      <Eyebrow className="mt-[30px]">Borders</Eyebrow>
      <div className="space-y-[12px]">
        {e.borders?.map((b, i) => (
          <Card key={i} className="bg-[#1c1c1c] py-[16px]">
            <div className="mb-[18px] h-px w-full" style={{ background: borderColor(b.css) }} />
            <Mono>{b.css}</Mono>
            {b.description && <p className="mt-[6px] text-[12px] text-mute">{b.description}</p>}
          </Card>
        ))}
      </div>
    </>
  );
}

// ---------- Interactions ----------

function parseCss(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const k = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const v = decl.slice(i + 1).trim();
    if (k && v && !/height|transition/i.test(k)) out[k] = v;
  }
  return out as React.CSSProperties;
}

export function InteractionsSection({ brand }: { brand: Partial<BrandSystem> }) {
  const it = brand.interactions;
  if (!it) return <Pending />;
  return (
    <>
      <Eyebrow>Buttons</Eyebrow>
      <div className="space-y-[14px]">
        {it.buttons?.length ? (
          it.buttons.map((b, i) => {
            const def = parseCss(b.defaultCss);
            const hov = { ...def, ...parseCss(b.hoverCss) };
            // Previews always render on the cream stage, exactly as measured (light outline buttons read on hover).
            const darkStage = false;
            return (
              <Card key={i} className="pt-[14px] pb-[16px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[14px] text-dim">{b.name}</div>
                    <p className="mt-[5px] text-[12.5px] text-dim">{b.description}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-mute">radius: {b.radius}</span>
                </div>
                <div className={`mt-[12px] flex h-[69px] items-center gap-[10px] rounded-[6px] px-[16px] ${darkStage ? "bg-[#0e0e0e]" : "bg-cream"}`}>
                  <span className="inline-flex items-center whitespace-nowrap" style={def}>
                    Default
                  </span>
                  <span className="inline-flex items-center whitespace-nowrap" style={hov}>
                    Hover
                  </span>
                </div>
                <Eyebrow className="mt-[10px] mb-[7px] text-[11px]">Sizes</Eyebrow>
                <Chips items={b.sizes} />
              </Card>
            );
          })
        ) : (
          <Empty />
        )}
      </div>
      {it.links?.length ? (
        <>
          <Eyebrow className="mt-[30px]">Links</Eyebrow>
          <div className="space-y-[12px]">
            {it.links.map((l, i) => (
              <Card key={i}>
                <div className="text-[15px] text-dim">{l.name}</div>
                <p className="mt-[8px] text-[13px] text-dim">{l.description}</p>
                <Chips className="mt-[12px]" items={l.usage} />
              </Card>
            ))}
          </div>
        </>
      ) : null}
      {it.inputs?.length ? (
        <>
          <Eyebrow className="mt-[30px]">Inputs</Eyebrow>
          <div className="space-y-[12px]">
            {it.inputs.map((l, i) => (
              <Card key={i}>
                <div className="text-[15px] text-dim">{l.name}</div>
                <p className="mt-[8px] text-[13px] text-dim">{l.description}</p>
                <Mono className="mt-[10px] break-all">{l.css}</Mono>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

// ---------- Structure / Data display ----------

export function StructureSection({ brand }: { brand: Partial<BrandSystem> }) {
  const s = brand.structure;
  if (!s) return <Pending />;
  return (
    <>
      <Eyebrow>Dividers</Eyebrow>
      <div className="space-y-[12px]">
        {s.dividers?.length ? (
          s.dividers.map((d, i) => (
            <Card key={i} className="pt-[18px]">
              <div className="mb-[24px] h-px" style={{ background: borderColor(d.css) }} />
              <div className="text-[14.5px] text-dim">{d.name}</div>
              <p className="mt-[8px] text-[13px] text-dim">{d.description}</p>
              <Chips className="mt-[12px]" items={d.usage} />
              <Mono className="mt-[14px]">{d.css}</Mono>
            </Card>
          ))
        ) : (
          <Empty />
        )}
      </div>
    </>
  );
}

export function DataDisplaySection({ brand }: { brand: Partial<BrandSystem> }) {
  const d = brand.dataDisplay;
  if (!d) return <Pending />;
  return (
    <>
      <Eyebrow>Tiles</Eyebrow>
      <div className="space-y-[12px]">
        {d.tiles?.length ? (
          d.tiles.map((t, i) => (
            <Card key={i} className="bg-[#1c1c1c] pt-[22px]">
              <div className="text-[15px] text-dim">{t.name}</div>
              <p className="mt-[12px] text-[13px] text-dim">{t.description}</p>
              <Chips className="mt-[14px]" items={t.usage} />
            </Card>
          ))
        ) : (
          <Empty />
        )}
      </div>
    </>
  );
}

// ---------- Motion ----------

export function MotionSection({ brand }: { brand: Partial<BrandSystem> }) {
  const m = brand.motion;
  if (!m) return <Pending />;
  return (
    <>
      <Eyebrow>Global Patterns</Eyebrow>
      <Pills filled items={m.patterns} />
      <Eyebrow className="mt-[30px]">Animations</Eyebrow>
      <div className="space-y-[12px]">
        {m.animations?.length ? (
          m.animations.map((a, i) => (
            <Card key={i} className="pt-[20px]">
              <div className="text-[13.5px] text-dim">{a.name}</div>
              <p className="mt-[12px] text-[12.5px] text-dim">{a.description}</p>
              <Mono className="mt-[12px] break-all">{a.code}</Mono>
            </Card>
          ))
        ) : (
          <Empty />
        )}
      </div>
    </>
  );
}

// ---------- Navigation / Icons ----------

export function NavigationSection({ brand }: { brand: Partial<BrandSystem> }) {
  const n = brand.navigation;
  if (!n) return <Pending />;
  return (
    <>
      <Eyebrow>Top Navigation</Eyebrow>
      <div className="mt-[3px] grid grid-cols-2">
        <div className="flex items-center justify-between border-r border-[#333] py-[12px] pr-[16px]">
          <span className="text-[13px] text-dim">Height</span>
          <span className="rounded-[4px] bg-[#2a2a2a] px-[9px] py-[5px] text-[12px] text-dim">{n.height || "—"}</span>
        </div>
        <div className="flex items-center justify-between py-[12px] pl-[16px]">
          <span className="text-[13px] text-dim">Position</span>
          <span className="rounded-[4px] bg-[#2a2a2a] px-[9px] py-[5px] font-mono text-[12px] text-dim">{n.position || "—"}</span>
        </div>
      </div>
      <Card className="mt-[16px] py-[13px]">
        <Eyebrow className="text-[11px]">Background</Eyebrow>
        <div className="flex items-center gap-[12px]">
          <span className="h-[30px] w-[30px] rounded-[4px] border border-white/10" style={{ background: n.background }} />
          <span className="text-[12px] text-cream">{n.background}</span>
        </div>
      </Card>
      {n.tabs?.length ? (
        <>
          <Eyebrow className="mt-[22px]">Tabs</Eyebrow>
          {n.tabs.map((t, i) => (
            <Card key={i} className="mb-[10px]">
              <div className="text-[14.5px] text-dim">{t.name}</div>
              <p className="mt-[10px] text-[12.5px] text-dim">{t.description}</p>
              <div className="mt-[10px]">
                {t.states.map((s) => (
                  <div key={s.state} className="flex items-center justify-between py-[14px]">
                    <span className="text-[13px] text-dim">{s.state}</span>
                    <span className="rounded-[4px] bg-[#2a2a2a] px-[10px] py-[6px] text-[12px] text-dim">{s.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}

export function IconsSection({ brand }: { brand: Partial<BrandSystem> }) {
  const ic = brand.icons;
  if (!ic) return <Pending />;
  const svgs = ic.svgs ?? [];
  return (
    <div className="space-y-[16px]">
      {ic.sets?.length ? (
        ic.sets.map((s, i) => (
          <Card key={i} className="bg-[#1c1c1c] pt-[20px]">
            <div className="flex items-start justify-between">
              <span className="text-[15px] text-dim">{s.name}</span>
              <span className="text-[11px] text-mute">{s.sizes}</span>
            </div>
            <div className="mt-[12px] flex items-center gap-[10px]">
              <span className="rounded-[3px] bg-[#2a2a2a] px-[8px] py-[3px] text-[11px] text-dim">{s.format}</span>
              <span className="text-[12.5px] text-dim">{s.style}</span>
            </div>
            <p className="mt-[14px] text-[13px] text-dim">{s.description}</p>
            {s.whenToUse?.length ? (
              <>
                <div className="mt-[14px] mb-[10px] text-[12.5px] text-dim">When to use:</div>
                <Chips items={s.whenToUse} />
              </>
            ) : null}
            {s.examples?.length ? (
              <div className="mt-[16px] flex flex-wrap gap-[12px]">
                {s.examples.slice(0, 6).map((name, j) => {
                  const svg = svgs.find((x) => x.name.toLowerCase().includes(name.toLowerCase().split(" ")[0])) ?? svgs[j];
                  return (
                    <div key={j} className="flex w-[126px] flex-col items-center rounded-[6px] bg-[#232322] px-2 py-[16px]">
                      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] bg-cream text-ink [&_svg]:h-[18px] [&_svg]:w-[18px]" dangerouslySetInnerHTML={svg ? { __html: svg.svg } : undefined} />
                      <span className="mt-[10px] text-center text-[10.5px] text-cream">{name}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>
        ))
      ) : svgs.length ? (
        <div className="flex flex-wrap gap-[12px]">
          {svgs.slice(0, 12).map((s, j) => (
            <div key={j} className="flex w-[100px] flex-col items-center rounded-[6px] bg-[#232322] py-[14px]">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] bg-cream text-ink [&_svg]:h-[18px] [&_svg]:w-[18px]" dangerouslySetInnerHTML={{ __html: s.svg }} />
              <span className="mt-2 max-w-[90px] truncate text-[10.5px] text-cream">{s.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="No icon system detected." />
      )}
    </div>
  );
}

// ---------- Page sections ----------

export function PageSectionsSection({ brand }: { brand: Partial<BrandSystem> }) {
  const secs = brand.sections;
  if (!secs) return <Pending />;
  return (
    <div className="space-y-[16px]">
      {secs.map((s, i) => (
        <div key={i} className="rounded-[10px] bg-[#1c1c1c] px-[24px] pt-[24px] pb-[22px]">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#2a2a2a] text-[11px] text-cream">{i + 1}</span>
          <div className="mt-[16px] text-[16px] text-dim">{s.name}</div>
          {s.layout && <div className="mt-[16px] rounded-[4px] bg-[#232322] px-[15px] py-[8px] text-[12.5px] text-dim">{s.layout}</div>}
          {s.headline && <p className="mt-[16px] text-[15px] text-cream">{s.headline}</p>}
          {s.components?.length ? (
            <>
              <div className="eyebrow mt-[18px] mb-[12px] text-[11px] text-dim">Components</div>
              <div className="grid grid-cols-3 gap-[12px] max-md:grid-cols-1">
                {s.components.map((c, j) => (
                  <div key={j} className="rounded-[6px] bg-[#232322] px-[14px] py-[16px]">
                    <div className="text-[12.5px] text-dim">{c.name}</div>
                    <p className="mt-[10px] text-[11px] leading-[1.45] text-mute">{c.description}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ---------- Media ----------

export function MediaSection({ brand }: { brand: Partial<BrandSystem> }) {
  const media = brand.media;
  if (!media) return <Pending />;
  if (!media.length) return <Empty />;
  return (
    <div className="rounded-[10px] bg-[#1c1c1c] px-[8px] py-[8px]">
      {media.map((m, i) => (
        <div key={i} className={`flex items-start gap-[14px] px-[12px] py-[18px] ${i < media.length - 1 ? "border-b border-[#2c2c2b]" : ""}`}>
          <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#232322]">
            {m.kind !== "video" && m.url ? <img src={m.url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="font-mono text-[9px] text-mute">{m.kind}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] text-dim">{m.name}</div>
            <p className="mt-[6px] text-[12px] text-mute">{m.description}</p>
            <span className="mt-[10px] inline-block rounded-[3px] bg-[#2a2a2a] px-[8px] py-[3px] text-[10.5px] text-dim">{m.kind}</span>
          </div>
          {m.url && (
            <a href={m.url} target="_blank" rel="noreferrer" className="hit text-mute hover:text-cream" aria-label="Open asset">
              <LinkIcon />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
