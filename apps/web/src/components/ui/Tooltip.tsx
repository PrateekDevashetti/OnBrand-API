"use client";

import { useState } from "react";
import { Info } from "./icons";

export function InfoTip({ text, width = 256 }: { text: string; width?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      <button type="button" className="hit text-mute hover:text-cream" aria-label="More info">
        <Info />
      </button>
      {open && (
        <span
          role="tooltip"
          style={{ width }}
          className="animate-in absolute top-[22px] left-1/2 z-40 -translate-x-[36%] rounded-[4px] border border-line-2 bg-[#1b1b1b] px-3 py-2.5 font-mono text-[11.5px] leading-[1.25] text-cream shadow-xl shadow-black/50"
        >
          {text}
        </span>
      )}
    </span>
  );
}
