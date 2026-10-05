import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

/**
 * Artifact storage. Local disk by default (served by the web app at /api/files/*).
 * Point ONBRAND_STORAGE_DIR at a Railway volume in production, or swap this module
 * for an S3/R2 implementation with the same two functions.
 */
export async function putObject(key: string, body: Buffer | string): Promise<string> {
  const safe = key.replace(/\.\.+/g, "").replace(/^\/+/, "");
  const full = path.join(env.storageDir, safe);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
  return safe;
}

export async function getObject(key: string): Promise<Buffer | null> {
  const safe = key.replace(/\.\.+/g, "").replace(/^\/+/, "");
  try {
    return await fs.readFile(path.join(env.storageDir, safe));
  } catch {
    return null;
  }
}

export function publicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${env.publicStorageBase}/${key}`;
}
