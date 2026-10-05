"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroInput() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/app/extract${url ? `?url=${encodeURIComponent(url)}` : ""}`);
      }}
      className="relative z-20 mx-auto flex h-[51px] w-[714px] max-w-full items-center rounded-[6px] bg-cream p-[4px] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
    >
      <input value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Website URL" placeholder="" className="h-full flex-1 bg-transparent px-[14px] text-[15px] text-ink outline-none" spellCheck={false} />
      <button type="submit" className="h-[38px] rounded-[5px] bg-[#111] px-[23px] font-mono text-[13px] tracking-[0.02em] text-cream transition-opacity hover:opacity-85">
        Extract
      </button>
    </form>
  );
}
