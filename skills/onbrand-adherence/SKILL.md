---
name: onbrand-adherence
description: Ship a new page, email, deck or asset that belongs to an existing brand, then prove it with OnBrand's verifier. Use when the user names one reference site and asks for something inside its identity ("a pricing page for stripe.com", "a careers page in linear.app's system", "as if their design team made it"), asks to restyle work to match a site, or asks to check whether a page is on brand. Powered by OnBrand by Canopy Labs.
---

# OnBrand Adherence — build inside a brand, then verify

OnBrand extracts a website into an exact brand system (colours, type, surfaces, layout, components, motion, tokens, captured HTML/CSS/screenshots) and scores how faithfully another page follows it. Your job: build from the brand's real values, then let the verifier, not your eyes, decide if it's on brand.

Tools come from the `onbrand` MCP server. Without it, use `scripts/onbrand.sh` with `ONBRAND_API_KEY` set.

## 1. Pull the whole brand, exactly

1. `extract_brand(reference_url)` → `poll_brand_extraction(id)` until `completed`.
2. Read it a few sections at a time and **save each answer to a file** (e.g. `.onbrand/colors.json`): `get_brand_extraction_result(id, sections: ["identity"])`, then `["colors","surfaces"]`, `["typography"]`, `["layout","elevation","structure"]`, `["interactions","navigation","icons","motion"]`, `["sections","media"]`.
3. `get_brand_tokens(id, format: "tailwind" | "css")` → save it.
4. Fetch the artifact links in the result (`screenshot`, `html`, `css`). The CSS has the real `@font-face` rules and the HTML has the real logo markup. The screenshot is the honest picture of density and mood.
5. Optional: `enhance_prompt(id, "<what you're building>")` for a brief grounded in the brand.

When you write code, **copy values out of those files**: exact hex, exact font stacks, sizes, radii, borders and shadows. Never retype from memory.

## 2. Compose inside hard rules

- Every colour traces to a brand token. No new hues.
- Load only the brand's typefaces, with its own `@font-face` sources where licensing allows; otherwise the documented fallback stack.
- Build buttons, inputs, cards and nav from the brand's own CSS (default *and* hover states).
- Keep the brand's mode (dark/light), density, section rhythm and type pairing.
- Layout, hierarchy and copy are yours to decide. The tokens are not.

## 3. Verify, apply, verify again

1. Put the page on a URL OnBrand can reach (a preview deploy works; `localhost` doesn't).
2. `verify_brand_adherence(reference_url, candidate_url)` → `poll_brand_adherence(id)` → `get_brand_adherence_result(id)`.
3. Apply **`fixes` first**. They're mechanical, with exact targets, and each has an `action`:
   - `snap_to_token`: change `property` from `from` to `to_value`
   - `add_color_token`: add `value` as `token` and use it where `usage` says
   - `replace_font_family`: swap the `role`'s stack to `to_value`
   - `remove_off_brand_color`: replace `value` with `nearest_value`
4. Then work through **`recommendations`**, top down (both lists are worst-first). For vague ones, re-read the relevant saved section before changing anything; a guess can lower the score.
5. Redeploy and re-verify. Stop when the score clears the bar (default **0.85**), stops improving between passes, or after **3 passes**. Report both scores and any deviations left.

## Rules

- Never claim a page is on brand without a verdict.
- If a value is missing from the extraction, say so instead of inventing one.
- Credits: extraction 2, verify 2, enhance free. Check `get_credits` before looping.
- To find a brand first, use the `onbrand-search` skill.

## Shell fallback

```bash
export ONBRAND_API_KEY=ob_live_...
scripts/onbrand.sh extract https://linear.app              # waits; prints id + summary
scripts/onbrand.sh result ext_123 colors,typography
scripts/onbrand.sh tokens ext_123 tailwind
scripts/onbrand.sh enhance ext_123 "pricing page with three tiers"
scripts/onbrand.sh verify https://linear.app https://my-build.vercel.app   # waits; prints verdict
```
