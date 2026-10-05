import { AdherenceForm } from "@/components/adherence/AdherenceForm";

export const metadata = { title: "Adherence" };

export default function AdherencePage() {
  return (
    <div className="relative flex min-h-full flex-col items-center px-8 pt-[327px] pb-[120px]">
      <span className="badge-alpha">ALPHA</span>
      <h1 className="mt-[22px] text-center text-[35px] leading-[1.15] tracking-[-0.012em] text-cream">Verify any design against its reference brand for your agent</h1>
      <p className="mt-[34px] text-center text-[19px] text-dim">Paste the reference brand and the page designed from it. Score covers colors, typography, and layout.</p>
      <div className="w-full">
        <AdherenceForm />
      </div>
    </div>
  );
}
