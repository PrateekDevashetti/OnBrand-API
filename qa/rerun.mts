/** Re-run extraction in place for existing rows (keeps ids, resets status). usage: npx tsx --env-file=.env qa/rerun.mts ext_... */
import { runExtraction } from "../packages/core/src/extract";
import { db } from "../packages/core/src/db/client";
import { extractions } from "../packages/core/src/db/schema";
import { eq } from "drizzle-orm";
for (const id of process.argv.slice(2)) {
  await db.update(extractions).set({ status: "queued", brand: null, error: null }).where(eq(extractions.id, id));
  await runExtraction(id, 1);
  console.log(id, "done");
}
process.exit(0);
