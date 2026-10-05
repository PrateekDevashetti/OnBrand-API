"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Segmented } from "../ui/Segmented";
import { Select } from "../ui/Select";
import { SearchIcon } from "../ui/icons";

export function HistoryControls({ keys }: { keys: { id: string; name: string }[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const tab = (sp.get("tab") ?? "extractions") as "extractions" | "search" | "adherence";
  const [q, setQ] = useState(sp.get("q") ?? "");

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v == null || v === "" || v === "all" ? next.delete(k) : next.set(k, v));
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => q !== (sp.get("q") ?? "") && set({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <div className="mt-[34px]">
        <Segmented value={tab} onChange={(v) => set({ tab: v, q: null, status: null, key: null, from: null, depth: null })} options={[{ value: "extractions", label: "Extractions" }, { value: "search", label: "Search" }, { value: "adherence", label: "Adherence" }]} />
      </div>
      <div className="mt-[30px] flex items-center gap-[30px]">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-[16px] -translate-y-1/2 text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-[38px] w-full rounded-[4px] bg-card pr-4 pl-[40px] text-[13.5px] text-cream outline-none placeholder:text-dim" />
        </div>
        <div className="flex gap-[8px]">
          {tab === "extractions" && (
            <>
              <Select value={sp.get("key") ?? "all"} onChange={(v) => set({ key: v })} options={[{ value: "all", label: "API Key" }, ...keys.map((k) => ({ value: k.id, label: k.name }))]} />
              <Select value={sp.get("from") ?? "all"} onChange={(v) => set({ from: v })} options={[{ value: "all", label: "Request from" }, { value: "playground", label: "Playground" }, { value: "api", label: "API" }, { value: "mcp", label: "MCP" }]} />
            </>
          )}
          <Select value={sp.get("status") ?? "all"} onChange={(v) => set({ status: v })} options={[{ value: "all", label: "All statuses" }, { value: "completed", label: "Completed" }, { value: "running", label: "Running" }, { value: "failed", label: "Failed" }]} />
          {tab === "search" && <Select value={sp.get("depth") ?? "all"} onChange={(v) => set({ depth: v })} options={[{ value: "all", label: "Search Depth" }, { value: "light", label: "Light" }, { value: "deep", label: "Deep" }]} />}
        </div>
      </div>
    </>
  );
}
