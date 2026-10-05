const app = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
const api = process.env.NEXT_PUBLIC_API_URL ?? app;

export const config = {
  appUrl: app.replace(/\/$/, ""),
  apiBase: `${api.replace(/\/$/, "")}/api/v1`,
  mcpUrl: `${api.replace(/\/$/, "")}/api/mcp`,
  skillsRepo: process.env.NEXT_PUBLIC_SKILLS_REPO ?? "PrateekDevashetti/OnBrand-API",
};
