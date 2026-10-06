// Task #9 — API v1 lifecycle: async extract → poll → result, sections, visibility,
// download, enhance, search (filters, similar, history), adherence verdicts, error envelope.
import { test } from "e2e";
import { api, expect, hasKey, isLocal, waitForResult } from "./helpers";

const REF = "https://linear.app";
const CAND = "https://resend.com";

test("error envelope: invalid JSON, sections, filters, same URL, unknown ids", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  expect((await api("POST", "/api/v1/extract", { url: REF, sections: ["colours"] })).json?.error?.code).toBe("invalid_sections");
  expect((await api("POST", "/api/v1/search", { query: "studio", filters: { hue: "chartreuse" } })).json?.error?.code).toBe("invalid_filter");
  expect((await api("POST", "/api/v1/adherence", { reference_url: REF, candidate_url: REF })).json?.error?.code).toBe("same_url");
  expect((await api("GET", "/api/v1/extract/ext_doesnotexist/result")).status).toBe(404);
});

test("extraction lifecycle: create, poll, narrow, download, visibility, enhance", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const start = await api("POST", "/api/v1/extract", { url: REF, depth: "light" });
  expect([200, 202]).toContain(start.status);
  const id = start.json.id as string;
  const done = await waitForResult(`/api/v1/extract/${id}/result`);
  expect(done.json?.status).toBe("completed");
  for (const s of ["identity", "colors", "typography", "layout", "interactions"]) expect(done.json?.brand?.[s]).toBeDefined();

  const narrow = await api("GET", `/api/v1/extract/${id}/result?sections=colors`);
  expect(narrow.json?.brand?.colors).toBeDefined();
  expect(narrow.json?.brand?.layout).toBeUndefined();

  const dl = await api("GET", `/api/v1/extract/${id}/download`);
  expect(dl.json?.files?.some((f: any) => f.path === "brand.json")).toBe(true);

  if (!isLocal) expect((await api("GET", `/api/v1/extract/${id}/result`, undefined, false)).status).toBe(404);
  expect((await api("PATCH", `/api/v1/extract/${id}/visibility`, { is_public: true })).json?.is_public).toBe(true);
  expect((await api("GET", `/api/v1/extract/${id}/result?sections=identity`, undefined, false)).status).toBe(200);
  await api("PATCH", `/api/v1/extract/${id}/visibility`, { is_public: false });

  const enh = await api("POST", "/api/v1/enhance", { extraction_id: id, prompt: "Design a pricing page with three plans" });
  expect(enh.status).toBe(200);
  expect((enh.json?.enhanced_prompt ?? "").length).toBeGreaterThan(80);

  const sim = await api("GET", `/api/v1/search/similar?extraction_id=${id}&top_k=4`);
  expect(sim.json?.results).toHaveLength(4);
});

test("style search: cards, hard filters, history", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const s = await api("POST", "/api/v1/search", { query: "dark bold creative studio with expressive typography", top_k: 6 });
  expect(s.status).toBe(200);
  expect(s.json?.results).toHaveLength(6);
  const card = s.json.results[0];
  expect(card).toMatchObject({ url: expect.any(String), identity_paragraph: expect.any(String), tags: expect.any(Array) });
  const f = await api("POST", "/api/v1/search", { query: "studio portfolio", filters: { industry: "creative_agency" }, top_k: 6 });
  expect(f.json.results.every((r: any) => r.facets?.industry?.includes("creative_agency"))).toBe(true);
  const hist = await api("GET", "/api/v1/search?limit=3");
  expect(hist.json?.data?.length).toBeGreaterThan(0);
});

test("adherence: 202 then a verdict with score, recommendations and fixes", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const start = await api("POST", "/api/v1/adherence", { reference_url: REF, candidate_url: CAND });
  expect(start.status).toBe(202);
  const v = await waitForResult(`/api/v1/adherence/${start.json.id}/result`);
  expect(v.json?.status).toBe("completed");
  expect(v.json?.score).toBeGreaterThanOrEqual(0);
  expect(v.json?.score).toBeLessThanOrEqual(1);
  expect(Array.isArray(v.json?.recommendations)).toBe(true);
  expect(Array.isArray(v.json?.fixes)).toBe(true);
});
