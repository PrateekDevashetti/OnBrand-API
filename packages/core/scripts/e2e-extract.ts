import { ensureUser, createExtraction, getExtraction, addCredits } from "../src/index";
const url = process.argv[2] ?? "https://tastelabs.com";
const depth = (process.argv[3] ?? "light") as "light" | "deep";
await ensureUser("dev_user", { email: "dev@onbrand.local", name: "Dev" });
await addCredits("dev_user", 10, "test");
const row = await createExtraction({ userId: "dev_user", via: "api" }, { url, depth, cache: false });
console.log("created", row.id, row.status);
const t = Date.now();
while (true) {
  await new Promise((r) => setTimeout(r, 3000));
  const e = await getExtraction(row.id);
  console.log(Math.round((Date.now() - t) / 1000) + "s", e?.status, e?.stages.map((s) => s.key + ":" + s.status[0]).join(" "));
  if (e?.status === "completed" || e?.status === "failed") {
    if (e.error) console.log("ERR", e.error);
    const b = e.brand!;
    console.log(JSON.stringify({ identity: b.identity, baseline: b.colors?.baseline, typoSummary: b.typography?.summary, families: b.typography?.families, titles: b.typography?.titles?.slice(0,2), buttons: b.interactions?.buttons?.slice(0,2), sections: b.sections?.map((s) => s.name), layoutTpl: b.layout?.template?.slice(0, 600) }, null, 1).slice(0, 6000));
    break;
  }
}
process.exit(0);
