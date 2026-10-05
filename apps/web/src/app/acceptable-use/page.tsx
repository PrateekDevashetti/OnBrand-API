import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Acceptable Use · OnBrand API" };

export default function AcceptableUse() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      updated="5 October 2026"
      intro="OnBrand renders web pages on your behalf. These rules keep that safe for you, for us and for the sites being analysed."
      sections={[
        { h: "Submit only public pages you may analyse", p: ["Submit publicly reachable pages that you own or are otherwise allowed to analyse. Do not submit pages behind logins, paywalls or access controls, and do not use OnBrand to copy or republish a site's content."] },
        { h: "No probing of private networks", p: ["Do not submit URLs that point to private, internal, loopback or cloud-metadata addresses, or that redirect there. These are blocked automatically; repeated attempts lead to suspension."] },
        { h: "Respect rate limits", p: ["API keys are limited to 120 requests per minute (30 per minute for job-creating calls) and 6 queued or running jobs at a time. Do not work around limits with multiple accounts or keys. Contact us for higher limits."] },
        { h: "No impersonation or deception", p: ["Do not use extracted brand systems to impersonate a company, create phishing pages, or mislead people about who made something."] },
        { h: "Crawler behaviour", p: ["Our crawler identifies itself as OnBrandBot, loads each page once per extraction, and caches results so repeated requests do not re-crawl. Site owners can opt out by emailing support@trycanopy.space."] },
        { h: "Enforcement", p: ["We may throttle, suspend or revoke keys and accounts that break this policy, and refuse requests that put the service or third parties at risk."] },
      ]}
    />
  );
}
