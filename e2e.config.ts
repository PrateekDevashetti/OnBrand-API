import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";
import { openrouter } from "@openrouter/ai-sdk-provider";

/**
 * End-to-end acceptance suite (tester-army/e2e). One file per delivery task (#8–#18).
 *
 *   E2E_BASE_URL   app under test (default: local QA server on :3100)
 *   E2E_API_KEY    an `ob_live_` key for that environment (API, MCP, SDK, skill tests)
 *   E2E_EMAIL / E2E_PASSWORD   Clerk test user, when the target has Clerk on
 *   OPENROUTER_API_KEY         enables the natural-language agent steps
 */
const url = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default {
  agents: process.env.OPENROUTER_API_KEY ? { default: { model: openrouter("anthropic/claude-haiku-4.5") } } : undefined,
  targets: [{ engine: web({ viewport: { width: 1440, height: 900 } }), app: { url } }],
  tests: "tests/e2e/**/*.e2e.ts",
  timeout: 300_000,
  workers: 2,
} satisfies E2EConfig;
