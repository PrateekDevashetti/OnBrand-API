import { UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth";

/** Signed-in user menu (Clerk). Hidden in local single-user dev mode. */
export function AccountButton() {
  if (!clerkEnabled) return null;
  return (
    <div className="ml-[6px] flex h-[32px] w-[32px] items-center justify-center">
      <UserButton appearance={{ elements: { avatarBox: "h-[28px] w-[28px]" } }} />
    </div>
  );
}
