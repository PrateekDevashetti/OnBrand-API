import { CodeBlock } from "@/components/ui/CodeBlock";
import { config } from "@/lib/config";

export const metadata = { title: "Documentation" };

const A = config.apiBase;

type Endpoint = { method: string; path: string; credits: string; body?: string; desc: string; example: string; response?: string };

const ENDPOINTS: { id: string; title: string; intro: string; items: Endpoint[] }[] = [
  {
    id: "extract",
    title: "Brand Extraction",
    intro: "Turn any URL into an agent-ready brand system: identity, colours, typography, surfaces, layout, elevation, interactions, motion, navigation, icons, page sections, media and design tokens. Extractions run asynchronously; poll the job or pass ?wait=true.",
    items: [
      {
        method: "POST",
        path: "/extract",
        credits: "2 credits (cached results are free)",
        body: `{
  "url": "https://linear.app",        // required
  "depth": "deep" | "light",           // default deep — deep adds an AI review pass
  "cache": true,                       // reuse a fresh extraction of the same URL
  "pages": "single" | "all",           // all = discover up to 20 same-domain pages
  "max_pages": 20
}`,
        desc: "Start an extraction. Returns 202 with a job you can poll, or 200 with the finished brand system when served from cache or when ?wait=true.",
        example: `curl ${A}/extract?wait=true \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{ "url": "https://linear.app", "depth": "light" }'`,
        response: `{
  "id": "ext_8h2k...",
  "object": "extraction",
  "status": "completed",
  "url": "https://linear.app/",
  "palette": ["#08090A", "#F7F8F8", "#5E6AD2"],
  "stages": [{ "key": "crawl", "status": "done" }, ...],
  "artifacts": { "screenshot": "...", "html": "...", "css": "..." },
  "brand": {
    "identity":   { "companyName": "Linear", "summary": "...", "keywords": [...] },
    "colors":     { "baseline": [{ "name": "Void", "hex": "#08090A", ... }], ... },
    "typography": { "families": [...], "titles": [...], "body": [...] },
    "layout": {...}, "elevation": {...}, "interactions": {...},
    "motion": {...}, "navigation": {...}, "icons": {...},
    "sections": [...], "media": [...],
    "tokens": { "color": {...}, "font": {...}, "css": ":root { ... }" }
  }
}`,
      },
      { method: "GET", path: "/extract/{id}", credits: "free", desc: "Fetch status, stages and the (partial or complete) brand system. Sections stream in as they finish; add ?fields=status for a light poll.", example: `curl ${A}/extract/ext_8h2k... -H 'Authorization: Bearer YOUR_API_KEY'` },
      { method: "GET", path: "/extract/{id}/tokens?format=json|css|tailwind", credits: "free", desc: "Design tokens as JSON, CSS custom properties or a Tailwind v4 @theme block.", example: `curl '${A}/extract/ext_8h2k.../tokens?format=tailwind' -H 'Authorization: Bearer YOUR_API_KEY'` },
      { method: "GET", path: "/extract/{id}/brief", credits: "free", desc: "A compact markdown brief of the brand — drop it straight into an agent's system prompt.", example: `curl ${A}/extract/ext_8h2k.../brief -H 'Authorization: Bearer YOUR_API_KEY'` },
      { method: "POST", path: "/extract/{id}/enhance", credits: "free", body: `{ "prompt": "Create a pricing page with three tiers" }`, desc: "Prompt Enhancer: rewrite a design prompt into a golden prompt grounded in this brand's exact values.", example: `curl ${A}/extract/ext_8h2k.../enhance \\
  -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "prompt": "Create a pricing page with three tiers" }'` },
      { method: "GET", path: "/extract/{id}/bundle", credits: "free", desc: "Everything as a .zip: brand.json, tokens.css, brief.md, source.html, styles.css and screenshots.", example: `curl -OJ ${A}/extract/ext_8h2k.../bundle -H 'Authorization: Bearer YOUR_API_KEY'` },
    ],
  },
  {
    id: "search",
    title: "Style Search",
    intro: "Your end user doesn't have a brand? Describe a vibe in natural language and retrieve matching brand systems from our curated index.",
    items: [
      {
        method: "POST",
        path: "/search",
        credits: "Light 1 credit · Deep 2 credits",
        body: `{
  "query": "dark bold creative studio with expressive typography",
  "depth": "light" | "deep",          // deep reranks with AI and explains each match
  "limit": 6,                          // 1-24
  "filters": ["Agency", "Bold"]        // optional facets
}`,
        desc: "Returns ranked brand systems with a match label (Strong Match, Good Match, Related, Discovery), palette, typography summary, screenshot and reasoning.",
        example: `curl ${A}/search \\
  -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "query": "calm fintech with editorial serif headlines", "depth": "deep" }'`,
      },
      { method: "GET", path: "/styles/{id}", credits: "free", desc: "A single indexed brand with similar brands.", example: `curl ${A}/styles/sty_... -H 'Authorization: Bearer YOUR_API_KEY'` },
    ],
  },
  {
    id: "adherence",
    title: "Verify Adherence",
    intro: "Check whether what your agent produced stays on brand. Scores 7 categories (visual identity, spatial identity, colours, typography, layout, surfaces, elevation) by blending measured similarity (ΔE colour distance, font-family overlap, token overlap) with an AI critique — and returns instructions your agent loop can apply.",
    items: [
      {
        method: "POST",
        path: "/adherence",
        credits: "2 credits (both extractions included)",
        body: `{ "reference": "https://linear.app", "design": "https://my-redesign.vercel.app" }`,
        desc: "Starts a verification. Poll GET /adherence/{id} (add ?include=sides for both brand systems) or pass ?wait=true.",
        example: `curl '${A}/adherence?wait=true' \\
  -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "reference": "https://linear.app", "design": "https://my-redesign.vercel.app" }'`,
        response: `{
  "id": "adh_...", "status": "completed", "score": 78,
  "report": {
    "overall": { "score": 78, "grade": "C", "summary": "..." },
    "categories": [{ "key": "colors", "score": 84, "matches": [...], "deviations": [...], "fixes": [...] }, ...],
    "agentInstructions": "1. Replace #3B82F6 accents with #5E6AD2 ..."
  }
}`,
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    intro: "Balance and usage for the key's owner.",
    items: [
      { method: "GET", path: "/me", credits: "free", desc: "Profile, plan and credit balance.", example: `curl ${A}/me -H 'Authorization: Bearer YOUR_API_KEY'` },
      { method: "GET", path: "/usage?feature=extraction&days=30", credits: "free", desc: "Daily usage series, totals and latency for the dashboard charts.", example: `curl '${A}/usage?days=7' -H 'Authorization: Bearer YOUR_API_KEY'` },
    ],
  },
];

const TOC = [
  ["quickstart", "Quickstart"],
  ["auth", "Authentication"],
  ...ENDPOINTS.map((e) => [e.id, e.title]),
  ["mcp", "MCP server"],
  ["skills", "Agent skills"],
  ["sdk", "TypeScript SDK"],
  ["errors", "Errors & limits"],
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-8 pt-[56px] text-[28px] text-cream">
      {children}
    </h2>
  );
}

export default function DocsPage() {
  return (
    <div className="flex gap-[56px] px-[50px] pt-[50px] pb-[80px]">
      <nav className="sticky top-[30px] w-[180px] shrink-0 self-start">
        <div className="eyebrow mb-4">Docs</div>
        {TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="block py-[7px] text-[13.5px] text-dim hover:text-cream">
            {label}
          </a>
        ))}
      </nav>
      <article className="min-w-0 max-w-[880px] flex-1">
        <h1 className="text-[37px] leading-none text-cream">Documentation</h1>
        <p className="mt-[22px] text-[19px] leading-[1.5] text-dim">OnBrand by Canopy Labs is the brand layer for AI agents: extract any brand system, search for style inspiration, and verify that what your agents make stays on brand — over REST, MCP or agent skills.</p>

        <H2 id="quickstart">Quickstart</H2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] text-dim">
          <li>Create a key on the API Keys page.</li>
          <li>Extract a brand, then feed <code className="font-mono text-cream">brand</code>, <code className="font-mono text-cream">/tokens</code> or <code className="font-mono text-cream">/brief</code> to your agent.</li>
          <li>After your agent builds something, call <code className="font-mono text-cream">/adherence</code> and loop on the returned instructions until the score clears your bar.</li>
        </ol>
        <CodeBlock className="mt-5" code={`curl ${A}/extract?wait=true \\\n  --header 'Authorization: Bearer YOUR_API_KEY' \\\n  --header 'Content-Type: application/json' \\\n  --data '{ "url": "https://stripe.com" }'`} />

        <H2 id="auth">Authentication</H2>
        <p className="mt-4 text-[14px] leading-[1.6] text-dim">
          Send your key as <code className="font-mono text-cream">Authorization: Bearer ob_live_…</code> or <code className="font-mono text-cream">X-API-Key</code>. Base URL: <code className="font-mono text-cream">{A}</code>. Keys are hashed at rest and shown once at creation.
        </p>

        {ENDPOINTS.map((g) => (
          <section key={g.id}>
            <H2 id={g.id}>{g.title}</H2>
            <p className="mt-4 text-[14px] leading-[1.6] text-dim">{g.intro}</p>
            {g.items.map((e) => (
              <div key={e.path} className="mt-[30px] rounded-[10px] bg-card px-[24px] py-[22px]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-[3px] px-[7px] py-[2px] font-mono text-[11px] ${e.method === "GET" ? "bg-[#17331f] text-ok" : "bg-[#1b2c40] text-[#7fb6ff]"}`}>{e.method}</span>
                  <code className="font-mono text-[14px] text-cream">{e.path}</code>
                  <span className="ml-auto text-[11.5px] text-mute">{e.credits}</span>
                </div>
                <p className="mt-3 text-[13.5px] leading-[1.55] text-dim">{e.desc}</p>
                {e.body && <CodeBlock className="mt-4" code={e.body} plain />}
                <CodeBlock className="mt-3" code={e.example} />
                {e.response && <CodeBlock className="mt-3 max-h-[340px] overflow-y-auto" code={e.response} plain />}
              </div>
            ))}
          </section>
        ))}

        <H2 id="mcp">MCP server</H2>
        <p className="mt-4 text-[14px] leading-[1.6] text-dim">
          Streamable-HTTP MCP endpoint at <code className="font-mono text-cream">{config.mcpUrl}</code>. Tools: <code className="font-mono text-cream">extract_brand</code>, <code className="font-mono text-cream">get_brand</code>, <code className="font-mono text-cream">get_brand_tokens</code>, <code className="font-mono text-cream">get_brand_brief</code>, <code className="font-mono text-cream">enhance_prompt</code>, <code className="font-mono text-cream">search_styles</code>, <code className="font-mono text-cream">verify_adherence</code>, <code className="font-mono text-cream">get_adherence</code>, <code className="font-mono text-cream">get_credits</code>.
        </p>
        <CodeBlock className="mt-4" code={`claude mcp add --transport http onbrand ${config.mcpUrl} \\\n  --header "Authorization: Bearer YOUR_API_KEY"`} />
        <CodeBlock className="mt-3" plain code={JSON.stringify({ mcpServers: { onbrand: { url: config.mcpUrl, headers: { Authorization: "Bearer YOUR_API_KEY" } } } }, null, 2)} />

        <H2 id="skills">Agent skills</H2>
        <p className="mt-4 text-[14px] leading-[1.6] text-dim">The OnBrand skill teaches Claude Code, Codex, Cursor and other skill-aware agents the extract → build → verify loop.</p>
        <CodeBlock className="mt-4" code={`npx skills add ${config.skillsRepo}`} />

        <H2 id="sdk">TypeScript SDK</H2>
        <CodeBlock
          className="mt-4"
          plain
          code={`import { OnBrand } from "@canopylabs/onbrand";

const onbrand = new OnBrand({ apiKey: process.env.ONBRAND_API_KEY });

const brand = await onbrand.extract({ url: "https://linear.app", wait: true });
const tokens = await onbrand.tokens(brand.id, "tailwind");
const styles = await onbrand.search({ query: "warm editorial fintech", depth: "deep" });
const report = await onbrand.verify({ reference: "https://linear.app", design: "https://my-redesign.vercel.app", wait: true });
console.log(report.score, report.report?.agentInstructions);`}
        />

        <H2 id="errors">Errors & limits</H2>
        <div className="mt-4 overflow-hidden rounded-[10px] bg-card text-[13px]">
          {[
            ["400 invalid_request", "Body failed validation — the message lists the field."],
            ["401 unauthorized", "Missing or invalid API key."],
            ["402 insufficient_credits", "Top up on the Billing page; failed jobs are refunded automatically."],
            ["404 not_found", "Unknown id or it belongs to another account."],
            ["500 internal_error", "Something broke on our side. Retries are safe."],
          ].map(([c, d]) => (
            <div key={c} className="flex gap-6 border-b border-[#232322] px-5 py-3 last:border-0">
              <code className="w-[200px] shrink-0 font-mono text-cream">{c}</code>
              <span className="text-dim">{d}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
