import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="font-mono text-[13px] text-mute">404</span>
      <h1 className="mt-4 text-[30px] leading-tight text-cream">Nothing here</h1>
      <p className="mt-3 max-w-[440px] text-[15px] text-dim">This extraction, search or report doesn&apos;t exist, or it belongs to another account.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/app" className="btn-outline">Home</Link>
        <Link href="/app/history" className="btn-outline">History</Link>
      </div>
    </div>
  );
}
