import { capturePage } from "../packages/core/src/engine/crawl";
const cap = await capturePage(process.argv[2] ?? "https://tastelabs.com/", { mode: "lite" } as never);
const s = cap.signals;
console.log("COLORS", s.colors.slice(0, 25).map((c) => `${c.hex} w${c.weight.toFixed(1)} t${c.text} b${c.bg} br${c.border} a${c.alpha}`).join("\n"));
console.log("VARS", s.cssVars.filter((v) => /#|rgb/.test(v.value)).slice(0, 40).map((v) => `${v.name}=${v.value}`).join("\n"));
process.exit(0);
