"use client";

import Link from "next/link";
import { useState } from "react";

export function Banner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="relative flex h-[35px] items-center justify-center bg-promo text-[14px] text-white">
      20 Free Credits.&nbsp;
      <Link href="/app" className="underline underline-offset-2">
        Try the OnBrand API Now.
      </Link>
      <button aria-label="Dismiss" onClick={() => setOpen(false)} className="absolute right-[36px] text-white/90 hover:text-white">
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
    </div>
  );
}
