import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { CanopyMark } from "@/components/brand";
import { Frame } from "@/components/shell/Frame";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-chrome">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside className="relative flex w-[244px] shrink-0 flex-col">
          <Sidebar />
          <div className="absolute bottom-[22px] left-[24px]">
            <CanopyMark size={34} />
          </div>
        </aside>
        <Frame>{children}</Frame>
      </div>
    </div>
  );
}
