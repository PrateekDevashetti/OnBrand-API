// Task #18 — PM + CTO review fixes: SSRF guard, rate-limit headers, URL validation,
// branded 404, legal pages, machine-readable docs, OnBrand-branded sign-in.
import { test } from "@e2e-dev/web";
import { api, BASE, expect, hasKey, isLocal } from "./helpers";

test("SSRF guard refuses private and metadata addresses", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  for (const url of ["http://localhost:5432", "http://169.254.169.254/latest/meta-data", "http://10.0.0.5", "file:///etc/passwd"]) {
    const r = await api("POST", "/api/v1/extract", { url });
    expect(r.status).toBe(400);
    expect(r.json?.error?.code).toMatch(/unsafe_url|invalid_url/);
  }
});

test("API responses carry rate-limit headers", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const r = await api("GET", "/api/v1/me");
  expect(r.headers.get("x-ratelimit-limit")).toBeTruthy();
  expect(r.headers.get("x-ratelimit-remaining")).toBeTruthy();
});

test("llms.txt and OpenAPI describe the same endpoints", async () => {
  const llms = await (await fetch(BASE + "/llms.txt")).text();
  const spec = await (await fetch(BASE + "/openapi.json")).json();
  expect(llms).toContain("OnBrand");
  expect(JSON.stringify(spec.servers)).toContain("/api/v1");
  for (const p of ["/extract", "/search", "/adherence"]) expect(Object.keys(spec.paths)).toContain(p);
});

test("unknown pages get the branded 404", async ({ browser, screen }) => {
  await browser.goto(BASE + "/definitely-not-a-page");
  await expect(screen.getByText("This page is off brand.")).toBeVisible();
});

test("legal pages exist", async ({ browser, screen }) => {
  for (const [path, title] of [["/privacy", /privacy/i], ["/terms", /terms/i], ["/acceptable-use", /acceptable use/i]] as const) {
    await browser.goto(BASE + path);
    await expect(screen.getByRole("heading", { name: title }).first()).toBeVisible();
  }
});

test("sign-in is branded OnBrand when Clerk is on", async ({ browser, screen }) => {
  await browser.goto(BASE + "/sign-in");
  test.skip(isLocal && !/sign-in/.test(await browser.url()), "local QA server runs without Clerk");
  await expect(screen.getByText("Sign in to OnBrand")).toBeVisible({ timeout: 20_000 });
});
