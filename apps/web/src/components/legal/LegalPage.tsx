import { PublicFooter, PublicHeader } from "@/components/landing/PublicHeader";

export type LegalSection = { h: string; p: (string | string[])[] };

/** Shared layout for Terms / Privacy / Acceptable Use. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-[#1e1e1e] text-cream">
      <PublicHeader />
      <main className="mx-auto max-w-[760px] px-[24px] pt-[64px] pb-[96px]">
        <h1 className="text-[37px] leading-none">{title}</h1>
        <p className="mt-[14px] font-mono text-[12px] text-mute">Last updated {updated}</p>
        <p className="mt-[28px] text-[16px] leading-[1.65] text-dim">{intro}</p>
        {sections.map((s) => (
          <section key={s.h} className="mt-[40px]">
            <h2 className="text-[20px]">{s.h}</h2>
            {s.p.map((x, i) =>
              Array.isArray(x) ? (
                <ul key={i} className="mt-[12px] list-disc space-y-[6px] pl-[20px] text-[15px] leading-[1.65] text-dim">
                  {x.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="mt-[12px] text-[15px] leading-[1.65] text-dim">
                  {x}
                </p>
              ),
            )}
          </section>
        ))}
        <p className="mt-[48px] text-[14px] text-dim">
          Questions: <a href="mailto:support@trycanopy.space" className="text-cream underline underline-offset-2">support@trycanopy.space</a>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
