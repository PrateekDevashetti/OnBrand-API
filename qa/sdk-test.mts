import { OnBrand } from "../packages/sdk/src/index.ts";
const ob = new OnBrand({ apiKey: process.env.K, baseUrl: process.env.BASE ?? "http://localhost:3100" });
console.log("me", await ob.me());
const s = await ob.search({ query: "luxury editorial skincare", limit: 3 });
console.log("search", s.results.map((r) => `${r.name} (${r.match})`));
console.log("brief", (await ob.brief(process.argv[2] ?? "ext_f1p54g9tmdtdxnwr")).slice(0, 160));
console.log("tailwind", (await ob.tokens(process.argv[2] ?? "ext_f1p54g9tmdtdxnwr", "tailwind")).slice(0, 120));
