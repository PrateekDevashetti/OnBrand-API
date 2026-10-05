import { logRequest } from "@onbrand/core";
import { readApiKey } from "./auth";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler: records method, route, status and latency for every call. */
export function logged<C>(route: string, handler: Handler<C>, via: "api" | "mcp" = "api"): Handler<C> {
  return async (req, ctx) => {
    const t = Date.now();
    let res: Response;
    let error: string | null = null;
    try {
      res = await handler(req, ctx);
    } catch (e) {
      error = (e as Error).message;
      res = Response.json({ error: { code: "internal_error", message: error } }, { status: 500 });
    }
    const key = readApiKey(req);
    void logRequest({ method: req.method, route, status: res.status, latencyMs: Date.now() - t, keyPrefix: key?.slice(0, 14) ?? null, via: key ? via : "playground", error, userAgent: req.headers.get("user-agent") });
    return res;
  };
}
