import { publicUrl, listChildExtractions, pickSections, effectiveSections, getExtraction, buildFixes, buildRecommendations, type schema, type SectionName, type StyleResult } from "@onbrand/core";
import { config } from "./config";

type ExtractionRow = typeof schema.extractions.$inferSelect;
type AdherenceRow = typeof schema.adherenceRuns.$inferSelect;

const abs = (p: string | null) => (p ? (p.startsWith("http") ? p : `${config.appUrl}${p}`) : null);

export async function serializeExtraction(row: ExtractionRow, opts: { includeBrand?: boolean; children?: boolean; sections?: SectionName[] | null } = {}) {
  const children = opts.children ? await listChildExtractions(row.id) : undefined;
  return {
    id: row.id,
    object: "extraction",
    status: row.status,
    url: row.url,
    domain: row.domain,
    company: row.company,
    depth: row.depth,
    synthesis: row.brand?.synthesis ?? null,
    source: row.source,
    pages: row.pagesMode,
    sections: row.sections ?? null,
    is_public: row.isPublic,
    cache_hit: row.source === "cache",
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
    brand: opts.includeBrand === false ? undefined : pickSections(row.brand, effectiveSections(row.sections, opts.sections ?? null)),
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
    candidate_url: row.designUrl,
    score: row.score,
    is_public: row.isPublic,
    stages: row.stages,
    report: row.report,
    credits: row.credits,
    error: row.error,
    created_at: row.createdAt,
    finished_at: row.finishedAt,
    latency_ms: row.latencyMs,
  };
}

/** The adherence verdict: score 0-1, worst-first recommendations and structured fixes. */
export async function serializeVerdict(row: AdherenceRow) {
  const report = row.report;
  let fixes = report?.fixes;
  let recommendations = report?.recommendations;
  if (report && !fixes && row.referenceExtractionId && row.designExtractionId) {
    // Runs created before structured fixes existed: derive them from the stored extractions.
    const [ref, des] = await Promise.all([getExtraction(row.referenceExtractionId), getExtraction(row.designExtractionId)]);
    if (ref?.brand && des?.brand) {
      fixes = buildFixes(ref.brand, des.brand);
      recommendations = buildRecommendations(report.categories, fixes);
    }
  }
  return {
    id: row.id,
    object: "adherence_verdict",
    status: row.status,
    reference_url: row.referenceUrl,
    candidate_url: row.designUrl,
    is_public: row.isPublic,
    score: report ? Math.round(report.overall.score) / 100 : null,
    grade: report?.overall.grade ?? null,
    summary: report?.overall.summary ?? null,
    recommendations: recommendations ?? [],
    fixes: (fixes ?? []).map(({ severity, ...f }) => (void severity, f)),
    categories: report?.categories.map((c) => ({ key: c.key, label: c.label, score: Math.round(c.score) / 100, verdict: c.verdict, matches: c.matches, deviations: c.deviations })) ?? [],
    agent_instructions: report?.agentInstructions ?? null,
    created_at: row.createdAt,
    finished_at: row.finishedAt,
  };
}

const MATCH: Record<string, "strong" | "good" | "related" | null> = { "Strong Match": "strong", "Good Match": "good", Related: "related", Discovery: null };

/** Public result-card shape for Style Search and similarity lookups. */
export function serializeCard(r: StyleResult) {
  return {
    id: r.id,
    url: r.url,
    brand_name: r.name,
    label: r.label,
    identity_paragraph: r.description,
    match: MATCH[r.match] ?? null,
    badge: r.badge ?? null,
    reason: r.reasoning && r.reasoning !== r.description ? r.reasoning : null,
    tags: r.tags,
    traits: r.traits ?? [],
    facets: r.facets ?? null,
    palette: { primary: r.palette.slice(0, 3), secondary: r.palette.slice(3), mode: r.mode },
    typography: r.typography,
    screenshot_url: abs(r.screenshot),
  };
}
