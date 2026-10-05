/**
 * SSRF guard for everything the engine fetches on a user's behalf.
 * Only public http(s) hosts on standard ports are reachable; every hop (DNS answer,
 * redirect, sub-request) is checked against private, loopback, link-local and metadata ranges.
 */
import dns from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {}

const MAX_URL = 2048;
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".railway.internal"];

function v4Blocked(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

function v6Blocked(ip: string) {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return v4Blocked(mapped[1]);
  const hex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16);
    return v4Blocked(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  if (s.startsWith("::ffff:") || s.startsWith("::") ) return true; // other mapped / compat forms
  return /^(fc|fd)/.test(s) || /^fe[89ab]/.test(s) || s.startsWith("ff") || s.startsWith("64:ff9b:") || s.startsWith("2001:db8:");
}

export function isBlockedIp(ip: string) {
  const kind = net.isIP(ip);
  return kind === 4 ? v4Blocked(ip) : kind === 6 ? v6Blocked(ip) : true;
}

/** Synchronous shape checks (no network). Throws UnsafeUrlError. */
export function assertSafeUrlShape(raw: string): URL {
  if (raw.length > MAX_URL) throw new UnsafeUrlError(`URL is longer than ${MAX_URL} characters.`);
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new UnsafeUrlError("Only http and https URLs can be extracted.");
  if (u.username || u.password) throw new UnsafeUrlError("URLs with embedded credentials are not allowed.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new UnsafeUrlError("Only standard ports (80, 443) can be extracted.");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new UnsafeUrlError("Private, loopback and link-local addresses cannot be extracted.");
    return u;
  }
  if (host === "localhost" || !host.includes(".") || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new UnsafeUrlError("That host is not publicly reachable.");
  }
  return u;
}

const hostCache = new Map<string, { ok: boolean; at: number }>();

/** Resolves the host and rejects it if any address is non-public. Cached for 5 minutes. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const u = assertSafeUrlShape(raw);
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(host)) return u;
  const hit = hostCache.get(host);
  if (hit && Date.now() - hit.at < 300_000) {
    if (!hit.ok) throw new UnsafeUrlError("That host resolves to a private address.");
    return u;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(`Could not resolve ${host}.`);
  }
  const ok = addrs.length > 0 && addrs.every((a) => !isBlockedIp(a.address));
  hostCache.set(host, { ok, at: Date.now() });
  if (!ok) throw new UnsafeUrlError("That host resolves to a private address.");
  return u;
}

/** Non-throwing check used by the browser request interceptor. */
export async function isPublicUrl(raw: string) {
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw === "about:blank") return true;
  try {
    await assertPublicUrl(raw);
    return true;
  } catch {
    return false;
  }
}

/** fetch() that follows redirects manually, validating every hop. */
export async function safeFetch(url: string, init: RequestInit & { maxRedirects?: number } = {}): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= (init.maxRedirects ?? 5); hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    return res;
  }
  throw new UnsafeUrlError("Too many redirects.");
}
