/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { StyleResult } from "@onbrand/core/search";

export function StyleThumb({ s, h, badge }: { s: StyleResult; h: number; badge?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[8px] bg-[#0e0e0e]" style={{ height: h }}>
      {s.screenshot ? (
        <img src={s.screenshot} alt={s.name} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
      ) : (
        <div className="flex h-full items-center justify-center gap-1">
          {s.palette.map((c) => (
            <span key={c} className="h-6 w-6 rounded-full" style={{ background: c }} />
          ))}
        </div>
      )}
      {badge && <span className="absolute top-[12px] left-[12px] rounded-[4px] bg-white px-[11px] py-[5px] text-[11px] text-ink">{badge}</span>}
    </div>
  );
}

export function FeaturedCard({ s }: { s: StyleResult }) {
  return (
    <Link href={`/app/styles/${s.id}`} className="group block">
      <StyleThumb s={s} h={172} />
      <div className="mt-[16px] text-[13.5px] text-cream">{s.label || s.name}</div>
      <div className="mt-[8px] text-[11.5px] text-dim">{s.tags.join(" | ")}</div>
    </Link>
  );
}

export function ResultCard({ s, sep = " | " }: { s: StyleResult; sep?: string }) {
  return (
    <Link href={`/app/styles/${s.id}`} className="group block">
      <StyleThumb s={s} h={218} badge={s.match} />
      <div className="mt-[16px] text-[14.5px] text-cream">{s.name}</div>
      <div className="mt-[8px] truncate text-[12px] text-dim">{s.tags.join(sep)}</div>
    </Link>
  );
}
