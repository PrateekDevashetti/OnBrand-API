/** Billing webhook tests: signature verification + idempotent credit grants (local DB). */
import crypto from "node:crypto";
import { applyStripeEvent, verifyStripeSignature, ensureUser, getBalance } from "../packages/core/src/index";
const secret = "whsec_test_local";
const sign = (raw: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex")}`;
const uid = "qa_billing_user";
await ensureUser(uid, { email: "billing-qa@example.com" });
const before = await getBalance(uid);
const evt = { id: `evt_${Date.now()}`, type: "checkout.session.completed", data: { object: { mode: "payment", payment_status: "paid", metadata: { user_id: uid, kind: "topup", plan: "starter", credits: "600" } } } };
const raw = JSON.stringify(evt);
const checks: [string, boolean][] = [
  ["valid signature accepted", verifyStripeSignature(raw, sign(raw), secret)],
  ["tampered body rejected", !verifyStripeSignature(raw + " ", sign(raw), secret)],
  ["stale timestamp rejected", !verifyStripeSignature(raw, sign(raw, Math.floor(Date.now() / 1000) - 900), secret)],
  ["missing header rejected", !verifyStripeSignature(raw, null, secret)],
];
checks.push(["first delivery applied", await applyStripeEvent(evt)]);
checks.push(["duplicate delivery ignored", !(await applyStripeEvent(evt))]);
const after = await getBalance(uid);
checks.push([`credits +600 exactly once (${before} → ${after})`, after - before === 600]);
const inv = { id: `evt_inv_${Date.now()}`, type: "invoice.paid", data: { object: { id: "in_test", parent: { subscription_details: { metadata: { user_id: uid, plan: "pro", credits: "6000" } } } } } };
await applyStripeEvent(inv);
checks.push(["invoice.paid adds plan allowance", (await getBalance(uid)) - after === 6000]);
for (const [n, ok] of checks) console.log(ok ? "✓" : "✗", n);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
