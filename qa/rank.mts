/** Print lexical ranking for a query. usage: npx tsx qa/rank.mts "query" */
import { db } from "../packages/core/src/db/client";
import { tokens, lexicalScore } from "../packages/core/src/search";
const q = process.argv[2];
const toks = tokens(q);
console.log(toks.join(" "));
const rows = await db.query.styleIndex.findMany();
rows.map((r) => ({ d: r.domain, s: lexicalScore(r, toks, []) })).sort((a, b) => b.s - a.s).slice(0, 16).forEach((x) => console.log(x.s.toFixed(1).padStart(5), x.d));
process.exit(0);
