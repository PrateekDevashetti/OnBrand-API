import { getAdherence, getExtraction, publicUrl } from "@onbrand/core";
import { serializeAdherence } from "./serialize";

export async function loadAdherence(id: string, userId: string) {
  const row = await getAdherence(id);
  if (!row || row.userId !== userId) return null;
  const side = async (eid: string | null) => {
    if (!eid) return null;
    const e = await getExtraction(eid);
    return e ? { id: e.id, status: e.status, url: e.url, company: e.company, hero: publicUrl(e.heroPath), favicon: e.brand?.favicon ?? null, brand: e.brand ?? null } : null;
  };
  return { ...serializeAdherence(row), reference: await side(row.referenceExtractionId), design: await side(row.designExtractionId) };
}
