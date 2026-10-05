const app = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
const api = process.env.NEXT_PUBLIC_API_URL ?? app;

export const config = {
  appUrl: app.replace(/\/$/, ""),
  apiBase: `${api.replace(/\/$/, "")}/api/v1`,
  mcpUrl: `${api.replace(/\/$/, "")}/api/mcp`,
  skillsRepo: process.env.NEXT_PUBLIC_SKILLS_REPO ?? "PrateekDevashetti/OnBrand-API",
};

/** Test credits: always on in local dev; on preview deployments only with the explicit flag; never in production. */
export const testCreditsAllowed = () =>
  process.env.NODE_ENV !== "production" || (process.env.VERCEL_ENV === "preview" && process.env.ONBRAND_ALLOW_TEST_CREDITS === "true");
