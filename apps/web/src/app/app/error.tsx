"use client";

import Link from "next/link";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="font-mono text-[13px] text-bad">Something went wrong</span>
      <h1 className="mt-4 text-[28px] leading-tight text-cream">We couldn&apos;t load this page</h1>
      <p className="mt-3 max-w-[460px] text-[15px] text-dim">Try again in a moment. If it keeps happening, email support@trycanopy.space{error.digest ? ` with reference ${error.digest}` : ""}.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-outline">Try again</button>
        <Link href="/app" className="btn-outline">Home</Link>
      </div>
    </div>
  );
}
