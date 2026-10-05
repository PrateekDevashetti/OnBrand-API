---
name: onbrand-search
description: Ground visual design decisions in real websites instead of inventing a look. Use whenever you need design references — the user describes a style or mood ("calm editorial fintech", "dark brutalist dev tools"), names sites to borrow from ("type like linear.app, colours like ramp.com"), asks for brands that look like an existing site ("competitors of acme.com"), or asks for a website with no visual direction at all ("build a site for my bakery"). Powered by OnBrand by Canopy Labs.
---

# OnBrand Search — find real references before you design

OnBrand keeps an index of real brand websites, each with a screenshot, palette, type pairing and taxonomy tags. Search it, look at what comes back, and only then commit to a direction.

Tools come from the `onbrand` MCP server (`search_brands`, `search_similar_brands`, `extract_brand`, `poll_brand_extraction`, `get_brand_extraction_result`). Without the server, use `scripts/onbrand.sh` with `ONBRAND_API_KEY` set.

## 1. Pick the right lens

| The prompt gives you… | Do this |
| --- | --- |
| A description of a look | `search_brands(query)` |
| A site that *is* the reference ("make it look like stripe.com") | `extract_brand(url)` directly; no search needed |
| A site to find neighbours for ("sites like patagonia.com") | Extract it (or reuse its `extraction_id`), then `search_similar_brands(extraction_id)`, **and** run a `search_brands` query about what the site is (industry, audience) for its wider neighbourhood |
| No visual direction at all | `search_brands` with only the facts given (industry, page type, audience). Let the results propose directions. |

## 2. Write the query from the user's words

- Carry over the user's industry, page type, audience and any style, colour or layout words **verbatim**. If they said "vintage", search "vintage", not "retro".
- Add no adjectives they didn't use. If they gave no style, name no style.
- Drop empty praise ("unique", "modern", "beautiful") and search the fact that's left.
- Non-negotiables go in `filters`, not the query: `page_type`, `industry`, `hue`, `layout`. Filters are hard constraints; the query only ranks.
- Default `top_k: 6`. Go up to 12 for a moodboard. Use `depth: "deep"` only when shortlisting (it costs 2 credits and re-ranks with reasons).

## 3. Inspect every result, in order

Results come back ranked. Treat every card as evidence, including any marked `badge: "discovery"` (a fresh exemplar rotated in to widen the set).

For each card, in the order returned: read `identity_paragraph`, `tags`, `palette` and `typography`, then **open `screenshot_url` and look at it**. Do not re-rank on a hunch. Set a card aside only when you can name the mismatch against the prompt. If a claim depends on motion or interaction, check the live `url`.

## 4. Extract only when you need exact values

The card and screenshot are often enough to choose a direction. Run `extract_brand(url)` when you'll build directly from a source and need its real tokens, or when you need an `extraction_id` for `search_similar_brands`. Poll with `poll_brand_extraction`, then read narrowly: `get_brand_extraction_result(id, sections: ["colors", "typography"])`. If an extraction fails, move to the next ranked result from the same query.

To build a page inside the chosen brand, hand off to the `onbrand-adherence` skill.

## Rules

- Never present a reference you haven't looked at.
- Quote values from the cards or the extraction, never from memory.
- Credits: search 1 (fast) or 2 (deep), similar 1, extraction 2. Check `get_credits` before long loops.
- API keys: `/app/api-keys` in the OnBrand dashboard.

## Shell fallback

```bash
export ONBRAND_API_KEY=ob_live_...
scripts/onbrand.sh search "warm pastel skincare landing page" fast 6
scripts/onbrand.sh similar ext_123 12
scripts/onbrand.sh extract https://aesop.com colors,typography
```
