import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loadAdherence } from "@/lib/adherence";
import { AdherenceView, type AdherenceData } from "@/components/adherence/AdherenceView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adherence report" };

export default async function AdherenceRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getSessionUser())!;
  const data = await loadAdherence(id, user.id);
  if (!data) notFound();
  return <AdherenceView initial={JSON.parse(JSON.stringify(data)) as AdherenceData} />;
}
