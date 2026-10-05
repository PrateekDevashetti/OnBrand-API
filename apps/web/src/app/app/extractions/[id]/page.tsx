import { notFound } from "next/navigation";
import { getExtraction, publicUrl } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { BrandViewer } from "@/components/brand/BrandViewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getExtraction(id);
  return { title: row ? `${row.company} brand system` : "Extraction" };
}

export default async function ExtractionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const row = await getExtraction(id);
  if (!row || row.userId !== user?.id) notFound();
  return (
    <BrandViewer
      initial={{
        id: row.id,
        status: row.status,
        url: row.url,
        createdAt: row.createdAt.toISOString(),
        error: row.error,
        stages: row.stages,
        brand: row.brand,
        artifacts: { screenshot: publicUrl(row.screenshotPath), html: publicUrl(row.htmlPath), css: publicUrl(row.cssPath) },
      }}
    />
  );
}
