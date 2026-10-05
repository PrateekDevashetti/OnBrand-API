---
name: onbrand
description: Keep anything an agent designs or builds on brand. Use when the user asks to build, restyle or review a UI, landing page, email, deck or asset "in the style of" / "on brand with" a website, when they need a brand system (colours, typography, layout, components, tokens) from a URL, when they have no brand and want style inspiration, or when they want to check that something matches a reference brand. Powered by the OnBrand API by Canopy Labs.
---

# OnBrand — the brand layer for agents

OnBrand turns any website into an agent-ready brand system, finds brand systems that match a vibe, and scores how faithfully a built page follows a reference brand.

Use the **MCP tools** if the `onbrand` MCP server is connected (`extract_brand`, `get_brand_brief`, `get_brand_tokens`, `enhance_prompt`, `search_styles`, `verify_adherence`). Otherwise call the REST API with `scripts/onbrand.sh` (needs `ONBRAND_API_KEY`; optional `ONBRAND_API_URL`).

## The loop

1. **Get the brand.**
   - The user named a site → `extract_brand(url)` (≈2 credits, cached URLs free).
   - No brand yet → `search_styles(query)` with their words ("calm editorial fintech"), show the top matches, let them pick, then `extract_brand` on the pick.
2. **Load it into your context.** `get_brand_brief(id)` for the human-readable system and `get_brand_tokens(id, "tailwind" | "css")` for exact values. Treat these as the source of truth: never invent hex codes, fonts, radii or shadows that are not in the brief.
3. **Plan with a golden prompt.** `enhance_prompt(id, "<what you are about to build>")` and follow it.
4. **Build** using only the brand's tokens: colours by role (baseline → surfaces/text, accents sparingly), the type stacks and scale, the radius/shadow/border language, the button styles (default + hover), the layout rhythm and section separation, and the motion patterns.
5. **Verify.** Serve or deploy the result at a URL and call `verify_adherence(reference=<brand url>, design=<your url>)`. Apply the `fixes` / `agentInstructions`, rebuild, and re-verify until the overall score is **≥ 85** (or the user's bar). Report the final score and the remaining deviations honestly.

## Shell fallback

```bash
export ONBRAND_API_KEY=ob_live_...
scripts/onbrand.sh extract https://linear.app          # waits, prints id + summary
scripts/onbrand.sh brief ext_123                       # markdown brief
scripts/onbrand.sh tokens ext_123 tailwind             # @theme block
scripts/onbrand.sh enhance ext_123 "pricing page with three tiers"
scripts/onbrand.sh search "dark bold creative studio"
scripts/onbrand.sh verify https://linear.app https://my-build.vercel.app
```

## Rules

- Quote exact values from the brief (hex, font stack, px). If a value is missing, say so instead of guessing.
- Keep the brand's mode (dark/light), density and type pairing; don't "improve" the brand into a generic SaaS look.
- Credits: extraction 2, search 1–2, verify 2. Check `get_credits` before long loops; stop and tell the user if credits run out.
- Get an API key at https://onbrand.trycanopy.space/app/api-keys (or your deployment's /app/api-keys).
