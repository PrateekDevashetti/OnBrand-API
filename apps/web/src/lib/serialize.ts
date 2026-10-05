import { publicUrl, listChildExtractions, type schema } from "@onbrand/core";
import { config } from "./config";

type ExtractionRow = typeof schema.extractions.$inferSelect;
type AdherenceRow = typeof schema.adherenceRuns.$inferSelect;

const abs = (p: string | null) => (p ? (p.startsWith("http") ? p : `${config.appUrl}${p}`) : null);

export async function serializeExtraction(row: ExtractionRow, opts: { includeBrand?: boolean; children?: boolean } = {}) {
  const children = opts.children ? await listChildExtractions(row.id) : undefined;
  return {
    id: row.id,
    object: "extraction",
    status: row.status,
    url: row.url,
    domain: row.domain,
    company: row.company,
    depth: row.depth,
    source: row.source,
    pages: row.pagesMode,
    credits: row.credits,
    stages: row.stages,
    palette: row.palette,
    error: row.error,
    created_at: row.createdAt,
    finished_at: row.finishedAt,
    latency_ms: row.latencyMs,
    artifacts: {
      screenshot: abs(publicUrl(row.screenshotPath)),
      hero: abs(publicUrl(row.heroPath)),
      html: abs(publicUrl(row.htmlPath)),
      css: abs(publicUrl(row.cssPath)),
    },
    brand: opts.includeBrand === false ? undefined : row.brand,
    pages_extracted: children?.map((c) => ({ id: c.id, url: c.url, status: c.status, palette: c.palette })),
  };
}

export function serializeAdherence(row: AdherenceRow) {
  return {
    id: row.id,
    object: "adherence",
    status: row.status,
    reference_url: row.referenceUrl,
    design_url: row.designUrl,
    reference_extraction_id: row.referenceExtractionId,
    design_extraction_id: row.designExtractionId,
    score: row.score,
    stages: row.stages,
    report: row.report,
    credits: row.credits,
    error: row.error,
    created_at: row.createdAt,
    finished_at: row.finishedAt,
    latency_ms: row.latencyMs,
  };
}
