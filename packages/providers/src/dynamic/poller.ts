/**
 * S6 hourly-class poller (packages/providers/src/dynamic/poller.ts).
 *
 * ADR-002 §W1 caps (from docs/free-tier-limits.md): ≤6 concurrent outbound
 * fetches and ≤50 subrequests per cron invocation (Workers: 6 simultaneous
 * outbound, 50 subrequests/invocation, ≤5 crons/account). Both are ENFORCED
 * here, not merely documented: inputs beyond 50 subrequests are refused with
 * the typed `POLLER_CAP_EXCEEDED` error, and the lane pool never exceeds 6
 * in flight (observed max reported in the result for the cap test).
 *
 * Each target costs exactly one subrequest; each journaled transition costs
 * exactly one D1 row and the invocation books one KV marker write. When the
 * 80% write-budget guard trips mid-run the poller stops issuing new fetches
 * and reports `stopped: 'UPSTREAM_FAILED'` so the caller serves the
 * last-good prebuilt cut (cut-to-artifact).
 */
import { WriteBudget } from './budget.ts';
import { TransitionJournal, type StatusSample } from './journal.ts';

/** Workers free-tier fan-out ceilings (hard platform caps, enforced below). */
export const MAX_SUBREQUESTS_PER_INVOCATION = 50;
export const MAX_CONCURRENT_OUTBOUND = 6;

/** Typed refusal when a cron tick asks for more than the invocation budget. */
export class PollerCapError extends Error {
  readonly code = 'POLLER_CAP_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'PollerCapError';
  }
}

export interface PollTarget {
  id: string;
}

export interface PollerOptions {
  journal?: TransitionJournal;
  budget?: WriteBudget;
  maxConcurrent?: number;
  maxSubrequests?: number;
}

export interface PollerResult {
  observed: number;
  appended: number;
  subrequests: number;
  maxConcurrent: number;
  stopped: 'UPSTREAM_FAILED' | null;
  journal: TransitionJournal;
}

export const runPoller = async (
  targets: ReadonlyArray<PollTarget>,
  fetchStatus: (target: PollTarget) => Promise<StatusSample>,
  opts: PollerOptions = {},
): Promise<PollerResult> => {
  const journal = opts.journal ?? new TransitionJournal();
  const budget = opts.budget;
  const maxSubrequests = opts.maxSubrequests ?? MAX_SUBREQUESTS_PER_INVOCATION;
  const lanes = Math.max(1, Math.min(opts.maxConcurrent ?? MAX_CONCURRENT_OUTBOUND, targets.length));
  if (targets.length > maxSubrequests) {
    throw new PollerCapError(
      `poll refused: ${String(targets.length)} targets exceed the ${String(maxSubrequests)} subrequest budget per invocation`,
    );
  }
  // One KV marker write per invocation (ADR-002 W1: per-minute markers alone
  // would break the 1k writes/d cap; hourly-class keeps this at ~24/d).
  budget?.recordKvWrites(1);
  const guardTripped = (): boolean => budget?.exhausted ?? false;
  if (guardTripped()) {
    return { observed: 0, appended: 0, subrequests: 0, maxConcurrent: 0, stopped: 'UPSTREAM_FAILED', journal };
  }
  let next = 0;
  let active = 0;
  let maxConcurrent = 0;
  let observed = 0;
  let appended = 0;
  let stopped: 'UPSTREAM_FAILED' | null = null;
  const worker = async (): Promise<void> => {
    while (next < targets.length) {
      if (guardTripped() || stopped !== null) return;
      const target = targets[next];
      next += 1;
      if (target === undefined) return;
      active += 1;
      if (active > maxConcurrent) maxConcurrent = active;
      try {
        const sample = await fetchStatus(target);
        observed += 1;
        const entry = journal.observe(sample);
        if (entry !== null) {
          budget?.recordD1Rows(1);
          appended += 1;
          if (guardTripped()) stopped = 'UPSTREAM_FAILED';
        }
      } finally {
        active -= 1;
      }
    }
  };
  const pool: Array<Promise<void>> = [];
  for (let i = 0; i < lanes; i += 1) pool.push(worker());
  await Promise.all(pool);
  if (stopped === null && guardTripped()) stopped = 'UPSTREAM_FAILED';
  return { observed, appended, subrequests: observed, stopped, maxConcurrent, journal };
};
