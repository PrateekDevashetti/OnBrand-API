import { expect } from "e2e";

export const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
export const KEY = process.env.E2E_API_KEY ?? "";
export const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
export const hasKey = KEY.startsWith("ob_live_");

export type Json = Record<string, any>;

/** Calls the REST API with the test key. Returns status, headers and parsed JSON. */
export async function api(method: string, path: string, body?: unknown, auth = true) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["X-API-Key"] = KEY;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: Json | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, headers: res.headers, json: json as Json, text };
}

/** Polls a `/result` endpoint until it reports completed or failed. */
export async function waitForResult(path: string, timeoutMs = 280_000) {
  const end = Date.now() + timeoutMs;
  let last = await api("GET", path);
  while (Date.now() < end) {
    if (last.status === 200 && ["completed", "failed"].includes(last.json?.status)) return last;
    await new Promise((r) => setTimeout(r, 4000));
    last = await api("GET", path);
  }
  return last;
}

let rpcId = 0;
/** Minimal Streamable-HTTP MCP client (JSON responses). */
export async function mcp(method: string, params: Json = {}) {
  const res = await fetch(BASE + "/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  const text = await res.text();
  const data = text.startsWith("event:") || text.includes("\ndata:") ? text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).pop() ?? "{}" : text;
  return { status: res.status, body: JSON.parse(data || "{}") as Json };
}

type Browserish = {
  goto(url: string, o?: { waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeout?: number }): Promise<unknown>;
  url(): Promise<string>;
  locator(s: string): any;
  waitForURL(u: string | RegExp, o?: { timeout?: number }): Promise<void>;
  keyboard: { type(t: string): Promise<void> };
};

/** Opens a dashboard path, signing in through Clerk first when the target requires it. */
export async function openApp(browser: Browserish, path = "/app") {
  await browser.goto(BASE + path, { waitUntil: "networkidle" });
  if (!/sign-in/.test(await browser.url())) return;
  const email = process.env.E2E_EMAIL, password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("Target requires sign-in: set E2E_EMAIL and E2E_PASSWORD (a Clerk test user)");
  await browser.locator('input[name="identifier"]').fill(email);
  await browser.locator('button').filter({ hasText: /^\s*Continue\s*$/ }).first().click(); // exact label: skips "Continue with Google"
  await browser.locator('input[name="password"]').fill(password);
  await browser.locator('button').filter({ hasText: /^\s*Continue\s*$/ }).first().click(); // exact label: skips "Continue with Google"
  await browser.waitForURL(/(client-trust|factor-two|\/app)/, { timeout: 30_000 });
  if (/client-trust|factor-two/.test(await browser.url())) {
    // After repeated sign-ins Clerk may not auto-send the new-device code; ask for one first.
    const resend = browser.locator('button:has-text("Resend")').first();
    if (await resend.isVisible().catch(() => false)) await resend.click().catch(() => {});
    await browser.locator("input").first().click();
    await browser.keyboard.type("424242"); // Clerk test-mode code for +clerk_test addresses
  }
  await browser.waitForURL(new RegExp(path.replace(/[/?]/g, "\\$&") + "|/app"), { timeout: 30_000 });
}

export { expect };
