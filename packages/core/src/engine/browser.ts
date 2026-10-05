import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser } from "playwright-core";
import { env } from "../env";

const g = globalThis as unknown as { __onbrandBrowser?: Promise<Browser> };

/** Resolve a Chromium binary: CHROMIUM_PATH, then the Playwright cache, then system Chrome. */
export function resolveChromium(): string | undefined {
  if (env.chromiumPath && fs.existsSync(env.chromiumPath)) return env.chromiumPath;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), "Library/Caches/ms-playwright"),
    path.join(os.homedir(), ".cache/ms-playwright"),
    "/ms-playwright",
  ].filter(Boolean) as string[];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root)
      .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop()));
    for (const d of dirs) {
      const candidates = [
        `${d}/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
        `${d}/chrome-headless-shell-mac-x64/chrome-headless-shell`,
        `${d}/chrome-headless-shell-linux64/chrome-headless-shell`,
        `${d}/chrome-linux/headless_shell`,
        `${d}/chrome-linux64/chrome`,
        `${d}/chrome-linux/chrome`,
        `${d}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
      ].map((c) => path.join(root, c));
      const hit = candidates.find((c) => fs.existsSync(c));
      if (hit) return hit;
    }
  }
  for (const sys of [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]) {
    if (fs.existsSync(sys)) return sys;
  }
  return undefined;
}

export function browserAvailable(): boolean {
  return Boolean(resolveChromium());
}

export async function getBrowser(): Promise<Browser> {
  if (g.__onbrandBrowser) {
    const b = await g.__onbrandBrowser.catch(() => undefined);
    if (b && b.isConnected()) return b;
  }
  const executablePath = resolveChromium();
  if (!executablePath) throw new Error("No Chromium found. Set CHROMIUM_PATH or install Playwright Chromium.");
  g.__onbrandBrowser = chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--font-render-hinting=none"],
  });
  return g.__onbrandBrowser;
}
