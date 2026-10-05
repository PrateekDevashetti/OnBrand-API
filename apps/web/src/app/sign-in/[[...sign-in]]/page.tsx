import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Sign in" };

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-chrome px-6">
      <Wordmark href="/" />
      <SignIn fallbackRedirectUrl="/app" />
    </div>
  );
}
