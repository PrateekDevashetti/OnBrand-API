"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "../ui/Segmented";
import { InfoTip } from "../ui/Tooltip";

export function ExtractForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [depth, setDepth] = useState<"deep" | "light">("deep");
  const [source, setSource] = useState<"cached" | "fresh">("cached");
  const [pages, setPages] = useState<"all" | "single">("single");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(target?: string) {
    const u = (target ?? url).trim();
    if (!u) return setError("Paste a URL to extract");
    setBusy(true);
    setError("");
    const res = await fetch("/api/v1/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: u, depth, cache: source === "cached", pages }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(j?.error?.message ?? "Extraction failed to start");
    }
    router.push(`/app/extractions/${j.id}`);
  }

  return (
    <>
      <div className="mx-auto w-[702px] max-w-full">
        <div className="mb-[18px] text-[11.5px] text-cream">Try any brand, just drop the url</div>
        <div className="rounded-[10px] bg-[#202020] p-[4px] pb-[14px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="relative"
          >
            <input
              className="cream-input h-[48px] pr-14"
              placeholder="https://add-url-here.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={busy}
              aria-label="Extract"
              className="absolute top-1/2 right-[9px] flex h-[32px] w-[32px] -translate-y-1/2 items-center justify-center rounded-full bg-[#141414] text-cream transition-transform hover:scale-105 disabled:opacity-60"
            >
              {busy ? (
                <span className="spin h-3.5 w-3.5 rounded-full border border-cream/30 border-t-cream" />
              ) : (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M3 9 9 3M4.3 3H9v4.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>
          <div className="mt-[20px] flex items-start justify-between gap-4 px-[16px]">
            <div>
              <div className="mb-[10px] flex items-center gap-[6px] text-[11.5px] text-mute">
                Extraction depth <InfoTip text="Deep runs an extra AI review pass that refines each part of the extracted design system. It's more thorough, but ~1-3 min slower. Light returns the first-pass result." />
              </div>
              <Segmented size="sm" value={depth} onChange={setDepth} options={[{ value: "deep", label: "Deep" }, { value: "light", label: "Light" }]} />
            </div>
            <div>
              <div className="mb-[10px] flex items-center gap-[6px] text-[11.5px] text-mute">
                Source of extraction <InfoTip text="Use cached instantly returns this URL's most recent completed extraction if it's still fresh. Fetch from scratch ignores the cache and re-crawls the live site." />
              </div>
              <Segmented size="sm" value={source} onChange={setSource} options={[{ value: "cached", label: "Use cached" }, { value: "fresh", label: "Fetch from scratch" }]} />
            </div>
            <div>
              <div className="mb-[10px] flex items-center gap-[6px] text-[11.5px] text-mute">
                Pages extracted <InfoTip text="URL added only extracts just the page you enter. All pages also discovers other pages on the same domain and extracts each one (up to 20)." />
              </div>
              <Segmented size="sm" value={pages} onChange={setPages} options={[{ value: "all", label: "All pages" }, { value: "single", label: "URL added only" }]} />
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-center text-[13px] text-bad">{error}</p>}
      </div>
      <div className="absolute right-[60px] bottom-[28px] flex items-center gap-[12px]">
        <span className="mr-[28px] text-[15px] text-cream">Suggested extractions</span>
        {[
          { name: "Modal", url: "https://modal.com" },
          { name: "Databricks", url: "https://www.databricks.com" },
          { name: "Linear", url: "https://linear.app" },
        ].map((s) => (
          <button key={s.name} type="button" onClick={() => (setUrl(s.url), submit(s.url))} className="flex h-[40px] items-center gap-[8px] rounded-[4px] border border-cream/80 px-[20px] text-[14px] text-cream transition-colors hover:bg-cream hover:text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=32`} alt="" className="h-[15px] w-[15px] rounded-[3px]" />
            {s.name}
          </button>
        ))}
      </div>
    </>
  );
}
