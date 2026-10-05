import { logged } from "@/lib/logged";
import { getExtraction, getObject, zip, brandBrief } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { unauthorized, apiError } from "@/lib/http";

/** Everything for one extraction as a .zip: brand.json, tokens.css, brief.md, source.html, styles.css, screenshot.jpg */
async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req, "api");
  if (!actor) return unauthorized();
  const { id } = await ctx.params;
  const row = await getExtraction(id);
  if (!row || row.userId !== actor.userId) return apiError(404, "not_found", "Extraction not found");
  const files: { name: string; data: Buffer | string }[] = [];
  if (row.brand) {
    files.push({ name: "brand.json", data: JSON.stringify(row.brand, null, 2) });
    if (row.brand.tokens?.css) files.push({ name: "tokens.css", data: row.brand.tokens.css });
    if (row.status === "completed") files.push({ name: "brief.md", data: brandBrief(row.brand) });
  }
  for (const [name, key] of [["source.html", row.htmlPath], ["styles.css", row.cssPath], ["screenshot.jpg", row.screenshotPath], ["hero.jpg", row.heroPath]] as const) {
    const b = key ? await getObject(key) : null;
    if (b) files.push({ name, data: b });
  }
  const body = zip(files);
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${row.domain}-onbrand.zip"` },
  });
}

export const GET = logged("GET /v1/extract/[id]/bundle", handleGET);
