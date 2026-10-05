import { ExtractForm } from "@/components/extract/ExtractForm";

export const metadata = { title: "Brand Extraction" };

export default function ExtractPage() {
  return (
    <div className="relative flex min-h-full flex-col items-center px-8 pt-[251px] pb-[120px]">
      <span className="badge-beta">BETA</span>
      <h1 className="mt-[24px] text-center text-[35px] leading-[1.15] tracking-[-0.012em] text-cream">Extract any brand into a system for your agent</h1>
      <p className="mt-[24px] max-w-[740px] text-center text-[19px] leading-[1.55] text-dim">
        Any brand&apos;s design system, structured for agents. Paste a URL and get logos, colors, type, and motion back as data.
      </p>
      <div className="mt-[56px] w-full">
        <ExtractForm />
      </div>
    </div>
  );
}
