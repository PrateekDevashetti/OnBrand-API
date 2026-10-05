import { DocsContent } from "@/components/docs/DocsContent";
import { PublicFooter, PublicHeader } from "@/components/landing/PublicHeader";

export const metadata = {
  title: "Documentation · OnBrand API",
  description: "REST API, MCP server, agent skills and SDK for OnBrand: extract brand systems, search visual styles and verify brand adherence.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#1e1e1e] text-cream">
      <PublicHeader />
      <DocsContent />
      <PublicFooter />
    </div>
  );
}
