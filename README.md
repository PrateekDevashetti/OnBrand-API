# OnBrand API — by Canopy Labs

**The brand layer for AI agents.** A Canopy Labs product line alongside Canopy Canvas.

OnBrand turns any website into an agent-ready brand system, finds brand systems that match a vibe, and scores whether what an agent built stays on brand — over a REST API, an MCP server, agent skills and a TypeScript SDK, with a full dashboard.

| Endpoint | What it does | Credits |
| --- | --- | --- |
| **Brand Extraction** `POST /api/v1/extract` | Identity, colours, typography, surfaces, layout, elevation, interactions, structure, data display, motion, navigation, icons, page sections, media + design tokens (CSS / Tailwind / JSON), artifacts (HTML, CSS, screenshots) | 2 (cached = free) |
| **Style Search** `POST /api/v1/search` | Natural-language search over a curated index of brand systems; deep mode reranks with Claude and explains each match | 1 light / 2 deep |
| **Verify Adherence** `POST /api/v1/adherence` | Scores a built page against a reference brand across 7 categories (measured ΔE colour distance, font overlap, token overlap + AI critique) and returns fixes for an agent loop | 2 |

## Architecture

```
apps/web      Next.js 16 — landing, dashboard, REST API (/api/v1), MCP (/api/mcp)   → Vercel
apps/worker   Engine worker — claims jobs from Postgres (SKIP LOCKED), runs Playwright → Railway
packages/core Engine + data: crawler, signal collector, analysis, Claude synthesis,
              adherence scoring, style search, credits, queue, storage, evals
packages/sdk  @canopylabs/onbrand — TypeScript client
skills/onbrand  Agent skill (npx skills add PrateekDevashetti/OnBrand-API)
qa/           Visual parity harness (screenshots + SSIM vs reference) and SDK smoke test
```

**Extraction pipeline:** headless Chromium renders the page (1440×900), dismisses cookie walls, lazy-scrolls, then an in-page collector measures computed styles on ~4k elements (colour weight by area + role, text styles, borders, radii, shadows, transitions, keyframes, @font-face, CSS variables, media queries, buttons + their *measured* hover state, nav, logo, icons, media, sections). `analyze.ts` clusters colours perceptually (CIEDE2000), builds the type scale, breakpoints and tokens. Six section groups are synthesized **in parallel** by Claude with structured outputs (schema-validated JSON) and streamed into the record as each lands; *deep* adds a review pass. If no LLM is configured — or a call fails — a deterministic synthesizer fills the section from measured signals, so every extraction completes.

**Quality:** `npm run eval -w @onbrand/core` runs golden-site extraction evals (colour recall within ΔE<6, font recall, mode, section detection, completeness) and adherence sanity checks (same brand scores high, unrelated brands low). Current: 100% colour recall, 100% font recall on the golden set; adherence 78 (same brand) vs 45 (unrelated). Every API/MCP request is logged to `api_requests`; user feedback goes to `feedback`.

## Run locally

```bash
cp .env.example .env            # set DATABASE_URL (+ ANTHROPIC_API_KEY for full synthesis)
npm install
npx -y playwright@1.63.0 install chromium   # or set CHROMIUM_PATH
npm run db:push                 # create tables
npm run db:seed                 # crawl + index ~54 curated brands for Style Search
npm run dev                     # http://localhost:3100  (inline engine, single-user dev auth)
```

## Deploy (Vercel + Railway)

1. **Railway**: create a project with **Postgres**, plus a service from this repo (root). `railway.json` builds with Chromium, runs `db:push` pre-deploy and starts the worker (`/health`). Env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `S3_*`, `WORKER_CONCURRENCY`.
2. **Object storage**: an S3-compatible bucket (Cloudflare R2 / S3) — set `S3_*` on both web and worker.
3. **Vercel**: import the repo with Root Directory `apps/web` (`vercel.json` installs/builds from the monorepo root). Env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ONBRAND_ENGINE_MODE=worker`, `S3_*`, Clerk keys, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`.
4. **Clerk**: create an application; set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`. `/app/*` is then protected and users get 20 signup credits.
5. Seed the index once against production: `DATABASE_URL=… S3_…=… npm run db:seed`.

## Agents

```bash
# MCP (Claude Code)
claude mcp add --transport http onbrand https://<host>/api/mcp --header "Authorization: Bearer ob_live_…"
# Skill
npx skills add PrateekDevashetti/OnBrand-API
```

```ts
import { OnBrand } from "@canopylabs/onbrand";
const onbrand = new OnBrand({ apiKey: process.env.ONBRAND_API_KEY });
const ext = await onbrand.extract({ url: "https://linear.app", wait: true });
const report = await onbrand.verify({ reference: "https://linear.app", design: "https://my-build.vercel.app", wait: true });
```

Full reference: `/app/docs` in the dashboard.

## Visual QA

```bash
npx tsx qa/shot.mts /app /app/extract …      # 1920×1080 screenshots
python3 qa/compare.py qa/pairs.tsv            # SSIM vs reference captures + side-by-side sheets
```

See `docs/PARITY.md` for the latest scorecard. Open work and how to resume: `docs/PENDING.md`.
