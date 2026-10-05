"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StyleResult } from "@onbrand/core/search";
import { Select } from "../ui/Select";
import { SearchIcon } from "../ui/icons";
import { Coverflow } from "../Coverflow";
import { FeaturedMasonry, ResultCard } from "./StyleCard";

const FACETS: Record<string, string[]> = {
  Style: ["Minimal", "Bold", "Editorial", "Fun"],
  "Website type": ["Homepage", "Portfolio", "Careers", "Pricing"],
  Industry: ["SaaS", "AI", "Agency", "E-commerce"],
  Layout: ["Breathing", "Tight", "Medium"],
};

type Search = { id: string; query: string; depth: string; tags: string[]; results: StyleResult[]; filters?: string[] };

export function SearchExperience({ featured, initial }: { featured: StyleResult[]; initial: Search | null }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial?.query ?? "");
  const [depth, setDepth] = useState<"light" | "deep">((initial?.depth as "light" | "deep") ?? "light");
  const [limit, setLimit] = useState(String(initial?.results.length || 6));
  const [filters, setFilters] = useState<string[]>(initial?.filters ?? []);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Search | null>(initial);
  const [order, setOrder] = useState("best");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => setResult(initial), [initial]);

  async function run(q = query, f = filters) {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/v1/search?raw=true", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, depth, limit: Number(limit), filters: f }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j?.error?.message ?? "Search failed");
    setResult({ id: j.id, query: j.query, depth: j.depth === "deep" ? "deep" : "light", tags: j.tags, results: j.raw, filters: f });
    router.replace(`/app/search?s=${j.id}`, { scroll: false });
  }

  const sorted = useMemo(() => {
    if (!result) return [];
    const r = [...result.results];
    if (order === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [result, order]);

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `onbrand-search-${result.id}.json`;
    a.click();
  }

  const showResults = !!result && !busy;
  const toggleFilter = (f: string) => setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div className="mx-auto w-[1156px] max-w-[calc(100%-64px)] pb-20">
      {!showResults && !busy && (
        <div className="pt-[50px]">
          <h1 className="text-[35px] leading-[1.15] text-cream">Search for any visual style</h1>
          <p className="mt-[32px] max-w-[560px] text-[19px] leading-[1.57] text-dim">Describe a visual style and watch how our API searches for beautiful websites that exactly match the vibe you&apos;re going for.</p>
        </div>
      )}
      {busy && !result && (
        <div className="pt-[50px]">
          <h1 className="text-[35px] leading-[1.15] text-cream">Search for any visual style</h1>
          <p className="mt-[32px] max-w-[560px] text-[19px] leading-[1.57] text-dim">Describe a visual style and watch how our API searches for beautiful websites that exactly match the vibe you&apos;re going for.</p>
        </div>
      )}
      <div className={`flex justify-end gap-[8px] ${showResults || (busy && result) ? "pt-[50px]" : "mt-[48px]"}`}>
        <Select prefix="Search depth" value={depth} onChange={setDepth} options={[{ value: "light", label: "Light" }, { value: "deep", label: "Deep" }]} />
        <Select prefix="Result Number" value={limit} onChange={setLimit} options={["3", "6", "9", "12"].map((v) => ({ value: v, label: v }))} />
      </div>
      <form
        className="relative mt-[20px]"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <SearchIcon className="absolute top-1/2 left-[17px] -translate-y-1/2 text-[#6b6d69]" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="dark bold creative studio with expressive typography" className="cream-input h-[48px] pr-14 pl-[38px] text-[15.5px]" spellCheck={false} />
        <button type="submit" aria-label="Search" disabled={busy} className="absolute top-1/2 right-[10px] flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-full bg-[#141414] text-cream transition-transform hover:scale-105 disabled:opacity-60">
          {busy ? <span className="spin h-3.5 w-3.5 rounded-full border border-cream/30 border-t-cream" /> : (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 9 9 3M4.3 3H9v4.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </button>
      </form>
      {error && <p className="mt-3 text-[13px] text-bad">{error}</p>}

      {showResults && (
        <>
          <div className="mt-[20px] flex flex-wrap items-center gap-[10px]">
            <div className="relative">
              <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="flex h-[30px] items-center gap-2 rounded-[4px] border border-line-2 px-3 text-[12px] text-dim hover:text-cream">
                Filters
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 3.6 5 6.6l3-3" stroke="currentColor" strokeWidth="1.2" /></svg>
              </button>
              {filtersOpen && (
                <div className="absolute top-[36px] left-0 z-30 grid w-[560px] grid-cols-4 gap-4 rounded-[8px] border border-line-2 bg-[#1f1f1f] p-4 shadow-xl">
                  {Object.entries(FACETS).map(([k, items]) => (
                    <div key={k}>
                      <div className="mb-2 text-[11px] text-mute">{k}</div>
                      {items.map((it) => (
                        <button key={it} type="button" onClick={() => toggleFilter(it)} className={`block py-1 text-left text-[13px] ${filters.includes(it) ? "text-cream" : "text-dim hover:text-cream"}`}>
                          {filters.includes(it) ? "✓ " : ""}
                          {it}
                        </button>
                      ))}
                    </div>
                  ))}
                  <button type="button" onClick={() => (setFiltersOpen(false), run(query, filters))} className="btn-solid col-span-4 h-[32px] text-[13px]">
                    Apply filters
                  </button>
                </div>
              )}
            </div>
            {(filters.length ? filters : result!.tags).map((t, i) => (
              <span key={t} className={`inline-flex h-[30px] items-center rounded-[4px] border px-[14px] text-[12.5px] ${i < 2 || filters.length ? "border-line-2 text-dim" : "border-line text-mute"}`}>
                {t}
              </span>
            ))}
          </div>
          <div className="mt-[52px] flex items-center justify-between">
            <h2 className="text-[19px] text-dim">These results are the ones your agent is inspired by</h2>
            <div className="flex items-center gap-[20px]">
              <Select prefix="Order by" value={order} onChange={setOrder} options={[{ value: "best", label: "Best Match" }, { value: "name", label: "Name" }]} />
              <button type="button" onClick={downloadJson} className="text-[12px] text-dim hover:text-cream">
                Download Results JSON →
              </button>
            </div>
          </div>
          <div className="mt-[20px] rounded-[14px] bg-card px-[30px] pt-[30px] pb-[24px]">
            {sorted.length ? (
              <div className="grid grid-cols-3 gap-x-[28px] gap-y-[26px]">
                {sorted.map((s) => (
                  <ResultCard key={s.id} s={s} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-dim">No brand systems matched. Try a broader description.</p>
            )}
          </div>
        </>
      )}

      {!showResults && (
        <div className="relative">
          {!busy && (
            <div className="mt-[30px] grid grid-cols-4 gap-[24px]">
              {Object.entries(FACETS).map(([k, items]) => (
                <div key={k}>
                  <div className="text-[12.5px] text-dim">{k}</div>
                  <div className="mt-[13px] flex flex-col items-start">
                    {items.map((it) => (
                      <button key={it} type="button" onClick={() => { const q = query || `${it.toLowerCase()} website`; setQuery(q); toggleFilter(it); run(q, [...filters, it]); }} className="text-[18px] leading-[1.5] text-cream transition-opacity hover:opacity-70">
                        {it}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={`mt-[48px] transition-all duration-500 ${busy ? "pointer-events-none opacity-40 blur-[6px]" : ""}`}>
            <FeaturedMasonry items={featured} />
          </div>
          {busy && (
            <div className="absolute inset-x-0 top-[180px] flex justify-center">
              <Coverflow images={featured.map((f) => f.screenshot).filter(Boolean) as string[]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
