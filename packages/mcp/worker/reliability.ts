/**
 * S6 reliability surface (packages/mcp/worker/reliability.ts).
 *
 * - `GET /api/v1/reliability/:id` — per-site uptime rollup over the trailing
 *   24h window with the S3 stale label. Servable ids only (closed/self ids ⇒
 *   404, never a closed signal, ADR-003). Fresh per-request composition
 *   (IS-06 null-cache): a new `WriteBudget` + empty journal snapshot per call
 *   — nothing mutable is shared across requests. When the injected budget is
 *   exhausted the route answers typed `UPSTREAM_FAILED` (503) AND serves the
 *   last-good prebuilt cut + stale label in the same envelope
 *   (cut-to-artifact, ADR-002 §W1).
 * - `runScheduledPoll` — the hourly-class cron body: replays the servable
 *   fixture index through the real S6 poller seam (transition detector +
 *   80% write-budget guard, ≤50 subrequests / ≤6 concurrent). v0.1 performs
 *   no live fetch here — samples come from the in-memory index so the
 *   detector/guard path is exercised without new bindings; live ADR-002 feed
 *   fetch lands as a follow-up without changing these caps.
 */
import type { Context } from 'hono';
import { TransitionJournal, WriteBudget, getReliability, runPoller } from '@voltbase/providers';
import { errorJson } from './routes.ts';
import { SERVABLE_SITES, findServableById } from './store.ts';

/** Decodes a path id segment (`:` and `/` arrive percent-encoded from clients). */
const decodeId = (raw: string): string => {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export interface ReliabilityDeps {
  now: () => number;
  /** Injected for the guard test; defaults to a fresh per-request budget (null-cache). */
  budget?: WriteBudget;
  /** Injected journal snapshot; defaults to empty (per-request, never shared). */
  journal?: TransitionJournal;
}

/** GET /api/v1/reliability/:id — uptime rollup or typed UPSTREAM_FAILED + cut. */
export const handleGetReliability = (c: Context, deps: ReliabilityDeps): Response => {
  const raw = c.req.param('id');
  const site = raw === undefined ? undefined : findServableById(decodeId(raw));
  if (site === undefined) return errorJson('NOT_FOUND', 404, 'unknown site id');
  const answer = getReliability({
    id: site.id,
    startStatus: site.status,
    entries: (deps.journal ?? new TransitionJournal()).entriesFor(site.id),
    observedAt: site.provenance.retrievedAt,
    nowMs: deps.now(),
    budget: deps.budget ?? new WriteBudget(),
  });
  if (!answer.ok) {
    return Response.json(
      {
        error: { code: answer.code, message: answer.message },
        cut: { ...answer.cut, source: site.source, attribution: site.attribution },
      },
      { status: 503 },
    );
  }
  return Response.json({
    data: { ...answer.data, source: site.source, attribution: site.attribution },
  });
};

/* ------------------------------------------------------------------ */
/* Hourly-class cron body (one trigger, worker/wrangler.jsonc).         */
/* ------------------------------------------------------------------ */

export interface CronEvent {
  cron: string;
  scheduledTime: number;
}

export interface ScheduledCtx {
  waitUntil: (p: Promise<unknown>) => void;
}

export interface ScheduledPollStats {
  observed: number;
  appended: number;
  subrequests: number;
  maxConcurrent: number;
  stopped: 'UPSTREAM_FAILED' | null;
}

/**
 * One hourly-class tick over the 35 servable fixture ids (35 ≤ 50
 * subrequests, pool ≤ 6 concurrent): each id costs one sample observation,
 * each transition costs one guarded D1-row booking. Returns the poll stats
 * for the cron test; the checked-in cut is refreshed out-of-band via the
 * artifact writer (the isolate has no filesystem).
 */
export const runScheduledPoll = async (nowMs: number): Promise<ScheduledPollStats> => {
  const byId = new Map(SERVABLE_SITES.map((site) => [site.id, site] as const));
  const observedAt = new Date(nowMs).toISOString();
  const result = await runPoller(
    SERVABLE_SITES.map((site) => ({ id: site.id })),
    async (target) => {
      const site = byId.get(target.id);
      return { id: target.id, status: site?.status ?? 'UNKNOWN', observedAt };
    },
    { journal: new TransitionJournal(), budget: new WriteBudget() },
  );
  return {
    observed: result.observed,
    appended: result.appended,
    subrequests: result.subrequests,
    maxConcurrent: result.maxConcurrent,
    stopped: result.stopped,
  };
};
