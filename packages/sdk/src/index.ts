/**
 * OnBrand API client (Canopy Labs). Zero dependencies; works in Node 18+, Bun, Deno and the browser.
 *
 *   const onbrand = new OnBrand({ apiKey: process.env.ONBRAND_API_KEY });
 *   const ext = await onbrand.extract({ url: "https://linear.app", wait: true });
 *   const brand = await onbrand.result(ext.id, { sections: ["colors", "typography"] });
 */
export type OnBrandOptions = { apiKey?: string; baseUrl?: string; fetch?: typeof fetch };

export const SECTIONS = ["identity", "colors", "surfaces", "typography", "layout", "elevation", "structure", "interactions", "navigation", "icons", "motion", "data_display", "sections", "media", "tokens"] as const;
export type Section = (typeof SECTIONS)[number];

export type Status = "queued" | "running" | "completed" | "failed";

export type Extraction = {
  id: string;
  object: "extraction";
  status: Status;
  url: string;
  domain: string;
  company: string;
  depth: "deep" | "light";
  sections: Section[] | null;
  is_public: boolean;
  cache_hit: boolean;
  credits: number;
  palette: string[];
  stages: { key: string; label: string; status: string }[];
  artifacts: { screenshot: string | null; hero: string | null; html: string | null; css: string | null };
  brand?: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

export type SearchFilters = { page_type?: string; industry?: string; hue?: string; layout?: string };

export type BrandCard = {
  id: string;
  url: string;
  brand_name: string;
  label: string;
  identity_paragraph: string;
  match: "strong" | "good" | "related" | null;
  badge: "discovery" | null;
  reason: string | null;
  tags: string[];
  traits: string[];
  facets: Record<keyof SearchFilters, string[]> | null;
  palette: { primary: string[]; secondary: string[]; mode: string };
  typography: string;
  screenshot_url: string | null;
};

export type SearchResponse = { object: "search"; id: string; query: string; depth: "fast" | "deep"; filters: SearchFilters; query_tags: string[]; results: BrandCard[]; latency_ms: number };

export type Fix =
  | { action: "snap_to_token"; category: string; property: string; role?: string; from: string; to_value: string; token?: string }
  | { action: "add_color_token"; category: string; token: string; value: string; role: string; usage: string[] }
  | { action: "replace_font_family"; category: "typography"; property: "font-family"; role: string; from: string; to_value: string }
  | { action: "remove_off_brand_color"; category: "colors"; value: string; nearest_token: string; nearest_value: string };

export type Adherence = {
  id: string;
  object: "adherence";
  status: Status;
  reference_url: string;
  candidate_url: string;
  score: number | null;
  is_public: boolean;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

export type Verdict = {
  id: string;
  object: "adherence_verdict";
  status: Status;
  reference_url: string;
  candidate_url: string;
  /** 0-1 */
  score: number | null;
  grade: string | null;
  summary: string | null;
  recommendations: string[];
  fixes: Fix[];
  categories: { key: string; label: string; score: number; verdict: string; matches: string[]; deviations: string[] }[];
  agent_instructions: string | null;
};

export type Page<T> = { data: T[]; total: number; limit: number; offset: number };

export class OnBrandError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const qs = (o: Record<string, unknown>) => {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return p.length ? "?" + p.map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(",") : String(v))}`).join("&") : "";
};

export class OnBrand {
  private key: string;
  private base: string;
  private f: typeof fetch;

  constructor(opts: OnBrandOptions = {}) {
    const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
    this.key = opts.apiKey ?? env.ONBRAND_API_KEY ?? "";
    if (!this.key) throw new Error("OnBrand: pass apiKey or set ONBRAND_API_KEY");
    this.base = (opts.baseUrl ?? env.ONBRAND_API_URL ?? "https://brand.trycanopy.space").replace(/\/$/, "") + "/api/v1";
    this.f = opts.fetch ?? fetch;
  }

  private async req<T>(method: string, path: string, body?: unknown, raw = false): Promise<T> {
    const res = await this.f(`${this.base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
      throw new OnBrandError(res.status, j.error?.code ?? "http_error", j.error?.message ?? res.statusText);
    }
    return (raw ? await res.text() : await res.json()) as T;
  }

  // ---------- extraction ----------

  /**
   * Start an extraction. `wait: true` resolves when it finishes.
   * `sections` extracts only part of the system; `map: true` also extracts same-domain pages.
   */
  async extract(input: { url: string; force?: boolean; depth?: "deep" | "light"; sections?: Section[]; map?: boolean; max_pages?: number; wait?: boolean }): Promise<Extraction> {
    const { wait, ...body } = input;
    const e = await this.req<Extraction>("POST", "/extract", body);
    return wait ? this.waitForExtraction(e.id, e) : e;
  }

  /** Status + whatever has landed so far. */
  getExtraction(id: string) {
    return this.req<Extraction>("GET", `/extract/${id}`);
  }

  /** The brand system. Returns null while nothing has landed yet (409 not_ready). */
  async result(id: string, opts: { sections?: Section[] } = {}): Promise<Extraction | null> {
    try {
      return await this.req<Extraction>("GET", `/extract/${id}/result${qs({ sections: opts.sections })}`);
    } catch (e) {
      if (e instanceof OnBrandError && e.status === 409) return null;
      throw e;
    }
  }

  async waitForExtraction(id: string, cur?: Extraction, timeoutMs = 600_000): Promise<Extraction> {
    const end = Date.now() + timeoutMs;
    let e = cur ?? (await this.getExtraction(id));
    while ((e.status === "queued" || e.status === "running") && Date.now() < end) {
      await sleep(2500);
      e = await this.getExtraction(id);
    }
    return e;
  }

  listExtractions(opts: { status?: Status; q?: string; api_key_id?: string; limit?: number; offset?: number } = {}) {
    return this.req<Page<Record<string, unknown>> & { totals: { completed: number; failed: number; in_progress: number } }>("GET", `/extract${qs(opts)}`);
  }

  /** Every file in a completed extraction: brand.json inline + URLs for HTML, CSS, screenshots, media. */
  download(id: string) {
    return this.req<{ extraction_id: string; files: { path: string; content?: string; url?: string }[] }>("GET", `/extract/${id}/download`);
  }

  setExtractionVisibility(id: string, isPublic: boolean) {
    return this.req<Extraction>("PATCH", `/extract/${id}/visibility`, { is_public: isPublic });
  }

  /** Design tokens: JSON object, CSS custom properties, or a Tailwind v4 @theme block. */
  tokens(id: string, format: "json"): Promise<Record<string, unknown>>;
  tokens(id: string, format: "css" | "tailwind"): Promise<string>;
  tokens(id: string, format: "json" | "css" | "tailwind" = "json") {
    return format === "json" ? this.req<Record<string, unknown>>("GET", `/extract/${id}/tokens`) : this.req<string>("GET", `/extract/${id}/tokens?format=${format}`, undefined, true);
  }

  /** Agent-ready markdown brief. */
  brief(id: string) {
    return this.req<string>("GET", `/extract/${id}/brief`, undefined, true);
  }

  /** Rewrite a design prompt so it's grounded in the brand. Needs a full extraction. */
  async enhance(extractionId: string, prompt: string) {
    return (await this.req<{ enhanced_prompt: string }>("POST", "/enhance", { extraction_id: extractionId, prompt })).enhanced_prompt;
  }

  // ---------- search ----------

  /** Find brands by a description of a look. `filters` are hard constraints. */
  search(input: { query: string; depth?: "fast" | "deep"; top_k?: number; filters?: SearchFilters }) {
    return this.req<SearchResponse>("POST", "/search", input);
  }

  /** Visual neighbours of one of your completed (full) extractions. */
  similar(extractionId: string, topK = 12) {
    return this.req<{ id: string; source: { extraction_id: string; url: string }; results: BrandCard[] }>("GET", `/search/similar${qs({ extraction_id: extractionId, top_k: topK })}`);
  }

  searchHistory(opts: { kind?: "search" | "similar"; depth?: "fast" | "deep"; q?: string; limit?: number; offset?: number } = {}) {
    return this.req<Page<Record<string, unknown>> & { total_by_status: Record<string, number> }>("GET", `/search${qs(opts)}`);
  }

  // ---------- adherence ----------

  /** Start judging how well `candidate_url` follows `reference_url`'s brand. `wait: true` resolves with the verdict. */
  async verify(input: { reference_url: string; candidate_url: string; wait?: false }): Promise<Adherence>;
  async verify(input: { reference_url: string; candidate_url: string; wait: true }): Promise<Verdict>;
  async verify(input: { reference_url: string; candidate_url: string; wait?: boolean }): Promise<Adherence | Verdict> {
    const { wait, ...body } = input;
    const a = await this.req<Adherence>("POST", "/adherence", body);
    return wait ? this.waitForVerdict(a.id) : a;
  }

  getAdherence(id: string) {
    return this.req<Adherence>("GET", `/adherence/${id}`);
  }

  /** The verdict, or null while both pages are still being extracted (409). Throws on failed runs (424). */
  async verdict(id: string): Promise<Verdict | null> {
    try {
      return await this.req<Verdict>("GET", `/adherence/${id}/result`);
    } catch (e) {
      if (e instanceof OnBrandError && e.status === 409) return null;
      throw e;
    }
  }

  async waitForVerdict(id: string, timeoutMs = 600_000): Promise<Verdict> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const v = await this.verdict(id);
      if (v && v.status === "completed") return v;
      await sleep(3000);
    }
    throw new OnBrandError(408, "timeout", "Timed out waiting for the verdict");
  }

  listAdherence(opts: { status?: Status; q?: string; limit?: number; offset?: number } = {}) {
    return this.req<Page<Adherence>>("GET", `/adherence${qs(opts)}`);
  }

  setAdherenceVisibility(id: string, isPublic: boolean) {
    return this.req<Adherence>("PATCH", `/adherence/${id}/visibility`, { is_public: isPublic });
  }

  // ---------- account ----------

  me() {
    return this.req<{ id: string; email: string; credits: number; plan: string }>("GET", "/me");
  }
}

export default OnBrand;
