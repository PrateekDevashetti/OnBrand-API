import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const isDashboard = createRouteMatcher(["/app(.*)"]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isDashboard(req)) await auth.protect();
});

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (!clerkOn) return NextResponse.next();
  return withClerk(req, ev);
}

export const config = {
  matcher: ["/((?!_next|api/files|.*\\.(?:css|js|png|jpg|jpeg|svg|ico|webp|woff2?|ttf|txt|map)).*)", "/(api|trpc)(.*)"],
};
