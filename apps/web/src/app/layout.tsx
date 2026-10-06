import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500", "600", "700"] });
const mono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: { default: "OnBrand API — Canopy Labs", template: "%s · OnBrand" },
  description: "Extract any brand system, search for style inspiration, and verify your agents stay on brand. The brand layer for AI, by Canopy Labs.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100"),
};

const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
  return clerkOn ? (
    <ClerkProvider
      appearance={{ variables: { colorPrimary: "#f3f6f0", colorBackground: "#1c1c1c", borderRadius: "6px", fontFamily: "var(--font-dm-sans)" } }}
      localization={{
        signIn: { start: { title: "Sign in to OnBrand", subtitle: "Welcome back. Sign in to keep your agents on brand." } },
        signUp: { start: { title: "Create your OnBrand account", subtitle: "20 free credits. No card needed." } },
      }}
    >
      {body}
    </ClerkProvider>
  ) : (
    body
  );
}
