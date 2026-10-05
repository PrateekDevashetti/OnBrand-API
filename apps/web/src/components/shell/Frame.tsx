"use client";

import { usePathname } from "next/navigation";

/** Main content frame. Brand-system viewers break out of the rounded panel onto the chrome. */
export function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const flush = /^\/app\/extractions\/[^/]+/.test(path);
  return (
    <main
      id={flush ? undefined : "panel"}
      className={flush ? "min-w-0 flex-1 overflow-hidden bg-chrome" : "mr-[17px] mb-[17px] min-w-0 flex-1 overflow-y-auto rounded-[22px] bg-panel"}
    >
      {children}
    </main>
  );
}
