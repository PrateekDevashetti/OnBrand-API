import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema, publicUrl } from "@onbrand/core";
import { BrandViewer } from "@/components/brand/BrandViewer";
import { Wordmark } from "@/components/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await db.query.extractions.findFirst({ where: eq(schema.extractions.shareToken, token) });
  return { title: row ? `${row.company} brand system` : "Shared brand system" };
}

/** Public, read-only brand system shared via link. */
export default async function SharedBrand({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await db.query.extractions.findFirst({ where: eq(schema.extractions.shareToken, token) });
  if (!row) notFound();
  return (
    <div className="h-screen overflow-y-auto bg-chrome" id="panel">
      <header className="flex h-[72px] items-center justify-between px-[15px] pr-[30px]">
        <Wordmark href="/" />
        <a href="/app" className="btn-outline">Try OnBrand</a>
      </header>
      <BrandViewer
        shared
        initial={{
          id: row.id,
          status: row.status,
          url: row.url,
          createdAt: row.createdAt.toISOString(),
          error: row.error,
          stages: row.stages,
          brand: row.brand,
          artifacts: { screenshot: publicUrl(row.screenshotPath), html: null, css: null },
        }}
      />
    </div>
  );
}
