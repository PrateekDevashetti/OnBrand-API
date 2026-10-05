import { eq } from "drizzle-orm";
import { db, schema } from "@onbrand/core";
import { getSessionUser, clerkEnabled } from "@/lib/auth";
import { ProfileView } from "@/components/account/ProfileView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = (await getSessionUser())!;
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  return <ProfileView clerk={clerkEnabled} initial={{ name: u?.name ?? "", email: u?.email ?? "", companyName: u?.companyName ?? "", companyWebsite: u?.companyWebsite ?? "" }} />;
}
