/** Pricing. Credits roll over; plans add their allowance monthly. */
export const PLANS = [
  { id: "starter", name: "Starter", monthly: 79, credits: 600, features: ["Access to all endpoints", "MCP access", "Top up at $79 per 600 credits", "$0.132 per credit"], cta: "Choose Starter Plan" },
  { id: "pro", name: "Pro", monthly: 599, credits: 6000, features: ["Everything from Starter", "Onboarding support", "$0.10 per credit"], cta: "Choose Pro Plan" },
  { id: "enterprise", name: "Enterprise", monthly: null, credits: null, features: ["Everything from Pro", "Volume discount", "Slack support", "Self-hosted engine option", "Early access to new features"], cta: "Contact us" },
] as const;

export const ANNUAL_DISCOUNT = 0.15;
