// Task #17 — extraction accuracy: hand-verified brand facts must come back through the
// public API (the same golden set the offline evals use).
import { test } from "e2e";
import { differenceCiede2000, parse } from "culori";
import { GOLDEN } from "../../packages/core/src/evals/golden";
import { api, expect, hasKey, waitForResult } from "./helpers";

// Same perceptual match the offline evals use: CIEDE2000 distance under 6.
const de = differenceCiede2000();
const near = (a: string, b: string) => {
  const p = parse(a), q = parse(b);
  return !!p && !!q && de(p, q) < 6;
};

const SAMPLE = (process.env.E2E_GOLDEN ?? "https://linear.app,https://stripe.com,https://tastelabs.com").split(",");

for (const g of GOLDEN.filter((x) => SAMPLE.includes(x.url))) {
  test(`golden: ${g.url} colours, fonts and mode`, async () => {
    test.skip(!hasKey, "E2E_API_KEY not set");
    const start = await api("POST", "/api/v1/extract", { url: g.url, depth: "light", sections: ["identity", "colors", "typography"] });
    expect([200, 202]).toContain(start.status);
    const done = await waitForResult(`/api/v1/extract/${start.json.id}/result`);
    expect(done.json?.status).toBe("completed");
    const b = done.json.brand;
    const hexes: string[] = [...(b.colors?.baseline ?? []), ...(b.colors?.secondary ?? []), ...(b.colors?.others ?? [])].flatMap((c: any) => [c.hex, ...(c.shades ?? [])]);
    for (const exp of g.colors) expect(exp.split("|").some((alt) => hexes.some((h) => near(alt, h)))).toBe(true);
    const fams = (b.typography?.families ?? []).map((f: any) => String(f.family).toLowerCase());
    for (const f of g.fonts) expect(f.split("|").some((alt) => fams.some((x: string) => x.includes(alt.toLowerCase())))).toBe(true);
    expect(b.identity?.mode).toBe(g.mode);
  });
}
