/** SSRF guard tests: shape + DNS checks, and a real browser capture through a redirect to a private IP. */
import { assertPublicUrl, normalizeUrl } from "../packages/core/src/index";
import { capturePage } from "../packages/core/src/engine/crawl";

const bad = [
  "http://127.0.0.1", "http://localhost:3100", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.5", "http://192.168.1.1",
  "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://0.0.0.0", "http://100.64.0.1", "file:///etc/passwd", "ftp://example.com",
  "http://example.com:8080", "http://user:pw@example.com", "http://intranet", "http://db.railway.internal", "http://localtest.me",
  "http://127.0.0.1.nip.io", "https://" + "a".repeat(2100) + ".com",
];
const good = ["https://stripe.com", "linear.app", "https://www.notion.com/product"];
let fail = 0;
for (const u of bad) {
  try { const n = normalizeUrl(u); await assertPublicUrl(n.url); console.log("✗ allowed  ", u.slice(0, 60)); fail++; }
  catch (e) { console.log("✓ blocked  ", u.slice(0, 60), "—", (e as Error).message); }
}
for (const u of good) {
  try { const n = normalizeUrl(u); await assertPublicUrl(n.url); console.log("✓ allowed  ", u); }
  catch (e) { console.log("✗ blocked  ", u, (e as Error).message); fail++; }
}
// Redirect: public URL that 302s to the cloud metadata IP must not be captured.
try {
  await capturePage("https://httpbin.org/redirect-to?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F", { lite: true, timeoutMs: 20000 });
  console.log("✗ redirect to metadata IP was captured"); fail++;
} catch (e) { console.log("✓ redirect blocked —", (e as Error).message.split("\n")[0]); }
console.log(fail ? `${fail} FAILED` : "all SSRF checks passed");
process.exit(fail ? 1 : 0);
