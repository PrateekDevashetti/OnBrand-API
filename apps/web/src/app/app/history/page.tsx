import Link from "next/link";
import { Suspense } from "react";
import { listExtractions, listSearches, listAdherence, listApiKeys } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { HistoryControls } from "@/components/account/HistoryControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "History" };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sep", "Sept");

function Status({ s }: { s: string }) {
  const color = s === "completed" ? "bg-ok" : s === "failed" ? "bg-bad" : "bg-warn pulse-dot";
  return (
    <span className="flex items-center gap-[7px] text-[13.5px] text-cream capitalize">
      <span className={`h-[5px] w-[5px] rounded-full ${color}`} />
      {s === "queued" ? "Queued" : s}
    </span>
  );
}

const KEY_NAME = (keys: { id: string; name: string }[], id: string | null) => (id ? (keys.find((k) => k.id === id)?.name ?? "Revoked key") : "—");

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = (await getSessionUser())!;
  const tab = sp.tab ?? "extractions";
  const keys = (await listApiKeys(user.id)).map((k) => ({ id: k.id, name: k.name }));
  let table: React.ReactNode = null;
  let count = 0, total = 0;

  if (tab === "extractions") {
    const { rows, total: t } = await listExtractions(user.id, { q: sp.q, status: sp.status, apiKeyId: sp.key, from: sp.from, limit: 100 });
    count = rows.length;
    total = t;
    table = (
      <>
        <div className="grid grid-cols-[1.1fr_1.1fr_1.1fr_1.1fr_0.85fr_24px] border-b border-[#232322] px-[30px] py-[24px] text-[13.5px] text-dim">
          <span>Company</span><span>Extracted from</span><span>Request from</span><span>API Key</span><span>Status</span><span />
        </div>
        {rows.map((r) => (
          <Link key={r.id} href={`/app/extractions/${r.id}`} className="data-row group grid-cols-[1.1fr_1.1fr_1.1fr_1.1fr_0.85fr_24px]">
            <div>
              <div className="text-[13.5px] text-cream">{r.company}</div>
              <div className="mt-[4px] text-[11.5px] text-dim">{r.normalizedUrl}</div>
              <div className="mt-[9px] flex gap-[6px]">
                {r.palette.map((c) => <span key={c} className="h-[18px] w-[18px] rounded-full border border-white/10" style={{ background: c }} />)}
              </div>
              <div className="mt-[8px] text-[11.5px] text-dim">{r.credits ? `${r.credits} credits · ` : ""}{fmt(r.createdAt)}</div>
            </div>
            <span className="text-[11.5px] text-cream">{r.source === "cache" ? "Cache" : "New Extraction"}</span>
            <span className="text-[11.5px] text-cream">{r.pagesMode === "all" ? `All pages${r.children ? ` (${r.children + 1})` : ""}` : "Single"}{r.requestFrom !== "playground" ? ` · ${r.requestFrom.toUpperCase()}` : ""}</span>
            <span className="text-[13px] text-dim">{KEY_NAME(keys, r.apiKeyId)}</span>
            <Status s={r.status} />
            <span className="text-dim opacity-0 transition-opacity group-hover:opacity-100">›</span>
          </Link>
        ))}
      </>
    );
  } else if (tab === "search") {
    const rows = await listSearches(user.id, { q: sp.q, depth: sp.depth, limit: 100 });
    count = total = rows.length;
    table = (
      <>
        <div className="grid grid-cols-[1.6fr_1.6fr_0.6fr_1.4fr_0.6fr] border-b border-[#232322] px-[30px] py-[24px] text-[13.5px] text-dim">
          <span>Query</span><span>Query tags</span><span>Search depth</span><span>API Key</span><span>Status</span>
        </div>
        {rows.map((r) => (
          <Link key={r.id} href={`/app/search?s=${r.id}`} className="data-row grid-cols-[1.6fr_1.6fr_0.6fr_1.4fr_0.6fr]">
            <div>
              <div className="text-[11.5px] text-cream">{r.query}</div>
              <div className="mt-[10px] text-[11.5px] text-dim">{r.credits} credits · {fmt(r.createdAt)}</div>
            </div>
            <div className="flex flex-wrap gap-[10px]">
              {r.tags.slice(0, 3).map((t) => <span key={t} className="inline-flex h-[35px] items-center rounded-[6px] border border-[#55564f] px-[20px] text-[10.5px] text-dim">{t}</span>)}
            </div>
            <span className="text-[11.5px] text-cream">{r.depth === "deep" ? "Deep" : "Fast"}</span>
            <span className="text-[13px] text-dim">{KEY_NAME(keys, r.apiKeyId)}</span>
            <Status s={r.status} />
          </Link>
        ))}
      </>
    );
  } else {
    const rows = await listAdherence(user.id, { q: sp.q, status: sp.status, limit: 100 });
    count = total = rows.length;
    table = (
      <>
        <div className="grid grid-cols-[1fr_1fr_1fr_0.5fr] border-b border-[#232322] px-[30px] py-[24px] text-[13.5px] text-dim">
          <span>Page you built</span><span>Reference brand</span><span>API Key</span><span>Status</span>
        </div>
        {rows.map((r) => (
          <Link key={r.id} href={`/app/adherence/${r.id}`} className="data-row grid-cols-[1fr_1fr_1fr_0.5fr]">
            <div>
              <div className="text-[11.5px] text-cream">{r.designUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</div>
              <div className="mt-[10px] text-[11.5px] text-dim">{r.score != null ? `${Math.round(r.score)}/100 · ` : ""}{fmt(r.createdAt)}</div>
            </div>
            <span className="text-[11.5px] text-cream">{r.referenceUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
            <span className="text-[13px] text-dim">{KEY_NAME(keys, r.apiKeyId)}</span>
            <Status s={r.status} />
          </Link>
        ))}
      </>
    );
  }

  return (
    <div className="px-[50px] pt-[50px] pb-[40px]">
      <h1 className="text-[37px] leading-none text-cream">History</h1>
      <p className="mt-[22px] text-[19px] text-dim">Your API history</p>
      <Suspense>
        <HistoryControls keys={keys} />
      </Suspense>
      <div className="mt-[30px] overflow-hidden rounded-[2px] bg-card">
        {table}
        {count === 0 && <div className="px-[30px] py-[40px] text-[13px] text-dim">Nothing here yet.</div>}
      </div>
      <div className="mt-[30px] text-[11.5px] text-dim">Showing {count ? 1 : 0}–{count} of {total}</div>
    </div>
  );
}
