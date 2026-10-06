/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

/** Header for public pages (docs, legal). */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-[69px] items-center justify-between border-b border-[#2a2a2a] bg-[#1e1e1e] px-[32px] max-md:px-[16px]">
      <Link href="/" className="flex items-center gap-[10px]" aria-label="Canopy Labs OnBrand home">
        <img src="/brand/canopy-mark-white.png" alt="" className="h-[24px]" />
        <img src="/brand/canopy-wordmark-white.png" alt="Canopy" className="h-[19px]" />
        <span className="text-[16px] tracking-[0.02em] text-cream">ONBRAND</span>
      </Link>
      <nav className="flex items-center gap-[28px] text-[14px] text-cream max-md:hidden">
        <Link href="/#product" className="py-[6px] hover:opacity-60">Product</Link>
        <Link href="/docs" className="py-[6px] hover:opacity-60">Docs</Link>
        <Link href="/#pricing" className="py-[6px] hover:opacity-60">Pricing</Link>
      </nav>
      <Link href="/app" className="flex h-[37px] items-center rounded-[4px] border border-cream px-[18px] font-mono text-[14px] text-cream transition-colors hover:bg-cream hover:text-ink">
        Dashboard
      </Link>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#2a2a2a] px-[32px] py-[32px] text-[13px] text-dim max-md:px-[16px]">
      <span>OnBrand is a Canopy Labs product.</span>
      <nav className="flex flex-wrap gap-x-6">
        <Link href="/docs" className="inline-block py-[12px] hover:text-cream">Docs</Link>
        <Link href="/terms" className="inline-block py-[12px] hover:text-cream">Terms</Link>
        <Link href="/privacy" className="inline-block py-[12px] hover:text-cream">Privacy</Link>
        <Link href="/acceptable-use" className="inline-block py-[12px] hover:text-cream">Acceptable use</Link>
        <a href="mailto:support@trycanopy.space" className="inline-block py-[12px] hover:text-cream">Support</a>
      </nav>
    </footer>
  );
}
