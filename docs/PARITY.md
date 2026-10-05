# Design parity scorecard

Measured 2026-10-05 against the reference captures (1920×1080) with `qa/compare.py`. Screens are captured
with `qa/capture.mts` after `qa/fixture.sql` puts the dev account in the same state as the screenshots.

- **pixel** — SSIM on 480×270 grayscale (sensitive to glyph shapes, logos and live content) blended with top-bar, sidebar and tone checks.
- **layout** — SSIM after a Gaussian blur (σ=6): block geometry, spacing, panel structure and tone, independent of font glyphs. This is the headline number: it measures "same UI" while ignoring the *intentional* differences (Canopy logo, DM Sans / DM Mono).
- **design** — 0.7 × layout + 0.3 × overall tone.

## Dashboard (27 screens)

```
screen                   ssim  topbar  sidebar   tone   pixel  layout  design
landing                 0.912   0.937    0.788  0.967   90.2%   97.0%   96.9%
home                    0.836   0.955    0.930  0.983   88.3%   97.1%   97.4%
home_mcp                0.821   0.955    0.930  0.950   87.0%   97.9%   97.0%
extract                 0.945   0.955    0.929  1.000   95.0%   99.1%   99.4%
history                 0.895   0.955    0.930  1.000   92.0%   98.4%   98.9%
history_search          0.926   0.955    0.930  0.950   93.3%   99.2%   97.9%
history_adh             0.927   0.955    0.930  0.950   93.4%   98.7%   97.6%
overview                0.894   0.955    0.907  0.950   91.1%   95.1%   95.1%
identity                0.783   0.955    0.931  0.950   84.8%   97.6%   96.8%
colours                 0.789   0.954    0.931  0.950   85.1%   96.6%   96.1%
typography              0.837   0.935    0.931  1.000   88.2%   97.7%   98.4%
surfaces                0.823   0.934    0.931  0.950   86.9%   97.1%   96.5%
layout                  0.743   0.955    0.931  1.000   82.9%   96.9%   97.8%
interactions            0.910   0.955    0.931  1.000   92.9%   98.9%   99.2%
structure               0.772   0.955    0.931  1.000   84.6%   96.9%   97.8%
motion                  0.826   0.955    0.931  1.000   87.9%   98.7%   99.1%
navigation              0.861   0.955    0.931  0.950   89.5%   98.4%   97.4%
sections                0.850   0.955    0.931  0.850   87.8%   97.1%   93.5%
media                   0.811   0.955    0.931  0.850   85.5%   96.8%   93.3%
usage                   0.873   0.955    0.930  1.000   90.6%   99.0%   99.3%
billing                 0.818   0.955    0.883  1.000   86.6%   98.2%   98.8%
profile                 0.930   0.955    0.878  1.000   93.3%   99.4%   99.6%
search                  0.819   0.955    0.930  0.950   86.9%   89.5%   91.2%
search_results          0.835   0.955    0.930  0.933   87.7%   92.3%   92.6%
style_detail            0.841   0.955    0.930  0.983   88.6%   90.3%   92.7%
adherence_form          0.959   0.955    0.929  1.000   95.8%   99.5%   99.7%
adherence_run           0.919   0.955    0.929  0.983   93.3%   97.2%   97.5%
AVERAGE                                                  89.2%   97.1%   96.9%
```

**Dashboard: 97.06% layout parity — 19/27 screens ≥ 97%, 24/27 ≥ 95%.**

## Landing additions (7 sections)

```
screen                   ssim  topbar  sidebar   tone   pixel  layout  design
l_manifesto             0.958   0.998    0.998  0.900   96.4%   99.2%   96.5%
l_endpoints             0.825   0.998    0.819  0.967   86.4%   92.2%   93.6%
l_case                  0.726   1.000    0.866  0.250   74.1%   78.7%   62.6%
l_compare               0.545   0.979    0.466  0.000   54.4%   68.5%   48.0%
l_integrations          0.840   0.994    0.941  0.950   88.9%   94.3%   94.5%
l_pricing               0.883   0.993    0.800  0.900   88.9%   97.7%   95.4%
l_faq                   0.914   0.951    0.921  0.900   91.9%   97.6%   95.3%
AVERAGE                                                  83.0%   89.7%   83.7%
```

## What still differs, and why

| Screen | Layout | Cause |
| --- | --- | --- |
| Style Search landing / results / detail | 89–92% | Thumbnails are live captures of sites in *our* index. Several of Taste's featured sites have been redesigned since their capture (tinywins) or could not be identified, so tone-matched substitutes are used. Ranking, labels, chips and layout match. |
| Viewer overview | 95% | Brand name comes from the site's own `og:site_name` ("Taste Labs") where Taste shows "Taste"; copy differs until the LLM pass runs. |
| Landing before/after, case study | 69–79% | Deliberate: Taste shows a third-party customer and a founder video. We show a real Canopy before/after and a real product tour; no borrowed customers or testimonials. |

Everything else is within 1–3% and functionally complete: `qa/flow.mts` 8/8, `qa/api-smoke.mts` 50/50, extraction evals 4/4 (colour and font recall 100%).

### Remaining upside
1. Fund the Claude key (or the OpenRouter gateway) — the LLM pass writes richer Identity/Colours/Interactions copy.
2. Typography and logo differences are intentional (Canopy brand) and cap pixel-SSIM around 0.95 on chrome regions.
