/**
 * Seed / refresh the Style Search index.
 *   npm run db:seed                 # all sites missing from the index
 *   npm run db:seed -- --refresh    # re-crawl everything
 *   npm run db:seed -- linear.app   # just matching sites
 */
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { styleIndex } from "../db/schema";
import { capturePage } from "../engine/crawl";
import { clusterColors, fontFamilies } from "../engine/analyze";
import { putObject } from "../storage";
import { newId } from "../ids";
import { SEED_SITES } from "./sites";

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const only = args.filter((a) => !a.startsWith("--"));
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY ?? 4);

const existing = new Set((await db.query.styleIndex.findMany({ columns: { domain: true } })).map((r) => r.domain));
const todo = SEED_SITES.filter((s) => {
  const domain = new URL(s.url).hostname.replace(/^www\./, "");
  if (only.length) return only.some((o) => s.url.includes(o));
  return refresh || !existing.has(domain);
});
console.log(`Seeding ${todo.length} of ${SEED_SITES.length} sites (concurrency ${CONCURRENCY})`);

let ok = 0, fail = 0;
async function one(site: (typeof SEED_SITES)[number]) {
  const domain = new URL(site.url).hostname.replace(/^www\./, "");
  const t = Date.now();
  try {
    let cap;
    for (let attempt = 1; ; attempt++) {
      try {
        cap = await capturePage(site.url, { lite: true, timeoutMs: 40_000 });
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    const fams = clusterColors(cap.signals);
    const palette = [...fams.slice(0, 5), ...fams.filter((f) => f.tone === "Accent").slice(0, 2)]
      .map((f) => f.hex)
      .filter((h, i, a) => a.indexOf(h) === i)
      .slice(0, 8);
    const fonts = fontFamilies(cap.signals).filter((f) => !/icon|awesome|material/i.test(f.family));
    const typography = fonts.length <= 1 ? `single-typeface · ${fonts[0]?.family ?? "system"}` : `${fonts.slice(0, 2).map((f) => f.family).join(" + ")}`;
    const bgFam = [...fams].sort((a, b) => b.role.bg - a.role.bg)[0];
    const mode = bgFam && bgFam.lightness < 45 ? "dark" : "light";
    const shotKey = cap.hero ? await putObject(`index/${domain}.jpg`, cap.hero) : null;
    const values = {
      domain,
      url: site.url,
      name: site.name,
      label: site.label,
      screenshotPath: shotKey,
      tags: [...site.tags, mode === "dark" ? "Dark" : "Light"].filter((v, i, a) => a.indexOf(v) === i),
      styles: site.styles,
      websiteTypes: site.websiteTypes,
      industries: site.industries,
      layouts: site.layouts,
      palette,
      typography,
      description: site.description,
      keywords: [cap.signals.title, cap.signals.description, ...cap.signals.headings.slice(0, 6).map((h) => h.text)].join(" ").slice(0, 1200),
      mode,
      featured: Boolean(site.featured),
    };
    const prev = await db.query.styleIndex.findFirst({ where: eq(styleIndex.domain, domain) });
    if (prev) await db.update(styleIndex).set(values).where(eq(styleIndex.id, prev.id));
    else await db.insert(styleIndex).values({ id: newId("sty"), ...values });
    ok++;
    console.log(`✓ ${domain} (${Math.round((Date.now() - t) / 1000)}s) ${mode} ${palette.join(" ")} | ${typography}`);
  } catch (e) {
    fail++;
    console.log(`✗ ${domain}: ${(e as Error).message.split("\n")[0]}`);
  }
}

const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await one(queue.shift()!);
  }),
);
console.log(`Done: ${ok} ok, ${fail} failed`);
process.exit(0);
