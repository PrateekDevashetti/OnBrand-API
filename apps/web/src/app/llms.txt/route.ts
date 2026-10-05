import { ENDPOINTS } from "@/components/docs/DocsContent";
import { config } from "@/lib/config";

/** llms.txt: a compact, agent-readable map of the OnBrand API (generated from the docs). */
export function GET() {
  const lines = [
    "# OnBrand API by Canopy Labs",
    "",
    "> The brand layer for AI agents: extract any website's brand system, search visual styles in natural language, and verify that generated pages stay on brand.",
    "",
    `Base URL: ${config.apiBase}`,
    "Auth: send `X-API-Key: <key>` (or `Authorization: Bearer <key>`). Create keys at /app/api-keys.",
    "Jobs (extract, adherence) are async: POST to start, poll GET /{id}, read GET /{id}/result. Failed jobs are refunded.",
    "Errors: JSON `{ error: { code, message } }`. 429 `rate_limited` carries Retry-After.",
    "MCP: streamable HTTP at /api/mcp with the same API key.",
    "",
    "## Docs",
    "- [Full documentation](/docs)",
    "- [OpenAPI spec](/openapi.json)",
    "",
  ];
  for (const g of ENDPOINTS) {
    lines.push(`## ${g.title}`, "", g.intro, "");
    for (const e of g.items) lines.push(`- \`${e.method} ${e.path}\` (${e.credits}): ${e.desc}`);
    lines.push("");
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
