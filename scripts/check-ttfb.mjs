#!/usr/bin/env node
/**
 * scripts/check-ttfb.mjs — S7 local TTFB budget gate.
 *
 * Measures time-to-first-byte for `GET /` and `GET /api/v1/sites` via the
 * in-process Worker app (`app.request`, zero network). Budget: 300 ms per
 * route. The LOCAL-ONLY label is honest: this is an in-process timing, not a
 * network TTFB — network timing lands with the S13 deploy path.
 *
 * Usage: `node scripts/check-ttfb.mjs [--budget=300]`
 * Exit 1 with a FAIL line when any route exceeds the budget.
 */
import { app } from '../packages/mcp/worker/index.ts';

/** Local TTFB budget in milliseconds (S7 extra gate). */
export const TTFB_BUDGET_MS = 300;

/** Parses an optional `--budget=<ms>` / env override; throws on bad input. */
export const parseBudgetMs = (raw) => {
  if (raw === undefined || raw === null || raw === '') return TTFB_BUDGET_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000) {
    throw new Error(`invalid TTFB budget ${JSON.stringify(raw)}: expected 1..10000 ms`);
  }
  return n;
};

const budgetFromArgs = () => {
  const flag = process.argv.find((a) => a.startsWith('--budget='));
  if (flag !== undefined) return parseBudgetMs(flag.slice('--budget='.length));
  return parseBudgetMs(process.env.TTFB_BUDGET_MS);
};

const timed = async (path) => {
  const start = performance.now();
  const res = await app.request(path);
  // Drain the body so the timing covers first-byte-to-read on the local seam.
  await res.text();
  return { status: res.status, ms: performance.now() - start };
};

const isMain = process.argv[1] !== undefined && process.argv[1].endsWith('check-ttfb.mjs');
if (isMain) {
  const budget = budgetFromArgs();
  const routes = ['/', '/api/v1/sites?limit=5&offset=0'];
  let failed = false;
  for (const path of routes) {
    const { status, ms } = await timed(path);
    const ok = status === 200 && ms < budget;
    if (!ok) {
      process.stderr.write(
        `check-ttfb: FAIL — GET ${path} status ${String(status)} took ${ms.toFixed(1)}ms ` +
          `(budget ${String(budget)}ms, local-only via app.request, no network)\n`,
      );
      failed = true;
    } else {
      process.stdout.write(
        `check-ttfb: OK — GET ${path} ${ms.toFixed(1)}ms < ${String(budget)}ms ` +
          `(local-only via app.request, no network)\n`,
      );
    }
  }
  if (failed) process.exit(1);
}
