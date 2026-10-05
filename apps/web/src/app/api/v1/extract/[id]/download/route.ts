import { logged } from "@/lib/logged";
import { getExtraction, publicUrl } from "@onbrand/core";
import { getActor } from "@/lib/auth";
import { json, notFound, notReady } from "@/lib/http";
import { config } from "@/lib/config";

const abs = (p: string | null) => (p ? (p.startsWith("http") ? p : `${config.appUrl}${p}`) : null);

/**
 * A manifest of every file in a completed extraction, as one flat tree: `brand.json` inline, plus
 * download URLs for the captured HTML, CSS and screenshots (served from OnBrand storage, so they
 * outlive changes to the origin site). For a zip of the same tree use /bundle.
 */
async function handleGET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await getExtraction(id);
  const actor = await getActor(req, "api");
  if (!row || (!row.isPublic && row.userId !== actor?.userId)) return notFound("Extraction");
  if (row.status !== "completed") return notReady(`Extraction is ${row.status}. Downloads are available once it completes.`);
  const files: { path: string; content?: string; url?: string | null }[] = [
    { path: "brand.json", content: JSON.stringify(row.brand, null, 2) },
    { path: "tokens.json", content: JSON.stringify(row.brand?.tokens ?? {}, null, 2) },
    { path: "capture/source.html", url: abs(publicUrl(row.htmlPath)) },
    { path: "capture/styles.css", url: abs(publicUrl(row.cssPath)) },
    { path: "capture/screenshot.jpg", url: abs(publicUrl(row.screenshotPath)) },
    { path: "capture/hero.jpg", url: abs(publicUrl(row.heroPath)) },
  ];
  const media = (row.brand?.media ?? []).filter((m) => m.url?.startsWith("http")).slice(0, 40);
  media.forEach((m, i) => files.push({ path: `media/${String(i + 1).padStart(2, "0")}-${(m.name || "asset").replace(/[^a-z0-9.-]+/gi, "-").slice(0, 60)}`, url: m.url }));
  return json({ object: "extraction_manifest", extraction_id: row.id, sections: row.sections ?? null, files: files.filter((f) => f.content !== undefined || f.url) });
}

export const GET = logged("GET /v1/extract/[id]/download", handleGET);
