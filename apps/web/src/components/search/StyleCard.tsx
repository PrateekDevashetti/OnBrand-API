/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { StyleResult } from "@onbrand/core/search";

/** `w`×`h` is the crop at the 1920px design width; the aspect ratio holds it at every viewport. */
export function StyleThumb({ s, w, h, badge }: { s: StyleResult; w: number; h: number; badge?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[8px] bg-[#0e0e0e]" style={{ aspectRatio: `${w} / ${h}` }}>
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

export function FeaturedCard({ s, h = 172 }: { s: StyleResult; h?: number }) {
  return (
    <Link href={`/app/styles/${s.id}`} className="group block">
      <StyleThumb s={s} w={274} h={h} />
      <div className="mt-[11px] text-[14px] leading-[18px] text-cream">{s.label || s.name}</div>
      <div className="mt-[8px] text-[12px] leading-[16px] text-dim">{(s.traits?.length ? s.traits : s.tags).join(" | ")}</div>
    </Link>
  );
}

/** Crop heights for the landing masonry (274px-wide cards), repeating per row. */
const MASONRY = [174, 174, 139, 169, 172, 140, 171, 169];

/** Four independent columns; each card keeps its own crop height so rows don't align. */
export function FeaturedMasonry({ items }: { items: StyleResult[] }) {
  const cols: { s: StyleResult; h: number }[][] = [[], [], [], []];
  items.forEach((s, i) => cols[i % 4].push({ s, h: MASONRY[i % MASONRY.length] }));
  return (
    <div className="grid grid-cols-4 items-start gap-x-[clamp(12px,1.04vw,20px)] max-md:grid-cols-2 max-md:gap-y-[40px]">
      {cols.map((col, c) => (
        <div key={c} className="flex flex-col gap-[56px]">
          {col.map(({ s, h }) => (
            <FeaturedCard key={s.id} s={s} h={h} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ResultCard({ s, sep = " | " }: { s: StyleResult; sep?: string }) {
  return (
    <Link href={`/app/styles/${s.id}`} className="group block">
      <StyleThumb s={s} w={346} h={216} badge={s.match} />
      <div className="mt-[12px] text-[14.5px] leading-[18px] text-cream">{s.name}</div>
      <div className="mt-[6px] truncate text-[12px] leading-[16px] text-dim">{s.tags.slice(0, 3).join(sep)}</div>
    </Link>
  );
}
