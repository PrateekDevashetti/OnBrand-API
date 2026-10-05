"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExtractArt, SearchArt, AdherenceArt } from "../home/FeatureCards";

const TRY = "flex h-[37px] w-[202px] items-center justify-center rounded-[4px] border border-cream font-mono text-[15px] tracking-[0.02em] text-cream transition-colors hover:bg-cream hover:text-ink";

export function TryFree({ className = "" }: { className?: string }) {
  return (
    <Link href="/app" className={`${TRY} ${className}`}>
      Try it for free
    </Link>
  );
}

// ---------- manifesto ----------

export function Manifesto() {
  return (
    <section id="manifesto" className="flex min-h-[1080px] items-center justify-center bg-[#1e1e1e] px-6">
      <p className="max-w-[820px] text-center text-[32px] leading-[40px] tracking-[-0.01em] text-[#8b8d89]">
        <span className="text-cream">We&apos;re building the brand layer for AI.</span> OnBrand is the first agent tool we&apos;re shipping from Canopy Labs. A brand is years of craft and care, and it&apos;s what makes a product feel whole. We want your agents to respect it.
      </p>
    </section>
  );
}

// ---------- three endpoints ----------

const ENDPOINTS = [
  { Art: ExtractArt, title: "Brand Extraction", badge: "BETA", body: "Give it a URL and get the whole brand system back: logos, colour palettes, fonts, motion, textures, shadows and more, as structured data your agent can read." },
  { Art: SearchArt, title: "Style Search", badge: "ALPHA", body: "Your user doesn't have a brand yet? Your agent can describe a look in plain language and pull real brand systems from our curated index, like “a calm editorial bank”." },
  { Art: AdherenceArt, title: "Verify Adherence", badge: "ALPHA", body: "Check whether what your agent made is still on brand. Get a score, a critique and exact fixes your agent loop can apply until it is." },
] as const;

export function Endpoints() {
  return (
    <section id="product" className="bg-[#1e1e1e] px-[40px] pt-[145px] pb-[150px]">
      <h2 className="max-w-[600px] text-[34px] leading-[40px] tracking-[-0.015em] text-cream">
        Everything your agent needs to stay on brand. <span className="text-[#8b8d89]">In three endpoints.</span>
      </h2>
      <div className="mt-[48px] grid grid-cols-3 gap-[16px]">
        {ENDPOINTS.map(({ Art, title, badge, body }) => (
          <div key={title}>
            <div className="flex h-[402px] items-center justify-center overflow-hidden rounded-[2px] bg-[#151515]">
              <div className="h-[222px] w-[330px] origin-center scale-[1.65]">
                <Art />
              </div>
            </div>
            <div className="mt-[34px] flex items-center gap-[14px]">
              <span className="text-[24px] leading-none tracking-[-0.01em] text-cream">{title}</span>
              <span className={`${badge === "BETA" ? "badge-beta" : "badge-alpha"} !px-[12px] !py-[6px] !text-[12px]`}>{badge}</span>
            </div>
            <p className="mt-[18px] max-w-[580px] text-[18px] leading-[26px] text-[#8b8d89]">{body}</p>
          </div>
        ))}
      </div>
      <TryFree className="mx-auto mt-[64px]" />
    </section>
  );
}

// ---------- before / after ----------

export function BeforeAfter() {
  // Split view: drag the divider to give either side more room.
  const [pos, setPos] = useState(50);
  const sec = useRef<HTMLElement>(null);
  const drag = useRef(false);
  const move = (clientX: number) => {
    const r = sec.current?.getBoundingClientRect();
    if (r) setPos(Math.max(20, Math.min(80, ((clientX - r.left) / r.width) * 100)));
  };
  useEffect(() => {
    const up = () => (drag.current = false);
    const mm = (e: PointerEvent) => drag.current && move(e.clientX);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", mm);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", mm);
    };
  }, []);
  return (
    <section id="compare" ref={sec} className="relative h-[1080px] bg-[#141414] px-[40px] pt-[150px]">
      <h2 className="text-[32px] leading-[40px] tracking-[-0.015em] text-cream">
        Staying &ldquo;on brand&rdquo;
        <br />
        <span className="text-[#8b8d89]">lives in the details…</span>
      </h2>
      <div className="mt-[52px] grid gap-[32px]" style={{ gridTemplateColumns: `${pos}fr ${100 - pos}fr` }}>
        <figure>
          <figcaption className="text-[18px] text-[#8b8d89]">Original</figcaption>
          <div className="mt-[16px] h-[602px] overflow-hidden rounded-[2px] bg-white">
            <img src="/landing/before-canopy.jpg" alt="The original trycanopy.space homepage" className="h-full w-full object-cover object-left-top" draggable={false} />
          </div>
        </figure>
        <figure>
          <figcaption className="text-[18px] text-cream">With OnBrand</figcaption>
          <div className="mt-[16px] h-[602px] overflow-hidden rounded-[2px] bg-white">
            <img src="/landing/after-canopy.jpg" alt="A new Canopy page built only from OnBrand's extraction of trycanopy.space" className="h-full w-full object-cover object-left-top" draggable={false} />
          </div>
        </figure>
      </div>
      <p className="mt-[18px] text-[14px] text-[#6f716d]">The page on the right is new. Every colour, type stack, radius and button style in it comes from OnBrand&apos;s extraction of the original.</p>
      <div
        className="absolute top-0 bottom-0 w-[32px] -translate-x-1/2 cursor-ew-resize"
        style={{ left: `calc(40px + (100% - 112px) * ${pos / 100} + 16px)` }}
        onPointerDown={(e) => {
          drag.current = true;
          move(e.clientX);
        }}
        role="slider"
        aria-label="Resize the comparison"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={20}
        aria-valuemax={80}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(20, p - 4));
          if (e.key === "ArrowRight") setPos((p) => Math.min(80, p + 4));
        }}
      >
        <span className="absolute top-0 bottom-0 left-1/2 w-px bg-[#3a3a39]" />
        <span className="absolute top-[613px] left-1/2 flex h-[30px] w-[30px] -translate-x-1/2 items-center justify-center rounded-full bg-cream text-[13px] text-ink">↔</span>
      </div>
    </section>
  );
}

// ---------- product tour (light band) ----------

const TOUR = [
  { src: "/landing/tour-0.jpg", label: "A brand system, extracted" },
  { src: "/landing/tour-1.jpg", label: "Paste a URL" },
  { src: "/landing/tour-2.jpg", label: "Read the brand system" },
  { src: "/landing/tour-3.jpg", label: "Colours, type, surfaces, components" },
  { src: "/landing/tour-4.jpg", label: "No brand? Search by look" },
  { src: "/landing/tour-5.jpg", label: "Verify what your agent built" },
];

export function ProductTour() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((x) => (x + 1) % TOUR.length), 3200);
    return () => clearInterval(t);
  }, [playing]);
  return (
    <section id="tour" className="grid grid-cols-[1fr_1060px] gap-[40px] bg-[#f3f4f0] px-[40px] pt-[242px] pb-[242px] text-[#111]">
      <div className="flex flex-col justify-between">
        <div>
          <h2 className="max-w-[440px] text-[21px] leading-[28px] tracking-[-0.01em]">How OnBrand turns a website into a brand system your agent can use</h2>
          <div className="mt-[16px] flex items-center gap-[10px] font-mono text-[15px] text-[#6c6e6a]">
            <img src="/brand/canopy-mark-black.png" alt="" className="h-[26px] w-[26px] rounded-[3px] bg-white object-contain p-[3px]" />
            Canopy Labs
          </div>
        </div>
        <div>
          <p className="max-w-[580px] text-[21px] leading-[28px]">Extraction, search and verification run on the same engine, so the values your agent builds with are the same values it&apos;s checked against.</p>
          <Link href="/app/docs" className="mt-[30px] inline-block font-mono text-[15px] text-[#6c6e6a] hover:text-[#111]">
            Read the docs
          </Link>
        </div>
      </div>
      <div className="relative aspect-[1060/596] overflow-hidden rounded-[14px] bg-[#1e1e1e]">
        {TOUR.map((t, k) => (
          <img key={t.src} src={t.src} alt={t.label} className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700" style={{ opacity: k === i ? 1 : 0 }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-[14px] bg-gradient-to-t from-black/70 to-transparent px-[38px] pt-[40px] pb-[28px] text-white">
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause tour" : "Play tour"} className="text-[15px]">
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="font-mono text-[12px] tabular-nums">
            {String(i + 1).padStart(2, "0")} / {String(TOUR.length).padStart(2, "0")}
          </span>
          <div className="flex flex-1 gap-[6px]">
            {TOUR.map((t, k) => (
              <button key={t.src} type="button" onClick={() => (setI(k), setPlaying(false))} aria-label={t.label} className={`h-[3px] flex-1 rounded-full ${k <= i ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
          <span className="w-[260px] text-right text-[14px]">{TOUR[i].label}</span>
        </div>
      </div>
    </section>
  );
}

// ---------- integrations ----------

const CLIENTS = ["Claude Code", "Cursor", "Codex", "VS Code", "Windsurf", "Claude Desktop", "Zed", "Any MCP client"];

export function IntegrateSection() {
  return (
    <section id="integrations" className="grid grid-cols-[872px_1fr] items-start gap-[96px] bg-[#141414] px-[200px] pt-[260px] pb-[260px]">
      <div className="overflow-hidden rounded-[14px] border border-[#2a2a2a] bg-[#1e1e1e]">
        <img src="/landing/dashboard.jpg" alt="The OnBrand dashboard: usage, API keys and agent integrations" className="block w-full" />
      </div>
      <div className="flex h-full flex-col">
        <h2 className="text-[32px] leading-[40px] tracking-[-0.015em] text-cream">Plug in through the API or MCP</h2>
        <p className="mt-[14px] max-w-[470px] text-[18px] leading-[27px] text-[#8b8d89]">Use OnBrand from anything you build: apps, internal tools, automations and coding agents. REST, an MCP server and agent skills, one key.</p>
        <div className="relative mt-[36px] w-[320px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex w-max animate-[marquee_22s_linear_infinite] gap-[10px]">
            {[...CLIENTS, ...CLIENTS].map((c, k) => (
              <span key={k} className="flex h-[50px] items-center rounded-[10px] border border-[#2e2e2d] bg-[#1c1c1c] px-[16px] text-[14px] whitespace-nowrap text-cream">
                {c}
              </span>
            ))}
          </div>
        </div>
        <TryFree className="mt-auto" />
      </div>
    </section>
  );
}

// ---------- pricing ----------

type Plan = { id: string; name: string; monthly: number | null; credits: number | null; features: readonly string[]; cta: string };

export function PricingSection({ plans, discount, prices }: { plans: readonly Plan[]; discount: number; prices: { searchLight: number; searchDeep: number; extraction: number; adherence: number } }) {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="bg-[#141414] px-[40px] pt-[100px] pb-[100px]">
      <div className="inline-flex h-[52px] items-center gap-[4px] rounded-full border border-[#2a2a2a] p-[5px]">
        {[false, true].map((a) => (
          <button key={String(a)} type="button" onClick={() => setAnnual(a)} className={`h-[40px] rounded-full px-[17px] font-mono text-[14px] transition-colors ${annual === a ? "bg-[#2a2a2a] text-cream" : "text-[#8b8d89] hover:text-cream"}`}>
            {a ? `Annual · ${Math.round(discount * 100)}% savings` : "Monthly"}
          </button>
        ))}
      </div>
      <div className="mt-[43px] grid grid-cols-3 gap-[16px]">
        {plans.map((p) => {
          const price = p.monthly == null ? null : Math.round(p.monthly * (annual ? 1 - discount : 1));
          return (
            <div key={p.id} className="flex min-h-[692px] flex-col rounded-[2px] bg-[#1e1e1e] px-[48px] pt-[48px] pb-[48px]">
              <div className="text-[21px] text-cream">{p.name}</div>
              <div className="mt-[78px] text-[34px] leading-[42px] tracking-[-0.02em]">
                {price == null ? (
                  <>
                    <span className="text-cream">Let&apos;s talk</span> <span className="text-[#8b8d89]">volume pricing</span>
                    <br />
                    <span className="text-[#8b8d89]">SLAs & support</span>
                  </>
                ) : (
                  <>
                    <span className="text-cream">${price}</span> <span className="text-[#8b8d89]">per month</span>
                    <br />
                    <span className="text-cream">{p.credits!.toLocaleString("en-US")}</span> <span className="text-[#8b8d89]">credits</span>
                  </>
                )}
              </div>
              <ul className="mt-auto space-y-[12px] text-[18px] text-[#8b8d89]">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href={p.monthly == null ? "mailto:hello@trycanopy.space?subject=OnBrand%20Enterprise" : "/app/billing"} className="mt-[52px] flex h-[37px] items-center justify-center rounded-[4px] border border-cream font-mono text-[15px] text-cream transition-colors hover:bg-cream hover:text-ink">
                {p.monthly == null ? "Contact us" : "Select"}
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-[16px] flex h-[74px] items-center justify-center gap-[32px] rounded-[2px] bg-[#1e1e1e] text-[18px]">
        <span>
          <span className="text-cream">Search =</span> <span className="text-[#8b8d89]">Light {prices.searchLight} credit | Deep {prices.searchDeep} credits</span>
        </span>
        <span>
          <span className="text-cream">Extraction =</span> <span className="text-[#8b8d89]">{prices.extraction} credits</span>
        </span>
        <span>
          <span className="text-cream">Verifier =</span> <span className="text-[#8b8d89]">{prices.adherence} credits</span>
        </span>
      </div>
    </section>
  );
}

// ---------- FAQ ----------

const FAQ = [
  ["How does it work?", "Three parts on one engine. The Extractor renders a page in a real browser and turns what it measures (computed styles, CSS, structure, screenshots) into a brand system plus the source artifacts. Search ranks brands in our curated index from a plain-language description, or from one of your own extractions. The Verifier extracts two pages and scores how closely one follows the other's brand. Extraction and verification are jobs you poll; search answers straight away."],
  ["Can I connect it to my agent?", "Yes. There's an MCP server for Claude Code, Cursor, Codex and any other MCP client, authenticated with your API key. It exposes the same extract, search and verify tools as the REST API, and lets an agent read back only the sections it needs so its context stays small. Two agent skills, onbrand-search and onbrand-adherence, teach it how to use them well."],
  ["How long does an extraction take? What if it fails?", "Usually under a minute for a single page, a little longer with deep analysis on. Results are cached per URL, so a page someone already extracted comes back immediately (pass force: true for a fresh run). Sections stream in while it runs, so you can read partial output early. If it fails, the status says failed with the reason, and the credits are refunded automatically."],
  ["How does search work? What if it fails?", "Describe the look you want (\"dark brutalist developer tools\") or point at one of your extractions to get its nearest neighbours. You get brand cards with palette, typography, taxonomy tags and a screenshot. Fast returns in a second or two; deep re-ranks with AI and explains each match. Filters like industry, hue, page type and layout are hard constraints, not hints. If a search fails, the credit is refunded."],
  ["How does the adherence verifier work? What if it fails?", "Give it two URLs: the reference brand and the page you want judged. We extract both, then return a score from 0 to 1, recommendations in plain language and structured fixes with exact target values. Both lists are worst-first, so they work as a to-do list for an agent loop. If a run fails it says so and stops, so you never wait on a verdict that isn't coming, and the credits are refunded."],
  ["What is OnBrand?", "An API that turns any website into a structured brand system. Give it a URL and it returns colours, typography, layout, components and a brand profile as JSON, plus the captured HTML, CSS and screenshots. From there you can search a curated index for brands with a similar look, and score any page against a reference brand. OnBrand is built by Canopy Labs."],
] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="bg-[#1e1e1e] px-[40px] pt-[144px] pb-[200px]">
      <div className="grid grid-cols-2 border-t border-[#2e2e2d] pt-[30px]">
        <div className="font-mono text-[17px] text-[#8b8d89]">Frequently asked questions</div>
        <div>
          {FAQ.map(([q, a], k) => (
            <div key={q} className="border-b border-[#2e2e2d] last:border-0">
              <button type="button" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k} className="flex w-full items-center justify-between py-[30px] text-left text-[18px] text-cream">
                {q}
                <span className={`text-[20px] transition-transform ${open === k ? "rotate-180" : ""}`} aria-hidden>
                  ↓
                </span>
              </button>
              {open === k && <p className="-mt-[8px] pb-[34px] text-[18px] leading-[26px] text-[#8b8d89]">{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
