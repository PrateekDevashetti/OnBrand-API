# OnBrand API — handoff and pending work

Last updated: 2026-10-06. Pick up from here next time.

## Where things stand

OnBrand API (Canopy Labs) is **live at https://brand.trycanopy.space**. It is Canopy's brand layer for AI agents:
brand extraction, style search, and adherence checks, through a dashboard, a REST API, an MCP server, agent skills
and a TypeScript SDK.

| Area | State |
|---|---|
| Web app + API + MCP | Vercel project `onbrand-api` (team `prateekdevashettis-projects`), root dir `apps/web` |
| Engine worker | Railway project `onbrand-api`, service `onbrand-worker` (root `Dockerfile`, Playwright image) |
| Database | Neon project `onbrand-api` (`frosty-rain-25331856`, us-east-1, Postgres 18), schema current |
| File storage | Cloudflare R2 bucket shared with Canopy, prefix `onbrand/` |
| Auth | Clerk **development** instance `clerk-canary-paddle` ("Canopy OnBrand API") via the Vercel Marketplace |
| Domain | `brand.trycanopy.space` (DNS at GoDaddy, CNAME `brand` → `cname.vercel-dns.com`) |
| Code | GitHub `PrateekDevashetti/OnBrand-API`, branch `feat/platform` (the only remote branch, set as default) |
| Health | `GET /api/health` (web + database); worker logs `[worker] up · concurrency 3 · browser ok` |

### Verification at handoff

- **Production e2e:** 41/41 pass across tasks #8–#18 (`tests/e2e`, tester-army `e2e`); 2 local-only checks skipped.
- **API + MCP smoke:** 50/50 (`qa/api-smoke.mts`).
- **Extraction accuracy:** 12/12 golden sites, 100% colour and font recall (`npm run eval -w @onbrand/core`).
- **UI parity vs the Taste screenshots** (27 dashboard screens, `docs/PARITY.md`): layout **96.9%**, design **96.7%**;
  13 of 27 screens ≥ 97% design. Landing sections 83.7%, mostly deliberate differences (own imagery and copy).
- **Layout + accessibility audits:** 0 overlap/overflow/contrast failures at 375 / 768 / 1280 / 1920 px.

## Pending — needs a decision or action from you

### 1. Roll the Clerk production secret key (security, do first)
A live Clerk secret key (`sk_live_…`) for the unused OnBrand **production** instance was pasted into a chat
on 2026-10-06. Nothing uses it, but rotate it: Clerk dashboard → Canopy OnBrand API → Production → API keys → roll.

### 2. Move sign-in off Clerk's development instance (before a public launch)
Today sign-in shows Clerk's "Development mode" label and is capped at 100 users. Fine for beta.

What we tried and why it is stuck:
- The Marketplace-created production instance has a placeholder domain (`lucky.parrot-4391.lcl.dev`).
- Clerk's API refuses to change it: `domain_managed_by_integration` ("Update them from the Vercel integration settings").
- Vercel's integration settings refuse `brand.trycanopy.space` as "already assigned", most likely because the
  **canvas app's Clerk production instance already owns `trycanopy.space`** (`clerk.trycanopy.space`, `accounts.trycanopy.space`).

Recommended path (option A): **share the canvas's Clerk production app.** One Canopy account works on
app.trycanopy.space and brand.trycanopy.space, with no new DNS.
1. Vercel → Integrations → Clerk → `clerk-canary-paddle` → Projects → disconnect `onbrand-api` (otherwise the
   integration keeps writing its dev keys over ours). Keep the Clerk app for rollback.
2. From the canvas Clerk app (Vercel project `floraxfauna`) → Production → API keys, set on `onbrand-api` production:
   `vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --force` and
   `vercel env add CLERK_SECRET_KEY production --force --sensitive`.
3. Canvas Clerk app → Domains → Allowed subdomains → add `brand` if needed.
4. Redeploy (preview → verify → `vercel promote`), then check Clerk scripts load from `clerk.trycanopy.space`
   and sign-up/sign-in work.

After switching:
- Dev-instance accounts (including the QA user) won't exist; users sign up again or use their canvas account.
- Production Clerk has no test code (424242), so point the dashboard e2e tests at a preview deployment that keeps
  the dev instance.
- The unused GoDaddy CNAMEs `clerk.brand` and `accounts.brand` can be deleted either way.

### 3. Turn on paid plans (Stripe)
Checkout and webhook code is in place (`packages/core/src/billing.ts`, `apps/web/src/app/api/stripe/*`), but no
Stripe keys are set, so "Choose plan" sends an upgrade request instead. To enable: add `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` to Vercel production, point a Stripe webhook at
`https://brand.trycanopy.space/api/stripe/webhook`, then test checkout end to end (`qa/billing.mts` covers the
webhook signature and idempotency logic).
Plan prices live in `packages/core/src/plans.ts` ($79 / 600 credits, $599 / 6,000 — confirm before launch).

## Pending — engineering follow-ups (no input needed)

### 4. UI parity: 96.7% → 97%+ (design score)
Weakest screens and why (details in `docs/PARITY.md`):
- **Style Search (search 89.5, style detail 90.3, results 92.3):** several of Taste's featured sites have been
  redesigned or couldn't be identified; we use tone-matched substitutes.
- **Interactions 94.7, Media 93.5, Typography 96.7:** dropped on 2026-10-06 because **tastelabs.com changed its live
  fonts** (now a "Matter TRIAL" face with extra letter-spacing), so a fresh extraction makes taller cards than Taste's
  older screenshot. Options: pin a stored tastelabs capture for the QA fixture, or accept the drift.
- Viewer captures include the design-area dock (they are taken within 1.8 s of scrolling); at rest on desktop it hides.
Loop: `npx tsx qa/capture.mts` → `python3 qa/compare.py qa/pairs.tsv` (runs against the local server on :3100,
started with empty Clerk keys and `ONBRAND_DEV_AUTH=true`).

### 5. Small bugs noticed
- **Viewer scroll reset:** if you scroll the brand viewer within ~1 s of opening it, the panel can jump back to the
  top when data arrives (seen on phones). Likely a re-mount of `#panel` after the client fetch in
  `apps/web/src/components/brand/BrandViewer.tsx`.
- **Clerk new-device check in e2e:** after many sign-ins Clerk stops auto-sending the code; the helper now presses
  "Resend" first (`tests/e2e/helpers.ts`). Watch for flakiness.

### 6. Local AI key
The only Anthropic key on this Mac has no credit, so **local** extractions use the measured (no-AI) engine.
Production uses OpenRouter (`ONBRAND_LLM_AUTH_TOKEN`, `ANTHROPIC_BASE_URL=https://openrouter.ai/api`,
`ONBRAND_MODEL=anthropic/claude-opus-5.5`; the key has a $100/day limit). To get AI output locally, put a funded
key in the worktree `.env`.

### 7. Git housekeeping
- GitHub only has `feat/platform`, and it is the default branch. A local `main` exists in `~/OnBrand-API` with just
  the first skeleton commit. When ready: create `main` from `feat/platform` on GitHub, make it default, and work in
  branches + PRs from then on.
- The Clerk Marketplace install added agent-skill files under `.agents/` — harmless; keep or delete.

### 8. Ongoing rules to remember
- **Railway variables:** the worker's config is `.railway/railway.ts` (Infrastructure as Code). Every variable is
  declared with `preserve()`. **When you add a worker variable in Railway, also add `NAME: preserve(),` to that
  file**, or the next `railway config apply` deletes it. Always run `railway config plan` before `apply`.
- **Deploys:** deploy a preview (`vercel deploy`), verify it (`vercel curl /api/health --deployment <url>`),
  then `vercel promote <url>`.
- **Schema changes:** run `drizzle-kit push` against Neon yourself (from `packages/core`, with
  `DATABASE_URL="$(npx -y neonctl@latest connection-string --project-id frosty-rain-25331856)"`).
- **Style index:** publish local index changes to production with `packages/core/src/seed/publish.ts`.
  Screenshot keys are versioned because `/api/files/*` is cached on the CDN as immutable.
- **Disk:** this Mac runs low (≈1.6 GB free at handoff). Clear `apps/web/.next`, npm/uv caches if builds fail with ENOSPC.

## How to resume

```bash
cd ~/OnBrand-API/.claude/worktrees/build          # or a fresh clone of feat/platform
npm ci
# local Postgres db `onbrand` + .env (see .env.example)
npm run dev -w apps/web                            # http://localhost:3100
```

QA credentials:
- **Production QA user** (Clerk dev instance): `onbrand-qa+clerk_test@example.com`, verification code `424242`,
  Clerk user id `user_3KJ7a0QziO7EYTIfVqR0Cz6duEI`. Its password and the e2e API key were kept in a temporary job
  folder that will not survive; reset the password in Clerk (Users → that user) or create a new `+clerk_test` user,
  then mint a key with `qa/prod-key.mts`.
- **Run production e2e:**
  `E2E_BASE_URL=https://brand.trycanopy.space E2E_API_KEY=ob_live_… E2E_EMAIL=… E2E_PASSWORD=… npx e2e run tests/e2e`
  (the QA account needs credits; top up with SQL against Neon if it runs out).

Related docs: `README.md` (architecture, API, MCP, skills), `docs/PARITY.md` (design scorecard).
