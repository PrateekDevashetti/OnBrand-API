import { NextResponse } from "next/server";
import { InsufficientCreditsError } from "@onbrand/core";
import { ZodError } from "zod";

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function apiError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export const unauthorized = () =>
  apiError(401, "unauthorized", "Missing or invalid API key. Pass `Authorization: Bearer ob_live_...` or `X-API-Key`.");

export function handleError(err: unknown) {
  if (err instanceof InsufficientCreditsError) return apiError(402, "insufficient_credits", err.message, { needed: err.needed, balance: err.balance });
  if (err instanceof ZodError) return apiError(400, "invalid_request", err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  if (err instanceof TypeError && /Invalid URL/i.test(err.message)) return apiError(400, "invalid_url", "That doesn't look like a valid URL.");
  console.error("[onbrand api]", err);
  return apiError(500, "internal_error", (err as Error)?.message ?? "Something went wrong");
}
