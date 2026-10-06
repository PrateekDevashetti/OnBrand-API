/**
 * Publish the curated Style Search index from a local build to another environment.
 *
 *   SRC_JSON=index.json  DATABASE_URL=<target>  S3_*=<target bucket>  tsx src/seed/publish.ts
 *
 * SRC_JSON is a JSON array of style_index rows (snake_case, as `psql json_agg` exports them).
 * Screenshots are read from ONBRAND_SRC_STORAGE_DIR and uploaded with the target storage driver.
 * Rows are upserted by id, so re-running is safe.
 */
import fs from "node:fs";
import path from "node:path";
import { db } from "../db/client";
import { styleIndex } from "../db/schema";
import { putObject } from "../storage";

type Row = Record<string, any>;
const rows: Row[] = JSON.parse(fs.readFileSync(process.env.SRC_JSON ?? "index.json", "utf8"));
const srcDir = process.env.ONBRAND_SRC_STORAGE_DIR ?? path.resolve("storage");

let uploaded = 0;
for (const r of rows) {
  if (r.screenshot_path) {
    const file = path.join(srcDir, r.screenshot_path);
    if (fs.existsSync(file)) {
      await putObject(r.screenshot_path, fs.readFileSync(file));
      uploaded++;
    }
  }
  const values = {
    id: r.id, domain: r.domain, url: r.url, name: r.name, label: r.label, description: r.description,
    screenshotPath: r.screenshot_path, typography: r.typography, tags: r.tags, styles: r.styles,
    websiteTypes: r.website_types, industries: r.industries, layouts: r.layouts, palette: r.palette,
    featured: r.featured, keywords: r.keywords, mode: r.mode, extractionId: null, createdAt: new Date(r.created_at),
  };
  await db.insert(styleIndex).values(values).onConflictDoUpdate({ target: styleIndex.id, set: { ...values, id: undefined } });
}
console.log(`published ${rows.length} index rows, ${uploaded} screenshots`);
process.exit(0);
