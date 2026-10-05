import { ENDPOINTS } from "@/components/docs/DocsContent";
import { config } from "@/lib/config";

/** OpenAPI 3.1 description generated from the documented endpoints. */
export function GET() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const g of ENDPOINTS) {
    for (const e of g.items) {
      const path = e.path.replace(/\{(\w+)\}/g, "{$1}").split("?")[0];
      const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
      const op: Record<string, unknown> = {
        tags: [g.title],
        summary: e.desc.split(". ")[0],
        description: `${e.desc}\n\nCredits: ${e.credits}`,
        parameters: params,
        responses: { "200": { description: "OK" }, "400": { description: "Invalid request" }, "401": { description: "Missing or invalid API key" }, "402": { description: "Insufficient credits" }, "429": { description: "Rate limited" } },
      };
      if (e.body) op.requestBody = { required: true, content: { "application/json": { schema: { type: "object" }, example: safeJson(e.body) } } };
      (paths[path] ??= {})[e.method.toLowerCase()] = op;
    }
  }
  const spec = {
    openapi: "3.1.0",
    info: { title: "OnBrand API", version: "1.0.0", description: "Brand extraction, style search and brand adherence for AI agents. By Canopy Labs." },
    servers: [{ url: config.apiBase }],
    security: [{ apiKey: [] }],
    components: { securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "X-API-Key" } } },
    paths,
  };
  return Response.json(spec, { headers: { "Cache-Control": "public, max-age=3600" } });
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
