/**
 * Capture every reference state (qa/pairs.tsv names) at 1920x1080, deterministically.
 * Resets the local dev account with qa/fixture.sql before and after.
 * usage: npx tsx qa/capture.mts [name ...]      (no names = all)
 */
import { chromium, type Page } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { resolveChromium } from "../packages/core/src/engine/browser";

const base = process.env.BASE ?? "http://localhost:3100";
const out = new URL("./shots/", import.meta.url).pathname;
const sql = (q: string) => execFileSync("psql", ["onbrand", "-v", "ON_ERROR_STOP=1", "-Atqc", q], { encoding: "utf8" }).trim();
const fixture = () => execFileSync("psql", ["onbrand", "-q", "-v", "ON_ERROR_STOP=1", "-f", new URL("./fixture.sql", import.meta.url).pathname]);

const TASTE = "ext_3mz0zlxptz6dw1zl";
const CASE_STUDY = "ext_23fc714i9nn4b3ot";

async function section(page: Page, id: string, extra = 0) {
  await page.evaluate(
    ([id, extra]) => {
      const panel = document.getElementById("panel")!;
      const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`)!;
      panel.scrollTo(0, el.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop + Number(extra));
    },
    [id, extra] as const,
  );
}

async function scrollMain(page: Page, y: number) {
  await page.evaluate((y) => {
    const els = [document.getElementById("panel"), ...Array.from(document.querySelectorAll<HTMLElement>("main, main *"))];
    const el = els.find((e) => e && e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY));
    (el ?? document.scrollingElement!).scrollTo(0, y);
  }, y);
}

type Shot = { name: string; path: string; act?: (p: Page) => Promise<void>; wait?: number };
const viewer = (name: string, id: string, extra = 0): Shot => ({ name, path: `/app/extractions/${TASTE}`, act: (p) => section(p, id, extra) });

const SHOTS: Shot[] = [
  { name: "landing", path: "/" },
  ...(["manifesto", "product", "tour", "compare", "integrations", "pricing", "faq"] as const).map((id, k) => ({
    name: ["l_manifesto", "l_endpoints", "l_case", "l_compare", "l_integrations", "l_pricing", "l_faq"][k],
    path: "/",
    act: (p: Page) => p.evaluate((id) => window.scrollTo(0, document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), id).then(() => undefined),
  })),
  { name: "home", path: "/app" },
  { name: "home_mcp", path: "/app", act: (p) => scrollMain(p, 326) },
  { name: "extract", path: "/app/extract?url=https://tastelabs.com/", act: (p) => p.getByText("All pages", { exact: true }).click() },
  { name: "history", path: "/app/history" },
  { name: "history_search", path: "/app/history?tab=search" },
  { name: "history_adh", path: "/app/history?tab=adherence" },
  { name: "overview", path: `/app/extractions/${TASTE}` },
  viewer("identity", "identity"),
  viewer("colours", "colors"),
  viewer("typography", "typography"),
  viewer("surfaces", "surfaces"),
  viewer("layout", "layout"),
  viewer("interactions", "interactions"),
  viewer("structure", "structure"),
  viewer("motion", "motion"),
  viewer("navigation", "navigation"),
  viewer("sections", "sections"),
  viewer("media", "media"),
  { name: "usage", path: "/app/usage" },
  { name: "billing", path: "/app/billing" },
  { name: "profile", path: "/app/profile" },
  { name: "search", path: "/app/search", act: (p) => p.locator("input").first().fill("brutalist portfolio website") },
  {
    name: "search_results",
    path: "/app/search",
    act: async (p) => {
      await p.locator("input").first().fill("dark bold creative studio with expressive typography");
      await p.keyboard.press("Enter");
      await p.waitForURL(/s=srch_/, { timeout: 90000 });
      await p.waitForLoadState("networkidle");
      await p.mouse.move(960, 320);
    },
    wait: 1500,
  },
  { name: "style_detail", path: `/app/styles/${process.env.STYLE_ID ?? ""}` },
  { name: "adherence_form", path: "/app/adherence" },
  { name: "adherence_run", path: "/app/adherence/adh_qa_running" },
];

const only = process.argv.slice(2);
const style = sql(`select id from style_index where domain = 'mcarnolds.be'`);
fixture();
sql(`insert into extractions (id,user_id,url,normalized_url,domain,company,status,depth,source,pages_mode,request_from,palette,stages,credits,created_at)
     values ('ext_qa_running','dev_user','https://trycanopy.space/','trycanopy.space/','trycanopy.space','Trycanopy','running','light','fresh','single','adherence','[]','[]',0,now())`);
sql(`insert into adherence_runs (id,user_id,reference_url,design_url,reference_extraction_id,design_extraction_id,status,credits,request_from,created_at)
     values ('adh_qa_running','dev_user','https://tastelabs.com/','https://trycanopy.space/','${TASTE}','ext_qa_running','running',2,'playground',now())`);

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
try {
  for (const s of SHOTS) {
    if (only.length && !only.includes(s.name)) continue;
    const path = s.name === "style_detail" ? `/app/styles/${style}` : s.path;
    const res = await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    if (s.act) await s.act(page);
    await page.waitForTimeout(s.wait ?? 600);
    await page.screenshot({ path: `${out}${s.name}.png` });
    console.log(`${res?.status()} ${s.name.padEnd(16)} ${path}`);
  }
} finally {
  await browser.close();
  fixture();
}
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
