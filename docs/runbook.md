# voltbase — runbook (S7, v0.1)

## Deploy (S13 public flip only — no deploy while private)

1. Confirm the repo is public and `git remote -v` points at the intended
   mirror (stays empty until S13 per IS-09).
2. `npm ci && npm run verify` must print `VERIFY OK stage=8` with 140+ tests
   green, bundle OK, TTFB OK, `check-banned: OK`.
3. `wrangler deploy --config packages/mcp/worker/wrangler.jsonc` (Worker
   `voltbase-api`; this config — not the root dev one — carries the single
   S6 cron `triggers.crons ["17 * * * *"]`, asserted by reliability.test.ts).
4. Docs: `npm run build` emits `site/dist`; publish via the trigger-guarded
   Pages workflow only (it skips while the repo is private).
5. Never publish npm workspaces while `private:true`. For a release dry-run:
   `node scripts/publish-workspaces.mjs` (default dry-run, tree untouched).

## Rotate keys (via wrangler secret)

- Keys are BYOK by NAME per request (`OCM_API_KEY`; deploy names
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` at S13 only — see
  `docs/env.md`, names only, zero values in git).
- Rotate the OCM key: set the new value with
  `wrangler secret put OCM_API_KEY` (S13), then confirm a live search still
  answers 200 and that no response body ever echoes the value (IS-05).
- Never log, persist, bake into git, or ship key values in `site/dist` or npm
  `dist/`. Missing key ⇒ typed `UNCONFIGURED` skip, not failure.

## Refresh feeds (incl manual refresh + cut-to-artifact)

- Automatic: the hourly-class cron (`17 * * * *`) runs the transition-only
  poller (journal appends once per status transition, never full upserts).
- Manual refresh: `npm run build` rebuilds `site/dist`; the reliability
  last-good cut (`packages/providers` prebuilt artifact) refreshes out of band
  and is served stale-labelled when the guard trips.
- Cut-to-artifact: when the 80% write-budget guard stops writes, the API and
  MCP keep serving the last-good prebuilt cut with `stale:true` +
  `staleReason` instead of failing empty.

## Handle a failed poll (UPSTREAM_FAILED)

1. Symptom: `GET /api/v1/reliability/:id` answers 503
   `{error:{code:UPSTREAM_FAILED}}` plus a `cut` payload, or the cron stats
   report `stopped: UPSTREAM_FAILED`.
2. Check the poller guard counters (in-memory per cron run, stopping at 80% of the KV 1k writes/d and D1 100k rows/d daily budgets): at 80% the
   stop is working as designed (ADR-002 §W1) — do not raise caps, do not buy
   a tier (IS-10: cut scope, never upgrade).
3. Serve the cut, keep the stale label, and wait for the next UTC day window;
   file a follow-up only if the guard trips three days running.

## Refunds

- Refund: n/a — v0.1 has no payments, sessions, billing, or paid tiers
  (read-only discovery over open data; IS-10).

## On-call

- On-call: none in v0.1 (no rotation — solo maintainer).
