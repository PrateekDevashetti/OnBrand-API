import { customAlphabet } from "nanoid";
import crypto from "node:crypto";
import { assertSafeUrlShape, UnsafeUrlError } from "./engine/netguard";

const alpha = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export const newId = (prefix: string) => `${prefix}_${alpha()}`;

export function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function normalizeUrl(input: string): { url: string; normalized: string; domain: string } {
  let raw = input.trim();
  if (raw.length > 2048) throw new UnsafeUrlError("URL is too long (max 2048 characters)");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const u = assertSafeUrlShape(raw);
  u.hash = "";
  // Tracking params don't change a page's design; dropping them keeps one cache entry per page.
  for (const k of [...u.searchParams.keys()]) {
    if (/^(utm_|mc_|_hs|hsa_)|^(fbclid|gclid|dclid|msclkid|yclid|igshid|ref|ref_src|_ga|_gl)$/i.test(k)) u.searchParams.delete(k);
  }
  const domain = u.hostname.replace(/^www\./, "");
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  const normalized = `${domain}${pathname === "/" ? "" : pathname}${u.search}`.toLowerCase();
  return { url: u.toString(), normalized, domain };
}

export function companyFromDomain(domain: string) {
  const base = domain.split(".").slice(-2, -1)[0] ?? domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
