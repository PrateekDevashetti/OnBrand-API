// Task #16 — landing animation: brand cards drift in lanes and pass *behind* the search bar.
import { test } from "@e2e-dev/web";
import { BASE, expect } from "./helpers";

test("drift cards move and stay underneath the hero input", async ({ browser }) => {
  await browser.goto(BASE + "/");
  const sample = () =>
    browser.evaluate(() => [...document.querySelectorAll(".drift-card")].slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().left)));
  const a = await sample();
  expect(a.length).toBeGreaterThan(0);
  await new Promise((r) => setTimeout(r, 1500));
  const b = await sample();
  expect(b).not.toEqual(a);
  const layering = await browser.evaluate(() => {
    const z = (el: Element | null) => {
      for (let n = el as HTMLElement | null; n; n = n.parentElement) {
        const v = getComputedStyle(n).zIndex;
        if (v !== "auto") return Number(v);
      }
      return 0;
    };
    return { drift: z(document.querySelector(".hero-drift")), input: z(document.querySelector('input[aria-label="Website URL"]')) };
  });
  expect(layering.input).toBeGreaterThan(layering.drift);
});
