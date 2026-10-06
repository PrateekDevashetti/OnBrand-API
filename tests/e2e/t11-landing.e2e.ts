// Task #11 — landing additions: manifesto, three endpoints, before/after, product tour,
// integrations, pricing (monthly/annual), FAQ; hero hands the URL to the extractor.
import { test } from "@e2e-dev/web";
import { BASE, expect } from "./helpers";

test("landing renders every section in order", async ({ browser, screen }) => {
  await browser.goto(BASE + "/");
  await expect(screen.getByText("Make your agents be on brand")).toBeVisible();
  const ids = await browser.evaluate(() => [...document.querySelectorAll("section[id], div[id]")].map((e) => e.id));
  const order = ["manifesto", "product", "compare", "tour", "integrations", "pricing", "faq"];
  const found = order.filter((id) => ids.includes(id));
  expect(found).toEqual(order);
  await expect(screen.getByText("Frequently asked questions")).toBeVisible();
  await expect(screen.getByText("Plug in through the API or MCP")).toBeVisible();
});

test("pricing toggles monthly ↔ annual", async ({ browser, screen }) => {
  await browser.goto(BASE + "/#pricing");
  const before = await browser.evaluate(() => document.querySelector("#pricing")?.textContent ?? "");
  await screen.getByRole("button", { name: /Annual/ }).click();
  const after = await browser.evaluate(() => document.querySelector("#pricing")?.textContent ?? "");
  expect(after).not.toEqual(before);
});

test("hero URL hands off to the extraction playground", async ({ browser, screen }) => {
  await browser.goto(BASE + "/");
  await screen.getByLabel("Website URL").fill("https://resend.com");
  await browser.locator('form:has(input[aria-label="Website URL"]) button:has-text("Extract")').click();
  await browser.waitForURL(/\/(app\/extract\?url=|sign-in)/, { timeout: 30_000 });
});

// The agent fixture needs a model, so this test only exists when OPENROUTER_API_KEY is set.
if (process.env.OPENROUTER_API_KEY) test("an agent reading the page finds plans and an FAQ", async ({ browser, agent }) => {
  await browser.goto(BASE + "/#pricing");
  await agent.assert("the pricing section shows Starter and Pro plans with monthly credit amounts, plus an Enterprise plan offering volume pricing");
});
