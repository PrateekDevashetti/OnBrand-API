import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Privacy Policy · OnBrand API" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="5 October 2026"
      intro="This policy explains what OnBrand (a Canopy Labs product) stores, why, who processes it and how to remove it."
      sections={[
        {
          h: "What we store",
          p: [
            [
              "Account details from sign-in (name, email) and optional company name and website you add in Profile.",
              "API keys, stored only as one-way hashes plus a short prefix so you can recognise them.",
              "What you submit and what we produce: URLs, search queries, extracted brand systems, adherence reports, and the artifacts captured from the public pages you submit (HTML, CSS and screenshots).",
              "Usage and billing records: credits spent, request counts and job timings.",
              "Request logs: method, route, status, latency, key prefix and user agent, used for debugging, abuse prevention and usage charts.",
              "Short-lived rate-limit counters keyed by API key or IP address (kept for about an hour).",
            ],
          ],
        },
        { h: "Why we use it", p: ["To run the service, bill credits, show your history and usage, prevent abuse, and measure and improve extraction quality. We do not sell personal data and do not use your submissions to train third-party models."] },
        {
          h: "Who processes it",
          p: [
            "We use service providers to host and run OnBrand:",
            ["Clerk — authentication", "Vercel and Railway — application hosting and background workers", "Neon — Postgres database", "S3-compatible object storage — artifacts", "Anthropic — the optional AI review pass over captured page content", "Firecrawl — fallback page capture when the browser engine is unavailable"],
          ],
        },
        { h: "Sharing", p: ["Results are private to your account unless you make them public with a share link. Anyone with a public link can view that result until you make it private again."] },
        { h: "Retention and deletion", p: ["We keep your data while your account is active. Deleting your account from Profile settings removes your keys, extraction, search and adherence data. Cached copies of public pages in the shared style index may be retained as part of that index."] },
        { h: "Your rights", p: ["You can access and export your results through the dashboard and API, correct your profile, and delete your account. For any other request email support@trycanopy.space."] },
        { h: "Site owners", p: ["Our crawler identifies itself as OnBrandBot. If you own a site and want it excluded from extraction, email support@trycanopy.space and we will add it to our opt-out list."] },
      ]}
    />
  );
}
