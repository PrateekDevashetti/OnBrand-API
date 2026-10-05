import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";
import { env } from "./env";

let client: Anthropic | null = null;

/**
 * Claude access. Direct Anthropic API by default (ANTHROPIC_API_KEY).
 * Gateways that speak the Anthropic Messages API (e.g. OpenRouter) work by setting
 * ANTHROPIC_BASE_URL + ONBRAND_LLM_AUTH_TOKEN; gateway mode skips beta-only params.
 */
const gatewayToken = () => process.env.ONBRAND_LLM_AUTH_TOKEN ?? "";
const isGateway = () => Boolean(gatewayToken()) && Boolean(process.env.ANTHROPIC_BASE_URL);

export function llmAvailable(): boolean {
  return Boolean(env.anthropicKey) || isGateway();
}

function getClient(): Anthropic {
  if (!client) {
    client = isGateway()
      ? new Anthropic({ apiKey: null, authToken: gatewayToken(), baseURL: process.env.ANTHROPIC_BASE_URL, maxRetries: 3, timeout: 240_000 })
      : new Anthropic({ apiKey: env.anthropicKey, maxRetries: 3, timeout: 240_000 });
  }
  return client;
}

function modelId(): string {
  const m = env.model;
  if (isGateway() && /openrouter/.test(process.env.ANTHROPIC_BASE_URL ?? "") && !m.includes("/")) {
    // claude-opus-5-5 -> anthropic/claude-opus-5.5
    return `anthropic/${m.replace(/-(\d+)-(\d+)$/, "-$1.$2")}`;
  }
  return m;
}

/** Server-side refusal fallbacks are a first-party beta; omit through gateways. */
function fallbackParams() {
  return isGateway() ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
}

export type Effort = "low" | "medium" | "high";

export type StructuredCall<T extends z.ZodType> = {
  system: string;
  schema: T;
  text: string;
  images?: { data: Buffer; mediaType: "image/jpeg" | "image/png" }[];
  effort?: Effort;
  maxTokens?: number;
};

export class LlmRefusalError extends Error {}

/**
 * One structured call to Claude. Uses structured outputs (schema-validated JSON)
 * and server-side refusal fallbacks so a declined request is retried on the
 * recommended fallback model instead of failing the job.
 */
export async function structured<T extends z.ZodType>(call: StructuredCall<T>): Promise<z.infer<T>> {
  const content: BetaContentBlockParam[] = [];
  for (const img of call.images ?? []) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data.toString("base64") } } as BetaContentBlockParam);
  }
  content.push({ type: "text", text: call.text });

  const response = await getClient().beta.messages.parse({
    model: modelId(),
    max_tokens: call.maxTokens ?? 16000,
    ...fallbackParams(),
    system: [{ type: "text", text: call.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    output_config: { effort: call.effort ?? "medium", format: betaZodOutputFormat(call.schema) },
  });

  if (response.stop_reason === "refusal") {
    throw new LlmRefusalError(`Model declined the request (${response.stop_details?.category ?? "unknown"})`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Model output was truncated (max_tokens)");
  }
  if (response.parsed_output == null) throw new Error("Model returned no parseable output");
  return response.parsed_output as z.infer<T>;
}

/** Plain text completion (prompt enhancer etc). */
export async function complete(system: string, text: string, effort: Effort = "medium"): Promise<string> {
  const response = await getClient().beta.messages.create({
    model: modelId(),
    max_tokens: 8000,
    ...fallbackParams(),
    system,
    messages: [{ role: "user", content: text }],
    output_config: { effort },
  });
  if (response.stop_reason === "refusal") throw new LlmRefusalError("Model declined the request");
  return response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
