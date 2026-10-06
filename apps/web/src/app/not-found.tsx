import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/landing/PublicHeader";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1e1e1e] text-cream">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="font-mono text-[13px] text-mute">404</span>
        <h1 className="mt-4 text-[34px] leading-tight">This page is off brand.</h1>
        <p className="mt-3 max-w-[460px] text-[16px] text-dim">We couldn&apos;t find what you were looking for. It may have moved, or the link may be private.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="btn-outline">Home</Link>
          <Link href="/docs" className="btn-outline">Docs</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
