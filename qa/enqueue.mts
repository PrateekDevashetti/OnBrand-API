import { createExtraction, getExtraction } from "../packages/core/src/index.ts";
const r = await createExtraction({ userId: "dev_user", via: "api" }, { url: "https://resend.com", depth: "light", cache: false });
console.log(r.id, r.status);
process.exit(0);
