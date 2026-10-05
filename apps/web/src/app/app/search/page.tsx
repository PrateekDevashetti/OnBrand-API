import { eq } from "drizzle-orm";
import { db, schema, featuredStyles } from "@onbrand/core";
import { getSessionUser } from "@/lib/auth";
import { SearchExperience } from "@/components/search/SearchExperience";

export const dynamic = "force-dynamic";
export const metadata = { title: "Style Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const user = (await getSessionUser())!;
  const featured = await featuredStyles(12);
  let initial = null;
  if (s) {
    const row = await db.query.searches.findFirst({ where: eq(schema.searches.id, s) });
    if (row && row.userId === user.id) initial = { id: row.id, query: row.query, depth: row.depth, tags: row.tags, results: row.results, filters: (row.filters as { facets?: string[] }).facets ?? [] };
  }
  return <SearchExperience featured={featured} initial={initial} />;
}
