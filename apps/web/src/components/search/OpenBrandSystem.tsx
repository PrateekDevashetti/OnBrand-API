"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoCircle } from "../ui/icons";

export function OpenBrandSystem({ url, extractionId }: { url: string; extractionId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function open() {
    if (extractionId) {
      const r = await fetch(`/api/v1/extract/${extractionId}?fields=status`);
      if (r.ok) return router.push(`/app/extractions/${extractionId}`);
    }
    setBusy(true);
    const res = await fetch("/api/v1/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, depth: "light", cache: true }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.push(`/app/extractions/${j.id}`);
    else alert(j?.error?.message ?? "Could not open brand system");
  }
  return (
    <button type="button" onClick={open} disabled={busy} className="flex items-center gap-[10px] text-[13.5px] text-cream transition-opacity hover:opacity-80 disabled:opacity-50">
      {busy ? "Extracting…" : "Open all Brand System"}
      <GoCircle size={30} />
    </button>
  );
}
