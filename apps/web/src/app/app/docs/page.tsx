import { CodeBlock } from "@/components/ui/CodeBlock";
import { config } from "@/lib/config";
import { FILTER_VOCAB, MAX_SITE_PAGES } from "@onbrand/core";

export const metadata = { title: "Documentation" };

const A = config.apiBase;

type Endpoint = { method: string; path: string; credits: string; body?: string; desc: string; example: string; response?: string };

const ENDPOINTS: { id: string; title: string; intro: string; items: Endpoint[] }[] = [
  {
    id: "extract",
    title: "Brand Extraction",
    intro: "Turn any URL into an agent-ready brand system plus the artifacts it was measured from. Extraction is a job: start it, poll it, read it. Sections stream in as they finish, so you can read partial results while it runs.",
    items: [
      {
        method: "POST",
        path: "/extract",
        credits: "2 credits · refunded on failure",
        body: `{
  "url": "https://linear.app",          // required
  "force": false,                        // true = skip the cache and re-crawl
  "depth": "light" | "deep",             // deep adds an AI review pass (full extractions only)
  "sections": ["colors", "typography"],  // optional: extract only these sections
  "map": false,                          // true = also extract same-domain pages
  "max_pages": 20                        // map mode cap (max ${MAX_SITE_PAGES})
}`,
        desc: "Starts an extraction and returns 202 with its id (200 when a fresh cached result is reused; cache_hit tells you which). Sections: identity, colors, surfaces, typography, layout, elevation, structure, interactions, navigation, icons, motion, data_display, sections, media, tokens. Selective extractions are never used as a cache source, and can't be combined with map or deep.",
        example: `curl ${A}/extract \\
  --header 'X-API-Key: YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{ "url": "https://linear.app" }'`,
      },
      {
        method: "GET",
        path: "/extract/{id}/result?sections=colors,typography",
        credits: "free",
        desc: "The brand system and artifact links. While the job runs you get 200 with whatever has landed, or 409 not_ready before the first section. Keep polling until status is completed or failed. ?sections= narrows the payload, which matters for agents because a full system is large. Public extractions are readable without a key.",
        example: `curl '${A}/extract/ext_8h2k.../result?sections=colors,typography' -H 'X-API-Key: YOUR_API_KEY'`,
        response: `{
  "id": "ext_8h2k...", "object": "extraction", "status": "completed",
  "url": "https://linear.app/", "sections": null, "cache_hit": false, "is_public": false,
  "palette": ["#08090A", "#F7F8F8", "#5E6AD2"],
  "artifacts": { "screenshot": "...", "hero": "...", "html": "...", "css": "..." },
  "brand": {
    "colors":     { "baseline": [{ "name": "Void", "hex": "#08090A", "shades": [...] }], "secondary": [...] },
    "typography": { "families": [...], "titles": [...], "body": [...], "labels": [...] }
  }
}`,
      },
      { method: "GET", path: "/extract/{id}", credits: "free", desc: "Status, per-stage progress and partial results. Add ?fields=status for the lightest poll.", example: `curl ${A}/extract/ext_8h2k...?fields=status -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "GET", path: "/extract?status=&q=&api_key_id=&limit=&offset=", credits: "free", desc: "Your extractions, newest first, with total and totals (completed / failed / in_progress) for the whole filter.", example: `curl '${A}/extract?status=completed&limit=20' -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "GET", path: "/extract/{id}/download", credits: "free", desc: "A manifest of every file in a completed extraction: brand.json and tokens.json inline, plus URLs for the captured HTML, CSS, screenshots and media. Files are stored on our side, so links survive changes to the origin site. Prefer a zip? Use /extract/{id}/bundle.", example: `curl ${A}/extract/ext_8h2k.../download -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "PATCH", path: "/extract/{id}/visibility", credits: "free", body: `{ "is_public": true }`, desc: "Make an extraction readable from /result and /download without a key, e.g. to share it. Only the owner can change this.", example: `curl -X PATCH ${A}/extract/ext_8h2k.../visibility -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' -d '{ "is_public": true }'` },
      { method: "GET", path: "/extract/{id}/tokens?format=json|css|tailwind", credits: "free", desc: "Design tokens as JSON, CSS custom properties or a Tailwind v4 @theme block.", example: `curl '${A}/extract/ext_8h2k.../tokens?format=tailwind' -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "GET", path: "/extract/{id}/brief", credits: "free", desc: "A compact markdown brief of the brand, ready to drop into an agent's context.", example: `curl ${A}/extract/ext_8h2k.../brief -H 'X-API-Key: YOUR_API_KEY'` },
      {
        method: "POST",
        path: "/enhance",
        credits: "free",
        body: `{ "extraction_id": "ext_8h2k...", "prompt": "Design a pricing page with three tiers" }`,
        desc: "Rewrites a prompt so it's grounded in the brand's exact colours, type, layout and components. Synchronous. Needs a completed full extraction.",
        example: `curl ${A}/enhance -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "extraction_id": "ext_8h2k...", "prompt": "Design a pricing page" }'`,
      },
    ],
  },
  {
    id: "search",
    title: "Style Search",
    intro: "No brand yet? Describe a look in plain language and get ranked, real brands from the OnBrand index, each with a screenshot, palette, type pairing and taxonomy tags. Search is synchronous: nothing to poll. A card points into the index; extract its url to get the full system.",
    items: [
      {
        method: "POST",
        path: "/search",
        credits: "fast 1 credit · deep 2 credits",
        body: `{
  "query": "dark bold creative studio with expressive typography",
  "depth": "fast" | "deep",     // deep re-ranks with AI and explains each match
  "top_k": 6,                    // 1-30
  "filters": {                   // optional hard constraints
    "page_type": "homepage",
    "industry": "creative_agency",
    "hue": "red",
    "layout": "asymmetric_broken_grid"
  }
}`,
        desc: "Returns ranked cards with match (strong, good, related) and, on unfiltered searches, one rotating badge: \"discovery\" exemplar so repeat searches widen your set. Filters are hard constraints from a closed vocabulary (below); unknown values return 422.",
        example: `curl ${A}/search \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "query": "warm pastel skincare landing page", "top_k": 6 }'`,
        response: `{
  "object": "search", "id": "srch_...", "depth": "fast", "query_tags": ["Warm", "Skincare"],
  "results": [{
    "url": "https://aesop.com", "brand_name": "aesop", "match": "strong", "badge": null,
    "identity_paragraph": "...", "reason": null,
    "tags": ["Earthy", "Editorial", "Luxury"], "traits": ["Luxury", "Editorial", "Minimal"],
    "palette": { "primary": ["#FFFEF2", "#333333", "#B5A48B"], "secondary": [], "mode": "light" },
    "typography": "Suisse Intl + Zapf Humanist", "screenshot_url": "..."
  }]
}`,
      },
      { method: "GET", path: "/search/similar?extraction_id=&top_k=", credits: "1 credit", desc: "Brands in the index that look like one of your completed full extractions: palette distance, mode, type and keywords. Good for competitor sets and moodboards.", example: `curl '${A}/search/similar?extraction_id=ext_8h2k...&top_k=12' -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "GET", path: "/search?kind=search|similar&depth=&q=&limit=&offset=", credits: "free", desc: "Your search history, newest first, with total and total_by_status.", example: `curl '${A}/search?limit=20' -H 'X-API-Key: YOUR_API_KEY'` },
    ],
  },
  {
    id: "adherence",
    title: "Verify Adherence",
    intro: "Give two URLs: the reference brand (the standard) and a candidate page (a rebuild, a generated page, a redesign). Both sides are extracted automatically and the candidate is judged against the reference. The verdict is one score from 0 to 1, recommendations in prose, and structured fixes with exact target values. Both lists are worst-first, so they double as a work queue for an agent loop.",
    items: [
      {
        method: "POST",
        path: "/adherence",
        credits: "2 credits · both extractions included · refunded on failure",
        body: `{ "reference_url": "https://linear.app", "candidate_url": "https://my-redesign.vercel.app" }`,
        desc: "Starts a verification and returns 202 with its id. The candidate must be a public URL.",
        example: `curl ${A}/adherence \\
  -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "reference_url": "https://linear.app", "candidate_url": "https://my-redesign.vercel.app" }'`,
      },
      {
        method: "GET",
        path: "/adherence/{id}/result",
        credits: "free",
        desc: "The verdict. 409 not_ready while both pages are extracting; 424 adherence_failed if the run failed (stop polling; credits are refunded). Public runs are readable without a key.",
        example: `curl ${A}/adherence/adh_.../result -H 'X-API-Key: YOUR_API_KEY'`,
        response: `{
  "object": "adherence_verdict", "status": "completed", "score": 0.78, "grade": "C",
  "recommendations": [
    "Set headline type in Inter Display, sans-serif instead of Arial.",
    "Change the background-color from #FFFFFF to #08090A (--void)."
  ],
  "fixes": [
    { "action": "replace_font_family", "category": "typography", "property": "font-family", "role": "headline", "from": "Arial", "to_value": "Inter Display, sans-serif" },
    { "action": "snap_to_token", "category": "colors", "property": "background-color", "from": "#FFFFFF", "to_value": "#08090A", "token": "--void" },
    { "action": "add_color_token", "category": "colors", "token": "--accent", "value": "#5E6AD2", "role": "Accent", "usage": ["Buttons"] }
  ],
  "categories": [{ "key": "colors", "label": "Colours", "score": 0.84, "deviations": [...] }, ...]
}`,
      },
      { method: "GET", path: "/adherence/{id}", credits: "free", desc: "Status and stages. Add ?include=sides for both brand systems.", example: `curl ${A}/adherence/adh_... -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "GET", path: "/adherence?status=&q=&limit=&offset=", credits: "free", desc: "Your verifications, newest first, with total.", example: `curl '${A}/adherence?limit=20' -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "PATCH", path: "/adherence/{id}/visibility", credits: "free", body: `{ "is_public": true }`, desc: "Share a verdict: public runs are readable from /result without a key.", example: `curl -X PATCH ${A}/adherence/adh_.../visibility -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' -d '{ "is_public": true }'` },
    ],
  },
  {
    id: "account",
    title: "Account",
    intro: "Balance and usage for the key's owner.",
    items: [
      { method: "GET", path: "/me", credits: "free", desc: "Profile, plan and credit balance.", example: `curl ${A}/me -H 'X-API-Key: YOUR_API_KEY'` },
      { method: "GET", path: "/usage?feature=extraction&days=30", credits: "free", desc: "Daily usage series, totals and latency.", example: `curl '${A}/usage?days=7' -H 'X-API-Key: YOUR_API_KEY'` },
    ],
  },
];

const TOC = [
  ["quickstart", "Quickstart"],
  ["how", "How it works"],
  ["auth", "Authentication"],
  ...ENDPOINTS.map((e) => [e.id, e.title]),
  ["mcp", "MCP server"],
  ["skills", "Agent skills"],
  ["sdk", "TypeScript SDK"],
  ["filters", "Filter vocabulary"],
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
    <div className="flex gap-[56px] px-[50px] pt-[50px] pb-[80px] max-md:px-[20px] max-md:pt-[28px]">
      <nav className="sticky top-[30px] w-[180px] shrink-0 self-start max-lg:hidden">
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
          <li>
            <code className="font-mono text-cream">POST /extract</code> a URL, poll <code className="font-mono text-cream">/extract/{"{id}"}/result</code> until it&apos;s completed, and hand the brand (or <code className="font-mono text-cream">/brief</code>, <code className="font-mono text-cream">/tokens</code>) to your agent.
          </li>
          <li>
            After your agent ships a page, <code className="font-mono text-cream">POST /adherence</code> with the brand and the page, apply the returned <code className="font-mono text-cream">fixes</code> and <code className="font-mono text-cream">recommendations</code>, and re-verify.
          </li>
        </ol>
        <CodeBlock className="mt-5" code={`# 1. start
ID=$(curl -s ${A}/extract -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' \\
  -d '{ "url": "https://stripe.com" }' | jq -r .id)
# 2. poll until completed (409 means nothing has landed yet)
curl -s ${A}/extract/$ID/result -H 'X-API-Key: YOUR_API_KEY' | jq .status
# 3. read only what you need
curl -s "${A}/extract/$ID/result?sections=colors,typography" -H 'X-API-Key: YOUR_API_KEY'`} />

        <H2 id="how">How it works</H2>
        <div className="mt-5 grid grid-cols-3 gap-[12px] max-md:grid-cols-1">
          {[
            ["Extractor", "Renders the page in a real browser, measures computed styles, CSS, DOM structure and screenshots, then turns them into a brand system. Async job."],
            ["Search", "Ranks brands in the curated OnBrand index by your description or by similarity to one of your extractions. Synchronous."],
            ["Verifier", "Extracts a reference and a candidate, measures colour distance, type, surfaces, layout and elevation, then critiques both screenshots. Async job."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-[10px] bg-card px-[20px] py-[18px]">
              <div className="text-[15px] text-cream">{t}</div>
              <p className="mt-2 text-[13px] leading-[1.55] text-dim">{d}</p>
            </div>
          ))}
        </div>

        <H2 id="auth">Authentication</H2>
        <p className="mt-4 text-[14px] leading-[1.6] text-dim">
          Send your key in the <code className="font-mono text-cream">X-API-Key</code> header (or as <code className="font-mono text-cream">Authorization: Bearer ob_live_…</code>). Base URL: <code className="font-mono text-cream">{A}</code>. Keys are hashed at rest and shown once at creation. /result and /download on public extractions, and /result on public verifications, also work without a key. Errors share one envelope: <code className="font-mono text-cream">{`{ "error": { "code", "message" } }`}</code>.
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
          Streamable-HTTP MCP endpoint at <code className="font-mono text-cream">{config.mcpUrl}</code>, authenticated with your API key as a bearer token. The tools mirror the API one to one, so an agent can run the whole extract → build → verify loop in one conversation.
        </p>
        <CodeBlock className="mt-4" code={`claude mcp add --transport http onbrand ${config.mcpUrl} \\\n  --header "Authorization: Bearer YOUR_API_KEY"`} />
        <div className="mt-4 overflow-hidden rounded-[10px] bg-card text-[13px]">
          {[
            ["extract_brand(url, force?, sections?, map?)", "Start an extraction; returns extraction_id."],
            ["poll_brand_extraction(extraction_id)", "Lightweight status + which sections have landed."],
            ["get_brand_extraction_result(extraction_id, sections?)", "Read the brand system; narrow with sections."],
            ["list_brand_extractions(status?, search?)", "Your past extractions."],
            ["get_brand_brief / get_brand_tokens / enhance_prompt", "Markdown brief, CSS · Tailwind · JSON tokens, grounded prompts."],
            ["search_brands(query, depth?, top_k?, filters?)", "Find brands by a description of a look."],
            ["search_similar_brands(extraction_id, top_k?)", "Visual neighbours of a brand you extracted."],
            ["verify_brand_adherence(reference_url, candidate_url)", "Start a verification; returns adherence_id."],
            ["poll_brand_adherence / get_brand_adherence_result", "Status, then score + recommendations + fixes."],
            ["list_brand_adherence_jobs / get_credits", "History and balance."],
          ].map(([c, d]) => (
            <div key={c} className="flex gap-6 border-b border-[#232322] px-5 py-3 last:border-0">
              <code className="w-[380px] shrink-0 font-mono text-[12px] text-cream max-lg:w-[46%] max-lg:break-all">{c}</code>
              <span className="text-dim">{d}</span>
            </div>
          ))}
        </div>

        <H2 id="skills">Agent skills</H2>
        <p className="mt-4 text-[14px] leading-[1.6] text-dim">
          Skills teach skill-aware agents (Claude Code, Codex, Cursor and others) how to use the tools well. <code className="font-mono text-cream">onbrand-search</code> finds real references before the agent commits to a look and inspects every result. <code className="font-mono text-cream">onbrand-adherence</code> builds a page from a brand&apos;s exact values, then verifies it and applies the fixes. Install the skills, and connect the MCP server so they have tools to call.
        </p>
        <CodeBlock className="mt-4" code={`npx skills add ${config.skillsRepo}`} />

        <H2 id="sdk">TypeScript SDK</H2>
        <CodeBlock
          className="mt-4"
          plain
          code={`import { OnBrand } from "@canopylabs/onbrand";

const onbrand = new OnBrand({ apiKey: process.env.ONBRAND_API_KEY });

const ext = await onbrand.extract({ url: "https://linear.app", wait: true });
const brand = await onbrand.result(ext.id, { sections: ["colors", "typography"] });
const tokens = await onbrand.tokens(ext.id, "tailwind");

const { results } = await onbrand.search({ query: "warm editorial fintech", filters: { industry: "fintech" } });

const verdict = await onbrand.verify({ reference_url: "https://linear.app", candidate_url: "https://my-redesign.vercel.app", wait: true });
console.log(verdict.score, verdict.fixes, verdict.recommendations);`}
        />

        <H2 id="filters">Filter vocabulary</H2>
        <p className="mt-4 text-[14px] leading-[1.6] text-dim">Search filters are hard constraints matched against this closed vocabulary.</p>
        <div className="mt-4 overflow-hidden rounded-[10px] bg-card text-[13px]">
          {Object.entries(FILTER_VOCAB).map(([k, vals]) => (
            <div key={k} className="flex gap-6 border-b border-[#232322] px-5 py-3 last:border-0">
              <code className="w-[120px] shrink-0 font-mono text-cream">{k}</code>
              <span className="font-mono text-[12px] leading-[1.7] text-dim">{vals.join(" · ")}</span>
            </div>
          ))}
        </div>

        <H2 id="errors">Errors & limits</H2>
        <div className="mt-4 overflow-hidden rounded-[10px] bg-card text-[13px]">
          {[
            ["400 invalid_request · invalid_json", "Body failed validation; the message names the field."],
            ["401 unauthorized", "Missing, invalid or revoked API key."],
            ["402 insufficient_credits", "Not enough credits. Includes balance and needed. Failed jobs are refunded automatically."],
            ["404 not_found", "Unknown id, or it belongs to another account and isn't public."],
            ["409 not_ready", "The job hasn't produced anything yet. Keep polling (retry_after_ms is a hint)."],
            ["422 invalid_sections · invalid_filter", "A section name or filter value isn't in the vocabulary."],
            ["422 selective_map_unsupported", "sections can't be combined with map mode or deep depth."],
            ["422 full_extraction_required", "Similar search and enhance need a full extraction."],
            ["422 same_url", "Reference and candidate are the same page."],
            ["424 adherence_failed", "The verification failed for good. Stop polling; credits are refunded."],
            ["500 internal_error", "Something broke on our side. Retries are safe."],
          ].map(([c, d]) => (
            <div key={c} className="flex gap-6 border-b border-[#232322] px-5 py-3 last:border-0">
              <code className="w-[300px] shrink-0 font-mono text-cream max-lg:w-[40%] max-lg:break-all">{c}</code>
              <span className="text-dim">{d}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
