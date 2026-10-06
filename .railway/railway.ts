import { defineRailway, preserve, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "onbrand-worker";

export default defineRailway(() => {
  const onbrand_worker = service("onbrand-worker", {
    start: "npm run start -w @onbrand/worker",
    healthcheck: "/health",
    healthcheckTimeout: 60,
    // Values live in Railway (set via dashboard/CLI); preserve() keeps them and keeps secrets out of git.
    env: {
      ANTHROPIC_BASE_URL: preserve(),
      DATABASE_URL: preserve(),
      FIRECRAWL_API_KEY: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      NODE_ENV: preserve(),
      ONBRAND_ENGINE_MODE: preserve(),
      ONBRAND_LLM_AUTH_TOKEN: preserve(),
      ONBRAND_MODEL: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
      S3_PREFIX: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
    },
    // Build: Railway uses the root `Dockerfile` automatically (Playwright image).
    // Restarts: Railway's default (on failure, max 10) matches the old railway.json.
  });
  return project("onbrand-api", {
    resources: [onbrand_worker],
  });
});
