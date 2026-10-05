/**
 * OnBrand engine worker (Railway).
 * Claims jobs from Postgres (FOR UPDATE SKIP LOCKED), runs extractions / adherence with Playwright,
 * and exposes /health for the platform.
 */
import http from "node:http";
import { claimJob, finishJob, runExtraction, runAdherence, browserAvailable, reapStaleExtractions } from "@onbrand/core";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 3);
let running = 0;
let processed = 0;
let stopping = false;

async function loop(slot: number) {
  while (!stopping) {
    const job = await claimJob().catch((e) => {
      console.error("[worker] claim failed", (e as Error).message);
      return null;
    });
    if (!job) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    running++;
    const t = Date.now();
    let ok = true;
    try {
      if (job.kind === "extract") await runExtraction(job.refId);
      else await runAdherence(job.refId);
    } catch (e) {
      ok = false;
      console.error(`[worker:${slot}] ${job.kind} ${job.refId} crashed`, e);
    } finally {
      running--;
      processed++;
      await finishJob(job.id, ok).catch(() => {});
      console.log(`[worker:${slot}] ${job.kind} ${job.refId} ${ok ? "done" : "failed"} in ${Math.round((Date.now() - t) / 1000)}s`);
    }
  }
}

http
  .createServer((req, res) => {
    if (req.url?.startsWith("/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, running, processed, concurrency: CONCURRENCY, browser: browserAvailable() }));
      return;
    }
    res.writeHead(404).end();
  })
  .listen(Number(process.env.PORT ?? 8080), () => console.log(`[worker] up · concurrency ${CONCURRENCY} · browser ${browserAvailable() ? "ok" : "MISSING"}`));

for (let i = 0; i < CONCURRENCY; i++) void loop(i);

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    stopping = true;
    console.log(`[worker] ${sig}: draining ${running} job(s)`);
    const wait = setInterval(() => running === 0 && (clearInterval(wait), process.exit(0)), 500);
    setTimeout(() => process.exit(0), 120_000);
  });
}

// Fail + refund anything stuck past the stale window (e.g. a crash mid-crawl).
setInterval(() => {
  reapStaleExtractions()
    .then((n) => n && console.log(`[worker] reaped ${n} stale extraction(s)`))
    .catch((e) => console.error("[worker] reaper failed", (e as Error).message));
}, 60_000).unref();
