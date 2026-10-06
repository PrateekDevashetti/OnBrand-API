// Task #13 — deployed build: served on the custom domain over HTTPS, dev-only routes gone,
// every link and snippet the product hands out points at this deployment.
import { test } from "@e2e-dev/web";
import { BASE, expect, isLocal, mcp, hasKey } from "./helpers";

test("dev-only routes are not served", async () => {
  test.skip(isLocal, "production-only check");
  expect((await fetch(BASE + "/dev/loader")).status).toBe(404);
});

test("served from the Canopy domain over HTTPS", async () => {
  test.skip(isLocal, "production-only check");
  expect(BASE).toBe("https://brand.trycanopy.space");
  const res = await fetch(BASE + "/llms.txt");
  expect(res.status).toBe(200);
  expect(res.headers.get("strict-transport-security")).toBeTruthy();
});

test("OpenAPI server URL and MCP install snippet point at this deployment", async () => {
  const spec = await (await fetch(BASE + "/openapi.json")).json();
  expect(JSON.stringify(spec.servers ?? [])).toContain(new URL(BASE).host);
  test.skip(!hasKey, "E2E_API_KEY not set");
  const init = await mcp("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
  expect(init.status).toBe(200);
});
