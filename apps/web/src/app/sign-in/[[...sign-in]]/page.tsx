import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Sign in" };

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    if (process.env.NODE_ENV !== "production" || process.env.ONBRAND_DEV_AUTH === "true") redirect("/app");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-chrome px-6 text-center">
        <Wordmark href="/" />
        <p className="max-w-[420px] text-[15px] text-dim">Sign-in is being set up. Check back shortly, or reach us at hello@trycanopy.space.</p>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-chrome px-6">
      <Wordmark href="/" />
      <SignIn fallbackRedirectUrl="/app" />
    </div>
  );
}
