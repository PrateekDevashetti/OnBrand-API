/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStyle } from "@onbrand/core";
import { ArrowLeft } from "@/components/ui/icons";
import { OpenBrandSystem } from "@/components/search/OpenBrandSystem";

export const dynamic = "force-dynamic";

function Tag({ t }: { t: string }) {
  return <span className="inline-flex h-[38px] items-center rounded-[6px] border border-[#55564f] px-[19px] text-[12px] text-dim">{t}</span>;
}

export default async function StylePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStyle(id);
  if (!data) notFound();
  const { style: s, raw, similar } = data;
  const pageTags = s.tags;
  return (
    <div className="mx-auto w-[1156px] max-w-[calc(100%-64px)] pt-[26px] pb-[40px]">
      <Link href="/app/search" aria-label="Back" className="hit inline-block text-cream hover:opacity-70">
        <ArrowLeft width={26} height={20} />
      </Link>
      <div className="mt-[24px] grid grid-cols-[minmax(0,620fr)_minmax(270px,436fr)] gap-[clamp(32px,5.2vw,100px)] max-lg:grid-cols-1">
        <a href={s.url} target="_blank" rel="noreferrer" className="block aspect-[620/576] self-start overflow-hidden rounded-[12px] bg-[#0e0e0e]">
          {s.screenshot && <img src={s.screenshot} alt={s.name} className="h-full w-full object-cover object-top" />}
        </a>
        <div>
          <h1 className="text-[33px] leading-none text-cream">{s.domain}</h1>
          <div className="mt-[40px] flex flex-wrap gap-[10px]">
            {s.tags.slice(0, 3).map((t) => (
              <Tag key={t} t={t} />
            ))}
          </div>
          <h2 className="mt-[10px] text-[20px] text-cream">Prompt Match Reasoning</h2>
          <p className="mt-[10px] min-h-[212px] max-w-[306px] text-[11.5px] leading-[1.45] text-dim">{s.description}</p>
          <div className="mt-[40px] flex justify-end">
            <OpenBrandSystem url={s.url} extractionId={s.extractionId} />
          </div>
          <div className="mt-[40px] border-t border-[#333]" />
          <div className="flex items-center justify-between py-[22px]">
            <span className="text-[16px] text-dim">Palette</span>
            <div className="flex gap-[6px]">
              {raw.palette.map((c) => (
                <span key={c} title={c} className="h-[24px] w-[24px] rounded-full border border-white/10" style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="border-t border-[#333]" />
          <div className="flex items-center justify-between py-[22px]">
            <span className="text-[16px] text-dim">Typography</span>
            <span className="text-[11.5px] text-cream">{raw.typography}</span>
          </div>
          <div className="border-t border-[#333]" />
          <div className="pt-[4px] pb-[18px]">
            <span className="text-[16px] text-dim">Page Tags</span>
            <div className="mt-[30px] flex flex-wrap justify-end gap-x-[8px] gap-y-[4px]">
              {pageTags.map((t) => (
                <Tag key={t} t={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-[34px] border-t border-[#333]" />
      <div className="mt-[54px] flex items-center justify-between">
        <h2 className="text-[19px] text-cream">Similar branding</h2>
        <Link href={`/app/search`} className="text-[11.5px] text-dim hover:text-cream">
          See all →
        </Link>
      </div>
      <div className="mt-[26px] grid grid-cols-3 gap-x-[clamp(14px,1.25vw,24px)] gap-y-[30px] max-md:grid-cols-1">
        {similar.map((x) => (
          <Link key={x.id} href={`/app/styles/${x.id}`} className="group block">
            <div className="aspect-[369/260] overflow-hidden rounded-[8px] bg-[#0e0e0e]">
              {x.screenshot && <img src={x.screenshot} alt={x.name} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />}
            </div>
            <div className="mt-[16px] text-[14px] text-cream">{x.name}</div>
            <div className="mt-[8px] truncate text-[11.5px] text-dim">{x.tags.slice(0, 3).join(" · ")}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
