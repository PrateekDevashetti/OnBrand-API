import { customAlphabet } from "nanoid";
import crypto from "node:crypto";

const alpha = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export const newId = (prefix: string) => `${prefix}_${alpha()}`;

export function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function normalizeUrl(input: string): { url: string; normalized: string; domain: string } {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const u = new URL(raw);
  u.hash = "";
  const domain = u.hostname.replace(/^www\./, "");
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  const normalized = `${domain}${pathname === "/" ? "" : pathname}${u.search}`.toLowerCase();
  return { url: u.toString(), normalized, domain };
}

export function companyFromDomain(domain: string) {
  const base = domain.split(".").slice(-2, -1)[0] ?? domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
