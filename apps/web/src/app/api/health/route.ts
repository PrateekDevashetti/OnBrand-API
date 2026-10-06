import { sql } from "drizzle-orm";
import { db } from "@onbrand/core";

export const dynamic = "force-dynamic";

/** Liveness + database reachability for uptime monitors. Never exposes configuration. */
export async function GET() {
  const t = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", database: "ok", latency_ms: Date.now() - t }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded", database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
