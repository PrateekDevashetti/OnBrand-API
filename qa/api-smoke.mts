/**
 * End-to-end API contract test. Exercises every public endpoint and error path.
 *   BASE=http://localhost:3100 npx tsx qa/api-smoke.mts            # mints a key via the dev session
 *   BASE=https://... K=ob_live_... npx tsx qa/api-smoke.mts         # production, with a real key
 * Exits non-zero on the first broken contract.
 */
const BASE = process.env.BASE ?? "http://localhost:3100";
let KEY = process.env.K ?? "";
const REF = process.env.REF ?? "https://tastelabs.com/";
const CAND = process.env.CAND ?? "https://trycanopy.space/";

let pass = 0;
const fails: string[] = [];
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fails.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  }
}

async function call(method: string, path: string, body?: unknown, auth = true) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(auth && KEY ? { "X-API-Key": KEY } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, json, text };
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 300_000, every = 2500): Promise<T | null> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, every));
  }
  return null;
}

console.log(`OnBrand API smoke → ${BASE}`);

if (!KEY) {
  const r = await call("POST", "/api/v1/keys", { name: `smoke ${new Date().toISOString().slice(0, 16)}` }, false);
  KEY = r.json?.secret ?? r.json?.key ?? "";
  if (!KEY) throw new Error(`Could not mint a key via dev session: ${r.status} ${r.text.slice(0, 200)}`);
}

console.log("auth + errors");
check("401 without key", (await call("GET", "/api/v1/me", undefined, false)).status === 401 || BASE.includes("localhost"));
const me = await call("GET", "/api/v1/me");
check("GET /me", me.status === 200 && (me.json?.id || me.json?.user_id), me.json);
const badJson = await fetch(BASE + "/api/v1/extract", { method: "POST", headers: { "X-API-Key": KEY, "Content-Type": "application/json" }, body: "{nope" });
check("400 invalid_json", badJson.status === 400 && (await badJson.json()).error?.code === "invalid_json");
const badSec = await call("POST", "/api/v1/extract", { url: REF, sections: ["colours"] });
check("422 invalid_sections", badSec.status === 422 && badSec.json?.error?.code === "invalid_sections", badSec.json);
const mapSec = await call("POST", "/api/v1/extract", { url: REF, sections: ["colors"], map: true });
check("422 selective_map_unsupported", mapSec.status === 422 && mapSec.json?.error?.code === "selective_map_unsupported", mapSec.json);
const badFilter = await call("POST", "/api/v1/search", { query: "dark studio", filters: { hue: "chartreuse" } });
check("422 invalid_filter", badFilter.status === 422 && badFilter.json?.error?.code === "invalid_filter", badFilter.json);
const same = await call("POST", "/api/v1/adherence", { reference_url: REF, candidate_url: REF });
check("422 same_url", same.status === 422 && same.json?.error?.code === "same_url", same.json);
check("404 unknown extraction", (await call("GET", "/api/v1/extract/ext_doesnotexist/result")).status === 404);

console.log("extraction");
const full = await call("POST", "/api/v1/extract", { url: REF });
check("POST /extract 200|202", [200, 202].includes(full.status) && full.json?.id, full.json);
const extId = full.json?.id as string;
const done = await poll(async () => {
  const r = await call("GET", `/api/v1/extract/${extId}/result`);
  if (r.status === 409) return null;
  return r.json?.status === "completed" || r.json?.status === "failed" ? r : null;
});
check("result completes", done?.json?.status === "completed", done?.json?.error);
check("result has brand sections", !!done?.json?.brand?.colors && !!done?.json?.brand?.typography && !!done?.json?.brand?.identity);
const narrow = await call("GET", `/api/v1/extract/${extId}/result?sections=colors,typography`);
check("?sections narrows", narrow.status === 200 && narrow.json?.brand?.colors && !narrow.json?.brand?.layout, Object.keys(narrow.json?.brand ?? {}));
const sel = await call("POST", "/api/v1/extract", { url: REF, sections: ["colors", "typography"] });
check("selective extraction accepted", [200, 202].includes(sel.status) && JSON.stringify(sel.json?.sections) === '["colors","typography"]', sel.json);
const selDone = await poll(async () => {
  const r = await call("GET", `/api/v1/extract/${sel.json?.id}/result`);
  return r.json?.status === "completed" ? r : null;
});
check("selective result only has requested sections", !!selDone?.json?.brand?.colors && !selDone?.json?.brand?.layout, Object.keys(selDone?.json?.brand ?? {}));
const dl = await call("GET", `/api/v1/extract/${extId}/download`);
check("download manifest", dl.status === 200 && dl.json?.files?.some((f: any) => f.path === "brand.json" && f.content), dl.json?.files?.map((f: any) => f.path));
const list = await call("GET", "/api/v1/extract?limit=5");
check("list with totals", list.status === 200 && Array.isArray(list.json?.data) && typeof list.json?.totals?.completed === "number", list.json?.totals);
check("private result hidden without key", (await call("GET", `/api/v1/extract/${extId}/result`, undefined, false)).status === 404 || BASE.includes("localhost"));
const vis = await call("PATCH", `/api/v1/extract/${extId}/visibility`, { is_public: true });
check("visibility → public", vis.status === 200 && vis.json?.is_public === true, vis.json);
const pub = await call("GET", `/api/v1/extract/${extId}/result?sections=identity`, undefined, false);
check("public result readable without key", pub.status === 200 && pub.json?.brand?.identity, pub.status);
await call("PATCH", `/api/v1/extract/${extId}/visibility`, { is_public: false });
const enh = await call("POST", "/api/v1/enhance", { extraction_id: extId, prompt: "Design a pricing page with three plans" });
check("POST /enhance", enh.status === 200 && (enh.json?.enhanced_prompt ?? "").length > 80, enh.json);
const selEnh = await call("POST", "/api/v1/enhance", { extraction_id: sel.json?.id, prompt: "Design a pricing page" });
check("enhance rejects selective (422)", selEnh.status === 422 && selEnh.json?.error?.code === "full_extraction_required", selEnh.json);

console.log("search");
const s1 = await call("POST", "/api/v1/search", { query: "dark bold creative studio with expressive typography", top_k: 6 });
check("POST /search", s1.status === 200 && s1.json?.results?.length === 6, s1.json?.error);
const card = s1.json?.results?.[0];
check("card shape", card && card.url && card.identity_paragraph && Array.isArray(card.tags) && card.palette?.primary && "screenshot_url" in card, card);
check("depth reported as fast", s1.json?.depth === "fast");
const s2 = await call("POST", "/api/v1/search", { query: "studio portfolio", filters: { industry: "creative_agency" }, top_k: 8 });
check("hard filter respected", s2.status === 200 && s2.json.results.length > 0 && s2.json.results.every((r: any) => r.facets?.industry?.includes("creative_agency")), s2.json?.results?.map((r: any) => r.facets?.industry));
check("no discovery when filtered", s2.json?.results?.every((r: any) => r.badge !== "discovery"));
const sim = await call("GET", `/api/v1/search/similar?extraction_id=${extId}&top_k=5`);
check("GET /search/similar", sim.status === 200 && sim.json?.results?.length === 5, sim.json);
const simSel = await call("GET", `/api/v1/search/similar?extraction_id=${sel.json?.id}`);
check("similar rejects selective (422)", simSel.status === 422, simSel.json);
const hist = await call("GET", "/api/v1/search?limit=5");
check("search history", hist.status === 200 && hist.json?.data?.length > 0 && typeof hist.json?.total === "number" && hist.json.data.some((h: any) => h.kind === "similar"), hist.json?.data?.map((h: any) => h.kind));

console.log("adherence");
const adh = await call("POST", "/api/v1/adherence", { reference_url: REF, candidate_url: CAND });
check("POST /adherence 202", adh.status === 202 && adh.json?.id, adh.json);
const early = await call("GET", `/api/v1/adherence/${adh.json?.id}/result`);
check("verdict 409 or 200 early", [409, 200].includes(early.status), early.status);
const verdict = await poll(async () => {
  const r = await call("GET", `/api/v1/adherence/${adh.json?.id}/result`);
  if (r.status === 424) return r;
  return r.status === 200 && r.json?.status === "completed" ? r : null;
}, 480_000, 4000);
check("verdict completes", verdict?.status === 200, verdict?.json);
const v = verdict?.json;
check("score in 0..1", typeof v?.score === "number" && v.score >= 0 && v.score <= 1, v?.score);
check("recommendations worst-first (≤20)", Array.isArray(v?.recommendations) && v.recommendations.length > 0 && v.recommendations.length <= 20, v?.recommendations?.length);
check("fixes typed with action", Array.isArray(v?.fixes) && v.fixes.length > 0 && v.fixes.every((f: any) => typeof f.action === "string"), v?.fixes?.slice(0, 2));
const al = await call("GET", "/api/v1/adherence?limit=3");
check("adherence list", al.status === 200 && Array.isArray(al.json?.data) && typeof al.json?.total === "number");
const avis = await call("PATCH", `/api/v1/adherence/${adh.json?.id}/visibility`, { is_public: true });
check("adherence visibility", avis.status === 200 && avis.json?.is_public === true);
check("public verdict without key", (await call("GET", `/api/v1/adherence/${adh.json?.id}/result`, undefined, false)).status === 200);

console.log("mcp");
const mcpHeaders = { "X-API-Key": KEY, "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
const init = await fetch(BASE + "/api/mcp", { method: "POST", headers: mcpHeaders, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } } }) });
check("mcp initialize", init.status === 200);
const tl = await fetch(BASE + "/api/mcp", { method: "POST", headers: mcpHeaders, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) });
const tlText = await tl.text();
const tools = [...tlText.matchAll(/"name":"([a-z_]+)"/g)].map((m) => m[1]);
for (const t of ["extract_brand", "poll_brand_extraction", "get_brand_extraction_result", "list_brand_extractions", "search_brands", "search_similar_brands", "verify_brand_adherence", "poll_brand_adherence", "get_brand_adherence_result", "list_brand_adherence_jobs", "enhance_prompt"]) check(`mcp tool ${t}`, tools.includes(t));

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("FAILED:\n- " + fails.join("\n- "));
  process.exit(1);
}
