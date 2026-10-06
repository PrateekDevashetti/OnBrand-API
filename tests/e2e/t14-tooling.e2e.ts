// Task #14 — tooling: Vercel plugin, Railway CLI + skill, Neon project link, and the e2e
// suite itself are installed and wired to this repo. Runs on a developer machine only.
import { test } from "e2e";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, isLocal } from "./helpers";

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }).toString();

test("Vercel and Railway CLIs are installed and linked to OnBrand", async () => {
  test.skip(!isLocal || !!process.env.CI, "developer-machine check");
  expect(sh("vercel", ["--version"])).toMatch(/\d+\.\d+/);
  expect(JSON.parse(fs.readFileSync(".vercel/project.json", "utf8")).projectName).toBe("onbrand-api");
  expect(sh("railway", ["status"])).toContain("onbrand-api");
});

test("Railway skill and e2e framework are installed", async () => {
  test.skip(!isLocal || !!process.env.CI, "developer-machine check");
  expect(fs.existsSync(path.join(os.homedir(), ".claude/skills/use-railway/SKILL.md"))).toBe(true);
  expect(JSON.parse(fs.readFileSync("node_modules/e2e/package.json", "utf8")).version).toMatch(/^0\./);
});
