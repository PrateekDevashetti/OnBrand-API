/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { featuredStyles, PLANS, ANNUAL_DISCOUNT, PRICING } from "@onbrand/core";
import { Banner } from "@/components/landing/Banner";
import { HeroInput } from "@/components/landing/HeroInput";
import { Manifesto, Endpoints, BeforeAfter, ProductTour, IntegrateSection, PricingSection, Faq } from "@/components/landing/Sections";

export const dynamic = "force-dynamic";

const CSS_ART = [
  [".menu-wrapper-new {", "#c792ea"],
  ["-webkit-backdrop-filter:blur(0px);", "#7fb6ff"],
  ["  backdrop-filter:blur(0px);", "#e9ebe6"],
  ["  box-shadow:none;", "#e9ebe6"],
  ["  background:transparent;", "#e9ebe6"],
  ["  transition:all 0.2s", "#e9ebe6"],
  ["  cubic-bezier(0.25,0.46,0.45,0.94);", "#e9ebe6"],
  ["}", "#c792ea"],
  [".menu-wrapper-new.scrolling {", "#7fb6ff"],
  ["  -webkit-backdrop-filter:blur(16px);", "#c792ea"],
  ["  backdrop-filter:blur(16px);", "#9b9d99"],
  ["background: rgba(76, 175, 80, 0.8);", "#9b9d99"],
  ["box-shadow: 0px 0px 0px 1px rgba(17, 24,", "#7fd4a0"],
  ["   0px 2px 2px -1px rgba(17, 24, 39, 0.05),", "#9b9d99"],
  ["   0px 4px 4px -2px rgba(17, 24, 39, 0.05)", "#6c6e6a"],
  ["   0px 8px 8px -4px rgba(17, 24, _", "#565755"],
];

export default async function Landing() {
  const styles = await featuredStyles(8).catch(() => []);
  const shots = styles.map((s) => s.screenshot).filter(Boolean) as string[];
  return (
    <div className="min-h-screen bg-[#1e1e1e] text-cream">
      <Banner />
      <header className="relative flex h-[69px] items-center justify-between px-[32px] max-md:px-[16px]">
        <Link href="/" className="flex items-center gap-[10px]" aria-label="Canopy Labs OnBrand">
          <img src="/brand/canopy-mark-white.png" alt="" className="h-[26px]" />
          <img src="/brand/canopy-wordmark-white.png" alt="Canopy" className="h-[21px]" />
        </Link>
        <nav className="absolute left-1/2 flex -translate-x-1/2 gap-[39px] text-[15px] text-cream max-md:hidden [&>a]:py-[6px]">
          <a href="https://trycanopy.space" className="hover:opacity-60">Canvas</a>
          <Link href="#product" className="hover:opacity-60">Product</Link>
          <Link href="/app/docs" className="hover:opacity-60">Docs</Link>
          <Link href="#pricing" className="hover:opacity-60">Pricing</Link>
        </nav>
        <Link href="/app" className="flex h-[37px] w-[202px] max-sm:w-[150px] items-center justify-center rounded-[4px] border border-cream font-mono text-[15px] tracking-[0.02em] transition-colors hover:bg-cream hover:text-ink">
          Try the API
        </Link>
      </header>

      <section className="relative h-[1010px] overflow-hidden max-md:h-[620px]">
        <div className="absolute top-[7px] left-1/2 -translate-x-1/2">
          <span className="inline-flex h-[29px] items-center gap-[7px] rounded-[3px] bg-[#232322] px-[12px] font-mono text-[12px] text-cream">
            <span className="text-beta">BETA</span> Introducing: The OnBrand API
          </span>
        </div>
        {/* Decorative layer is laid out on a 1920px stage and scales down with the viewport; hidden when it would crowd the input. */}
        <div className="hero-deco pointer-events-none absolute top-0 left-0 h-full w-[1920px] max-[1359px]:hidden" aria-hidden="true">
          {shots[0] && (
            <div className="absolute top-[33px] left-0 h-[192px] w-[71px] overflow-hidden rounded-r-[2px] opacity-90">
              <img src={shots[0]} alt="" className="h-full w-[300px] max-w-none object-cover object-left-top" />
            </div>
          )}
          {shots[1] && (
            <div className="absolute top-[383px] left-[55px] h-[252px] w-[402px] overflow-hidden rounded-[2px] shadow-2xl">
              <img src={shots[1]} alt="" className="h-full w-full object-cover object-top" />
              <div className="absolute top-[6px] right-[6px] h-[240px] w-[280px] rounded-[10px] bg-white/70 p-4 backdrop-blur-md">
                <div className="text-[8px] text-[#666]">Brand system</div>
                <div className="mt-2 text-[12px] leading-tight text-[#111]">Every token, component and motion rule — extracted, structured and ready for your agent.</div>
                <div className="mt-3 flex gap-1.5">
                  {(styles[1]?.palette ?? ["#111", "#f3f6f0", "#4caf50"]).slice(0, 6).map((c) => (
                    <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
                  ))}
                </div>
                <div className="mt-3 font-mono text-[8px] leading-[1.6] text-[#444]">{styles[1]?.typography}</div>
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#111] text-[9px] text-white">✕</span>
              </div>
            </div>
          )}
          <pre className="pointer-events-none absolute top-[396px] left-[1585px] font-sans text-[19.5px] leading-[1.45] whitespace-pre [mask-image:linear-gradient(90deg,#000_70%,transparent)]">
            {CSS_ART.map(([t, c], i) => (
              <div key={i} style={{ color: c, opacity: i > 11 ? 1 - (i - 11) * 0.18 : 1 }}>
                {t}
              </div>
            ))}
          </pre>
        </div>
        <div className="absolute top-[426px] right-0 left-0 px-6 max-md:top-[170px]">
          <HeroInput />
          <h1 className="mt-[81px] text-center text-[32px] max-md:text-[26px] leading-none tracking-[-0.01em] text-cream">Make your agents be on brand</h1>
          <p className="mx-auto mt-[20px] max-w-[720px] text-center text-[17px] leading-[1.6] text-[#8b8d89]">
            Extract any brand system, search for style inspiration, and verify if it&apos;s staying on course.
            <br />
            Built for gen AI applications, agents and developers.
          </p>
        </div>
      </section>

      <Manifesto />
      <Endpoints />
      <BeforeAfter />
      <ProductTour />
      <IntegrateSection />
      <PricingSection plans={PLANS} discount={ANNUAL_DISCOUNT} prices={PRICING} />
      <Faq />

      <footer className="flex items-center justify-between border-t border-[#2a2a2a] px-[32px] py-[40px] text-[13px] text-dim">
        <div className="flex items-center gap-3">
          <img src="/brand/canopy-mark-white.png" alt="" className="h-[22px]" />
          <span>OnBrand is a Canopy Labs product.</span>
        </div>
        <div className="flex gap-6">
          <a href="https://trycanopy.space" className="hover:text-cream">Canopy Canvas</a>
          <Link href="/app/docs" className="hover:text-cream">Docs</Link>
          <Link href="/app" className="hover:text-cream">Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
