// Task #8 — production infra: app reachable over the target URL, auth layer on,
// database reachable, engine worker draining the queue, storage serving artifacts.
import { test } from "e2e";
import { api, BASE, expect, hasKey, isLocal, waitForResult } from "./helpers";

test("site and public pages respond", async () => {
  for (const path of ["/", "/docs", "/privacy", "/terms", "/llms.txt", "/openapi.json"]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    expect([200, 307]).toContain(res.status); // 307 = Clerk dev-instance handshake on first hit
  }
  if (!isLocal) expect(BASE.startsWith("https://")).toBe(true);
});

test("API reaches the database and rejects bad keys", async () => {
  test.skip(isLocal, "local QA server signs every request in as the dev user");
  const bad = await api("GET", "/api/v1/me", undefined, false);
  expect(bad.status).toBe(401);
  expect(bad.json?.error?.code).toBe("unauthorized");
});

test("API key resolves to an account with credits", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const me = await api("GET", "/api/v1/me");
  expect(me.status).toBe(200);
  expect(typeof me.json?.credits).toBe("number");
});

test("engine worker completes a queued extraction and storage serves its screenshot", async () => {
  test.skip(!hasKey, "E2E_API_KEY not set");
  const start = await api("POST", "/api/v1/extract", { url: "https://resend.com", depth: "light", sections: ["colors", "typography"], force: true });
  expect([200, 202]).toContain(start.status);
  const done = await waitForResult(`/api/v1/extract/${start.json.id}/result`);
  expect(done.json?.status).toBe("completed");
  const shot = done.json?.screenshot_url ?? done.json?.artifacts?.find?.((a: any) => /screenshot/i.test(a.name ?? ""))?.url;
  if (shot) {
    const img = await fetch(new URL(shot, BASE));
    expect(img.status).toBe(200);
  }
});
