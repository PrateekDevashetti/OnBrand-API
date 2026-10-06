# OnBrand architecture diagrams

Interactive, source-backed diagrams for anyone taking OnBrand forward. Open the `.html` files in a browser
(they are standalone: pan, zoom, dark/light theme, guided views, node search, PNG/SVG export). Every node
links to the repository files and line ranges it is based on (pinned to commit `49fdd5c`).

| Diagram | What it answers | Open |
|---|---|---|
| **System architecture** | What runs where (Vercel, Railway, Neon, R2, Clerk, OpenRouter), how requests flow, with cards for *how it works*, *what happened*, *shortcomings* and *next steps*. Guided views: extraction path, agent access, auth and trust, where data lives. | [`architecture-onbrand-20261006-130500/onbrand-architecture.html`](architecture-onbrand-20261006-130500/onbrand-architecture.html) |
| **One extraction, end to end** | The exact message order for `POST /v1/extract` in worker mode: auth + rate limit + cache, credit debit + job, worker claim, guarded crawl, R2 upload, six parallel Claude calls, partial results, polling. Cards cover failure handling and known limits. | [`sequence-extraction-20261006-131500/onbrand-extraction-sequence.html`](sequence-extraction-20261006-131500/onbrand-extraction-sequence.html) |

Read alongside: [`../PENDING.md`](../PENDING.md) (open work, decisions, how to resume) and
[`../PARITY.md`](../PARITY.md) (UI parity scorecard).

## Updating a diagram

The diagrams are built with [Archify](https://github.com/tt-a1i/archify) (`npx skills add tt-a1i/archify -g`).
Each folder keeps the `candidate.json` source. Edit it, update `meta.repository.revision` to the new commit,
then re-render and re-check:

```bash
ARCHIFY_CHROME="<path to Chrome or Playwright Chromium>" \
node ~/.claude/skills/archify/bin/archify.mjs finalize architecture \
  docs/architecture/<folder>/candidate.json docs/architecture/<folder>/<name>.html \
  --repo-root . --quality showcase --json
```

A passing run reports `validate`, `deliver`, `check` and `browser-check` all `pass`. Use `sequence` instead of
`architecture` for the extraction diagram. Raw browser/delivery evidence files are git-ignored; the
`*.finalize-summary.json` receipt is kept.
