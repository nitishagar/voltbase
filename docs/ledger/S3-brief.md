# S3 brief — public REST API + abuse controls

Role: builder. Sequential only. No remotes, no secrets, no deploy.
Inputs: PLAN.md §4 S3; IS-03/04/05/06/08/10; ADR-002 (feeds), ADR-003 (Collective: serve-time must not construct cross-partition joins between OSM/non-OSM; attribution preserved); docs/stack.md; existing `packages/mcp/worker/index.ts` (Hono), `packages/core`, `packages/normalise` + fixtures, `src/lib/stage.ts`, `scripts/verify.sh`, lumen `packages/mcp/worker/{capping-fetcher.ts,rest.ts,cors.ts}` patterns.

## Tasks
1. Routes in `packages/mcp/worker/` (Hono, extend index.ts or `src/routes/*` re-exported): `GET /healthz` (keep, stage→3); `GET /api/v1/sites?...` (bbox, connector, minPower, openOnly, limit/offset pagination); `GET /api/v1/sites/:id`; `GET /api/v1/status/:id` (stale-label when retrievedAt beyond refresh SLO, e.g. >60min → `stale:true` + reason). Serve from in-memory fixture index (S2 EU+IN fixtures, servable-only via isServable; self/closed excluded; NO cross-partition OSM/non-OSM joins — filter then serve per-partition).
2. Abuse controls: optional free-key gating (missing/invalid key ⇒ 401 typed, public reads allowed per plan or document); in-memory IP rate-limit (e.g. 60/min ⇒ 429 typed); outbound allowlist + capping fetcher (2.5MB cap, mirror lumen) + public-URL guard (private/internal origins impossible — reject 10/172.16/192.168/localhost/metadata); per-request BYOK (OCM key by header name only, never logged/stored); CORS minimal; security headers (CSP, nosniff, frame-deny); request-id + JSON logs, no PII.
3. Bump STAGE 2→3 (stage.ts, verify.sh, /healthz, smoke). Wire bundle ≤1.5MB gzip self-budget check into verify (comment: cold-start choice, not platform cap — platform is 64 MiB uncompressed). Extend smoke.sh to exercise search + site + status.
4. TS strict, no any, exact pins, eslint clean. Files owned: `packages/mcp/worker/*`, routes, ratelimit/fetch guards. No KV/D1 (memory only + ADR note in code comment).

## Min tests 12 (keep prior 37 green → ≥49)
filters narrow (bbox/connector/minPower/openOnly); self/closed excluded; pagination disjoint (limit/offset no overlap); key missing/invalid 401; IP rate-limit 429; oversize/SSRF rejected (allowlist + private-host reject); stale flag; CSP/security headers present; 404 shape; request-id present. Place `packages/mcp/worker/api.test.ts` (+ guards test).

## Extra gates
smoke hits search+site+status; bundle gate wired; VERIFY OK stage=3; remote empty.
Return files + verify + tests. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
