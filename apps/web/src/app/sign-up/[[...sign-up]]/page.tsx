import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Sign up" };

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-chrome px-6">
      <Wordmark href="/" />
      <SignUp fallbackRedirectUrl="/app" />
    </div>
  );
}
