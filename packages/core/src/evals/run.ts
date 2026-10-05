/**
 * Extraction + adherence evals.
 *   npx tsx src/evals/run.ts            # extraction evals (fresh crawl, light)
 *   npx tsx src/evals/run.ts --adherence
 * Writes a JSON report to <storage>/evals/<timestamp>.json
 */
import { differenceCiede2000, parse } from "culori";
import { ensureUser, addCredits, type Actor } from "../accounts";
import { createExtraction, getExtraction } from "../extract";
import { createAdherence, getAdherence } from "../adherence";
import { putObject } from "../storage";
import { GOLDEN, ADHERENCE_PAIRS } from "./golden";
import type { BrandSystem } from "../types";

const de = differenceCiede2000();
const actor: Actor = { userId: "eval_runner", via: "api" };

async function until<T>(load: () => Promise<T | undefined>, done: (t: T) => boolean, ms = 400_000) {
  const end = Date.now() + ms;
  let cur = await load();
  while (cur && !done(cur) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 2000));
    cur = await load();
  }
  return cur;
}

function scoreBrand(b: BrandSystem, g: (typeof GOLDEN)[number]) {
  const all = [...(b.colors?.baseline ?? []), ...(b.colors?.secondary ?? []), ...(b.colors?.others ?? [])].flatMap((c) => [c.hex, ...(c.shades ?? [])]);
  const colorHits = g.colors.filter((exp) => all.some((h) => { const p = parse(exp), q = parse(h); return p && q && de(p, q) < 6; }));
  const fams = (b.typography?.families ?? []).map((f) => f.family.toLowerCase());
  const fontHits = g.fonts.filter((f) => fams.some((x) => x.includes(f.toLowerCase())));
  const sectionKeys = ["identity", "colors", "typography", "surfaces", "layout", "elevation", "interactions", "structure", "dataDisplay", "motion", "navigation", "icons", "sections", "media"] as const;
  const filled = sectionKeys.filter((k) => {
    const v = (b as Record<string, unknown>)[k];
    return v && (Array.isArray(v) ? v.length > 0 : Object.values(v as object).some((x) => (Array.isArray(x) ? x.length : x)));
  });
  return {
    colorRecall: colorHits.length / g.colors.length,
    missedColors: g.colors.filter((c) => !colorHits.includes(c)),
    fontRecall: fontHits.length / g.fonts.length,
    missedFonts: g.fonts.filter((f) => !fontHits.includes(f)),
    modeOk: b.identity?.mode === g.mode,
    sectionsOk: (b.sections?.length ?? 0) >= g.minSections,
    completeness: filled.length / sectionKeys.length,
  };
}

await ensureUser(actor.userId, { name: "Eval runner" });
await addCredits(actor.userId, 200, "eval");
const report: Record<string, unknown> = { at: new Date().toISOString(), model: process.env.ONBRAND_MODEL ?? "claude-opus-5-5", llm: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ONBRAND_LLM_AUTH_TOKEN) };

if (process.argv.includes("--adherence")) {
  const rows = [];
  for (const p of ADHERENCE_PAIRS) {
    const run = await createAdherence(actor, p);
    const done = await until(() => getAdherence(run.id), (a) => a.status === "completed" || a.status === "failed", 600_000);
    const score = done?.score ?? null;
    const pass = score != null && (p.expect === "high" ? score >= 70 : score < 60);
    rows.push({ ...p, score, status: done?.status, pass });
    console.log(`${pass ? "PASS" : "FAIL"} ${p.reference} vs ${p.design}: ${score} (expect ${p.expect})`);
  }
  report.adherence = rows;
} else {
  const rows = [];
  for (const g of GOLDEN) {
    const t = Date.now();
    const row = await createExtraction(actor, { url: g.url, depth: "light", cache: false });
    const done = await until(() => getExtraction(row.id), (e) => e.status === "completed" || e.status === "failed");
    if (!done?.brand || done.status !== "completed") {
      rows.push({ url: g.url, status: done?.status, error: done?.error });
      console.log(`FAIL ${g.url}: ${done?.status} ${done?.error ?? ""}`);
      continue;
    }
    const s = scoreBrand(done.brand, g);
    rows.push({ url: g.url, id: done.id, latencyMs: Date.now() - t, ...s });
    console.log(
      `${g.url.padEnd(26)} colours ${(s.colorRecall * 100).toFixed(0).padStart(3)}%  fonts ${(s.fontRecall * 100).toFixed(0).padStart(3)}%  mode ${s.modeOk ? "ok" : "✗"}  sections ${s.sectionsOk ? "ok" : "✗"}  complete ${(s.completeness * 100).toFixed(0)}%  ${Math.round((Date.now() - t) / 1000)}s` +
        (s.missedColors.length ? `  missed ${s.missedColors.join(",")}` : "") +
        (s.missedFonts.length ? `  missed ${s.missedFonts.join(",")}` : ""),
    );
  }
  const ok = rows.filter((r) => "colorRecall" in r) as { colorRecall: number; fontRecall: number; completeness: number }[];
  const avg = (k: "colorRecall" | "fontRecall" | "completeness") => (ok.length ? ok.reduce((a, r) => a + r[k], 0) / ok.length : 0);
  report.extraction = { rows, summary: { colorRecall: avg("colorRecall"), fontRecall: avg("fontRecall"), completeness: avg("completeness"), passRate: ok.length / GOLDEN.length } };
  console.log("summary", JSON.stringify((report.extraction as { summary: unknown }).summary));
}
const key = await putObject(`evals/${Date.now()}.json`, JSON.stringify(report, null, 2));
console.log("report:", key);
process.exit(0);
