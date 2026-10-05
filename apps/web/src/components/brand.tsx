/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export function Wordmark({ href = "/app", product = "ONBRAND", dark = true }: { href?: string; product?: string; dark?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-[9px] select-none" aria-label="Canopy OnBrand home">
      <img src={dark ? "/brand/canopy-mark-white.png" : "/brand/canopy-mark-black.png"} alt="" className="h-[22px] w-auto" />
      <img src={dark ? "/brand/canopy-wordmark-white.png" : "/brand/canopy-wordmark-black.png"} alt="Canopy" className="h-[17px] w-auto" />
      <span className={`text-[17px] font-normal tracking-[0.02em] ${dark ? "text-cream" : "text-ink"}`}>{product}</span>
    </Link>
  );
}

export function CanopyMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <img src="/brand/canopy-mark-white.png" alt="Canopy Labs" style={{ height: size }} className={`w-auto ${className}`} />;
}
