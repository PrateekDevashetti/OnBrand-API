// Task #12 — Style Search parity: facets on the landing grid, results with match badges,
// detail page with Prompt Match Reasoning, palette, page tags and similar branding.
import { test } from "@e2e-dev/web";
import { expect, openApp } from "./helpers";

test("search landing shows facets and a featured grid", async ({ browser, screen }) => {
  await openApp(browser, "/app/search");
  await expect(screen.getByText("Search for any visual style")).toBeVisible();
  for (const facet of ["Style", "Website type", "Industry", "Layout"]) await expect(screen.getByText(facet, { exact: true }).first()).toBeVisible();
  expect(await browser.locator('a[href^="/app/styles/"]').count()).toBeGreaterThan(6);
});

test("query → ranked results with badges → detail page", async ({ browser, screen }) => {
  await openApp(browser, "/app/search");
  await browser.locator('input[placeholder*="dark bold"]').fill("dark bold creative studio with expressive typography");
  await screen.getByRole("button", { name: "Search", exact: true }).click();
  await expect(screen.getByText("These results are the ones your agent is inspired by")).toBeVisible({ timeout: 60_000 });
  const text = await browser.evaluate(() => document.body.innerText);
  expect(text).toMatch(/Strong Match|Good Match/);
  await browser.locator('a[href^="/app/styles/"]').first().click();
  for (const label of ["Prompt Match Reasoning", "Palette", "Page Tags", "Similar branding"]) await expect(screen.getByText(label).first()).toBeVisible({ timeout: 30_000 });
});
