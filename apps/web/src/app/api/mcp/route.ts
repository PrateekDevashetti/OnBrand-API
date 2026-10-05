import { logged } from "@/lib/logged";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getActor } from "@/lib/auth";
import { buildMcpServer } from "@/lib/mcp";
import { config } from "@/lib/config";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const actor = await getActor(req, "mcp");
  if (!actor) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: `Unauthorized. Add header "Authorization: Bearer <OnBrand API key>" — create one at ${config.appUrl}/app/api-keys` }, id: null }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="onbrand"' },
    });
  }
  // Stateless: a fresh server + transport per request (serverless friendly).
  const server = buildMcpServer({ ...actor, via: "mcp" });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    void server.close();
  }
}

export const POST = logged("/api/mcp", handle, "mcp");
export const GET = logged("/api/mcp", handle, "mcp");
export const DELETE = logged("/api/mcp", handle, "mcp");
