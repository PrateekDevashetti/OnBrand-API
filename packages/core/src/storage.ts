import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "./env";

/**
 * Artifact storage.
 * - Local disk (default): ONBRAND_STORAGE_DIR, served by the web app at /api/files/*.
 * - S3-compatible (Cloudflare R2, AWS S3, Railway buckets): set S3_BUCKET, S3_ENDPOINT,
 *   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (+ S3_REGION, default "auto"). Required when the
 *   web app (Vercel) and the engine worker (Railway) run on different machines.
 */
const s3 = () =>
  process.env.S3_BUCKET && process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? { bucket: process.env.S3_BUCKET, endpoint: process.env.S3_ENDPOINT.replace(/\/$/, ""), key: process.env.S3_ACCESS_KEY_ID, secret: process.env.S3_SECRET_ACCESS_KEY, region: process.env.S3_REGION ?? "auto" }
    : null;

const safeKey = (key: string) => key.replace(/\.\.+/g, "").replace(/^\/+/, "");

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", svg: "image/svg+xml", html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json" };

function hmac(k: Buffer | string, d: string) {
  return crypto.createHmac("sha256", k).update(d).digest();
}
const sha = (d: Buffer | string) => crypto.createHash("sha256").update(d).digest("hex");

/** AWS Signature V4 for a single-object request (path-style). */
function signed(method: "GET" | "PUT" | "DELETE", key: string, body: Buffer | null) {
  const c = s3()!;
  // S3_PREFIX namespaces OnBrand objects inside a shared bucket (e.g. "onbrand/").
  const objectKey = `${(process.env.S3_PREFIX ?? "").replace(/^\/+/, "")}${key}`;
  const url = new URL(`${c.endpoint}/${c.bucket}/${objectKey.split("/").map(encodeURIComponent).join("/")}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const payloadHash = body ? sha(body) : sha("");
  const headers: Record<string, string> = { host: url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
  if (body) headers["content-type"] = TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
  const names = Object.keys(headers).sort();
  const canonical = [method, url.pathname, "", ...names.map((n) => `${n}:${headers[n]}`), "", names.join(";"), payloadHash].join("\n");
  const scope = `${day}/${c.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha(canonical)].join("\n");
  const kSig = hmac(hmac(hmac(hmac(`AWS4${c.secret}`, day), c.region), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", kSig).update(toSign).digest("hex");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${c.key}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
  delete headers.host;
  return { url: url.toString(), headers };
}

export async function putObject(key: string, body: Buffer | string): Promise<string> {
  const k = safeKey(key);
  const buf = typeof body === "string" ? Buffer.from(body) : body;
  if (s3()) {
    const { url, headers } = signed("PUT", k, buf);
    const res = await fetch(url, { method: "PUT", headers, body: new Uint8Array(buf) });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return k;
  }
  const full = path.join(env.storageDir, k);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return k;
}

export async function getObject(key: string): Promise<Buffer | null> {
  const k = safeKey(key);
  if (s3()) {
    const { url, headers } = signed("GET", k, null);
    const res = await fetch(url, { headers });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  try {
    return await fs.readFile(path.join(env.storageDir, k));
  } catch {
    return null;
  }
}

/** Remove an object (missing objects are ignored). */
export async function deleteObject(key: string): Promise<void> {
  const k = safeKey(key);
  if (s3()) {
    const { url, headers } = signed("DELETE", k, null);
    await fetch(url, { method: "DELETE", headers }).catch(() => {});
    return;
  }
  await fs.rm(path.join(env.storageDir, k), { force: true }).catch(() => {});
}

export function publicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${env.publicStorageBase}/${key}`;
}
