"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MagneticDock, type DockItemData } from "@/components/ui/magnetic-dock";

/** The design areas of a brand system, in viewer order. */
const AREAS: { key: string; label: string; path: React.ReactNode }[] = [
  { key: "colors", label: "Colours", path: <><circle cx="8" cy="9" r="4" /><circle cx="16" cy="9" r="4" /><circle cx="12" cy="16" r="4" /></> },
  { key: "typography", label: "Typography", path: <><path d="M4 7V5h16v2" /><path d="M12 5v14" /><path d="M9 19h6" /></> },
  { key: "surfaces", label: "Surfaces", path: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12h16" /></> },
  { key: "layout", label: "Layout", path: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="M9 11h12" /></> },
  { key: "elevation", label: "Elevation", path: <><path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="m3 13 9 5 9-5" /></> },
  { key: "interactions", label: "Interactions", path: <><path d="m8 3 11 7-5 1.5L11.5 17z" /><path d="m14 11.5 4 6" /></> },
  { key: "motion", label: "Motion Design", path: <><path d="M3 12c3-6 6 6 9 0s6 6 9 0" /></> },
  { key: "icons", label: "Icons", path: <><circle cx="12" cy="12" r="8" /><path d="m9 12 2 2 4-4" /></> },
  { key: "sections", label: "Page Sections", path: <><rect x="4" y="3" width="16" height="5" rx="1" /><rect x="4" y="10" width="16" height="11" rx="1" /></> },
  { key: "media", label: "Media", path: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 16 5-5 4 4 3-3 6 6" /><circle cx="16" cy="9" r="1.5" /></> },
];

export const DESIGN_AREA_KEYS = new Set(AREAS.map((a) => a.key));

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

/** Floating magnetic dock for jumping between design areas. Shown while the reader is inside them. */
export function DesignDock({ active, visible, onJump }: { active: string; visible: boolean; onJump: (key: string) => void }) {
  const narrow = useNarrow();
  const items: DockItemData[] = AREAS.map((a) => ({
    id: a.key,
    label: a.label,
    isActive: a.key === active,
    onClick: () => onJump(a.key),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        {a.path}
      </svg>
    ),
  }));
  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="Design areas"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="dark pointer-events-none absolute inset-x-0 bottom-[18px] z-30 flex justify-center"
        >
          <MagneticDock
            items={items}
            iconSize={narrow ? 24 : 32}
            maxScale={narrow ? 1 : 1.45}
            magneticDistance={110}
            showLabels={!narrow}
            className="pointer-events-auto gap-[6px] rounded-[18px] border-[#3a3a39] bg-[#1b1b1b]/85 p-[8px] max-sm:gap-[4px] max-sm:p-[6px]"
          />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
