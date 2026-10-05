/**
 * OnBrand API client (Canopy Labs).
 *
 *   const onbrand = new OnBrand({ apiKey: process.env.ONBRAND_API_KEY });
 *   const ext = await onbrand.extract({ url: "https://linear.app", wait: true });
 */
export type OnBrandOptions = { apiKey?: string; baseUrl?: string; fetch?: typeof fetch };

export type Extraction = {
  id: string;
  object: "extraction";
  status: "queued" | "running" | "completed" | "failed";
  url: string;
  domain: string;
  company: string;
  palette: string[];
  stages: { key: string; label: string; status: string }[];
  artifacts: { screenshot: string | null; hero: string | null; html: string | null; css: string | null };
  brand?: Record<string, unknown> | null;
  error: string | null;
};

export type SearchResult = {
  id: string;
  query: string;
  tags: string[];
  results: { id: string; name: string; url: string; match: string; palette: string[]; typography: string; tags: string[]; reasoning: string; screenshot: string | null }[];
};

export type Adherence = {
  id: string;
  object: "adherence";
  status: "queued" | "running" | "completed" | "failed";
  score: number | null;
  report: {
    overall: { score: number; grade: string; summary: string };
    categories: { key: string; label: string; score: number; verdict: string; matches: string[]; deviations: string[]; fixes: string[] }[];
    agentInstructions: string;
  } | null;
  error: string | null;
};

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

export class OnBrand {
  private key: string;
  private base: string;
  private f: typeof fetch;

  constructor(opts: OnBrandOptions = {}) {
    const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
    this.key = opts.apiKey ?? env.ONBRAND_API_KEY ?? "";
    if (!this.key) throw new Error("OnBrand: pass apiKey or set ONBRAND_API_KEY");
    this.base = (opts.baseUrl ?? env.ONBRAND_API_URL ?? "https://onbrand.trycanopy.space").replace(/\/$/, "") + "/api/v1";
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

  /** Extract a brand system. `wait: true` resolves when the extraction finishes. */
  async extract(input: { url: string; depth?: "deep" | "light"; cache?: boolean; pages?: "single" | "all"; wait?: boolean }): Promise<Extraction> {
    const { wait, ...body } = input;
    const e = await this.req<Extraction>("POST", `/extract${wait ? "?wait=true" : ""}`, body);
    return wait ? this.waitForExtraction(e.id, e) : e;
  }

  getExtraction(id: string) {
    return this.req<Extraction>("GET", `/extract/${id}`);
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

  /** Rewrite a design prompt into a golden prompt grounded in the brand. */
  async enhance(id: string, prompt: string) {
    return (await this.req<{ prompt: string }>("POST", `/extract/${id}/enhance`, { prompt })).prompt;
  }

  search(input: { query: string; depth?: "light" | "deep"; limit?: number; filters?: string[] }) {
    return this.req<SearchResult>("POST", "/search", input);
  }

  /** Score a built page against a reference brand. */
  async verify(input: { reference: string; design: string; wait?: boolean }): Promise<Adherence> {
    const { wait, ...body } = input;
    let a = await this.req<Adherence>("POST", `/adherence${wait ? "?wait=true" : ""}`, body);
    const end = Date.now() + 600_000;
    while (wait && (a.status === "queued" || a.status === "running") && Date.now() < end) {
      await sleep(3000);
      a = await this.req<Adherence>("GET", `/adherence/${a.id}`);
    }
    return a;
  }

  me() {
    return this.req<{ id: string; credits: number; plan: string }>("GET", "/me");
  }
}

export default OnBrand;
