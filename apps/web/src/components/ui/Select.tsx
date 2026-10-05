"use client";

import { useEffect, useRef, useState } from "react";
import { Chevron } from "./icons";

export type Option<T extends string> = { value: T; label: string };

export function Select<T extends string>({
  value,
  options,
  onChange,
  prefix,
  className = "",
  align = "right",
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  prefix?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" className="select-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {prefix ? `${prefix}: ` : ""}
        {current?.label}
        <Chevron />
      </button>
      {open && (
        <ul role="listbox" className={`absolute top-[calc(100%+6px)] z-30 min-w-full overflow-hidden rounded-[6px] border border-line-2 bg-[#1f1f1f] py-1 shadow-xl shadow-black/40 ${align === "right" ? "right-0" : "left-0"}`}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-1.5 text-left text-[12px] whitespace-nowrap transition-colors hover:bg-[#2a2a2a] ${o.value === value ? "text-cream" : "text-dim"}`}
              >
                {prefix ? `${prefix}: ` : ""}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
