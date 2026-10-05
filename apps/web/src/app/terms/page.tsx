import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Terms of Service · OnBrand API" };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="5 October 2026"
      intro="These terms govern your use of OnBrand, a Canopy Labs product (the dashboard, REST API, MCP server, SDK and agent skills). By creating an account or using an API key you agree to them."
      sections={[
        { h: "1. Your account", p: ["You need an account to use the dashboard and to create API keys. You are responsible for activity under your account and keys. Keep keys secret; revoke any key you believe is exposed from the API Keys page."] },
        { h: "2. What the service does", p: ["OnBrand renders public web pages you submit, measures their visual design (colours, typography, layout, components, motion) and returns a structured brand system, search results over our curated index, and adherence reports. Results are generated automatically and may contain errors; review them before relying on them."] },
        { h: "3. Credits, plans and refunds", p: ["Requests consume credits as listed on the pricing and billing pages. Jobs that fail are refunded automatically. Cached results are free. Plan allowances roll over while your plan is active. We may change prices with notice; changes never affect credits you already hold."] },
        { h: "4. Acceptable use", p: ["You must follow the Acceptable Use Policy. In short: only submit pages you are allowed to analyse, do not attempt to reach private networks, and do not overload the service or other people's sites."] },
        { h: "5. Content and ownership", p: ["You keep the rights you have in what you submit. Brand marks, logos and content captured from third-party sites belong to their owners; OnBrand describes them so you can work consistently with a brand you are entitled to use. Do not use outputs to impersonate a brand or to infringe its rights.", "You grant us the limited rights needed to run the service for you: fetching the pages you submit, storing the resulting artifacts and showing them to you (and to anyone you share a public link with)."] },
        { h: "6. Availability and changes", p: ["The service is provided “as is” and features marked Alpha or Beta may change. We aim for high availability but do not guarantee uninterrupted service unless a separate agreement says so."] },
        { h: "7. Suspension and termination", p: ["We may suspend keys or accounts that breach these terms or put the service or others at risk. You can delete your account at any time from Profile settings, which removes your keys and extraction data."] },
        { h: "8. Liability", p: ["To the extent permitted by law, Canopy Labs is not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the three months before the claim."] },
        { h: "9. Changes to these terms", p: ["We will post updates on this page and change the date above. Material changes will be announced by email or in the dashboard before they take effect."] },
      ]}
    />
  );
}
