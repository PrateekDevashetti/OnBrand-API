import { logRequest, hitRateLimit, RateLimitError, LIMITS } from "@onbrand/core";
import { readApiKey } from "./auth";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler: records method, route, status and latency for every call. */
export function logged<C>(route: string, handler: Handler<C>, via: "api" | "mcp" = "api"): Handler<C> {
  return async (req, ctx) => {
    const t = Date.now();
    let res: Response;
    let error: string | null = null;
    try {
      const limited = await rateLimit(req, route);
      if (limited instanceof Response) res = limited;
      else {
        res = await handler(req, ctx);
        // Advertise the per-minute budget on every response, not only on 429s.
        try {
          res.headers.set("X-RateLimit-Limit", String(limited.limit));
          res.headers.set("X-RateLimit-Remaining", String(limited.remaining));
        } catch {
          /* immutable headers (e.g. a proxied fetch Response) */
        }
      }
    } catch (e) {
      error = (e as Error).message;
      res = Response.json({ error: { code: "internal_error", message: error } }, { status: 500 });
    }
    const key = readApiKey(req);
    void logRequest({ method: req.method, route, status: res.status, latencyMs: Date.now() - t, keyPrefix: key?.slice(0, 14) ?? null, via: key ? via : "playground", error, userAgent: req.headers.get("user-agent") });
    return res;
  };
}

const JOB_ROUTES = /^POST \/v1\/(extract|adherence|search|enhance)$|^\/api\/mcp$/;

/** Per API key (or client IP for the playground): all routes, plus a tighter bucket for job-creating POSTs. */
async function rateLimit(req: Request, route: string): Promise<Response | { limit: number; remaining: number }> {
  const key = readApiKey(req);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const subject = key ? `key:${key.slice(0, 18)}` : `ip:${ip}`;
  try {
    const all = await hitRateLimit(subject, "all", LIMITS.rpm);
    if (req.method === "POST" && JOB_ROUTES.test(route)) await hitRateLimit(subject, "jobs", LIMITS.jobsRpm);
    return all;
  } catch (e) {
    if (!(e instanceof RateLimitError)) throw e;
    return Response.json(
      { error: { code: "rate_limited", message: e.message, limit: e.limit, retry_after: e.retryAfter } },
      { status: 429, headers: { "Retry-After": String(e.retryAfter), "X-RateLimit-Limit": String(e.limit), "X-RateLimit-Remaining": "0" } },
    );
  }
}
