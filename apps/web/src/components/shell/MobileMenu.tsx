"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

/** Below 1024px the sidebar lives in a drawer opened from the top bar. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[40px] w-[40px] items-center justify-center rounded-[6px] text-cream hover:bg-white/5 lg:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          {open ? <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" /> : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" />}
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute top-0 bottom-0 left-0 w-[260px] overflow-y-auto bg-chrome pt-[16px] pb-[24px] shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}
