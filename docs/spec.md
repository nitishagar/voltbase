# voltbase — spec excerpts (S1 copy)

Source of truth: `IMPLICIT_SPEC.md` + `PLAN.md` §4 S1 in the plan bundle
(`thoughts/shared/plans/2026-09-14-voltbase/`). This file pins the S1 slice;
later stages extend it, never silently widen it.

## IS-01 — Apache-2.0 canonical, open-core boundary explicit

`LICENSE` is canonical Apache-2.0; every distributable manifest carries
`Apache-2.0`; the repo distinguishes the private working tree (until the
public flip) from public artefacts (lib `dist/`, Pages `site/dist`).

## IS-05 — BYOK by name, never stored

Third-party keys are referenced by env/header NAME per request (see
`docs/env.md`: `OCM_API_KEY`, deploy names at S13 only); never logged,
persisted, baked into git, or shipped in the Pages artifact or npm `dist/`.
Missing key ⇒ typed `UNCONFIGURED` skip, not failure.

## IS-06 — Stateless edge, explicit persistence

The Worker is stateless across requests (null cache default) until an ADR
explicitly adds KV/D1 + invalidation + budget math; no sessions, no Durable
Objects in v0.1. S1 ships zero bindings (`wrangler.jsonc` carries no
KV/D1/DO/R2 — asserted by the no-persistence gate test).

## IS-09 — Reproducible swarm (process invariants)

`LEDGER.md` single-writer handoff; stage commits named `S<N>:`, zero
attribution trailers; exact-pinned deps; builder ≠ verifier; sequential
subagents only (ratelimit); 3 verification rounds max then BLOCKED.
`git remote -v` stays empty until the S13-equivalent push.

## IS-10 — Bounding assumptions

v0.1 is READ-ONLY discovery/normalise/serve (no sessions, payments, OTP/auth,
custom domains). EU-first live data; India data-only. Free-tier ceilings are
hard (Workers 100k req/d + 10ms CPU + 50 subrequests + 6 concurrent outbound
+ 5 crons/account + 64 MiB uncompressed; KV/D1/Pages/Actions caps per
`docs/free-tier-limits.md`) — any breach ⇒ cut scope + ADR, never upgrade.
TS-first; private-then-public (Pages publishes only on the public flip).

## S1 scope (PLAN §4 S1)

Scaffold, tooling, gates: root configs + strict TS + eslint + vitest (node +
workers pools) + `check-banned` + fixtures + `smoke` + CI (no deploy job) +
spec excerpts + README/LEDGER link; Worker `/` + `/healthz {"ok":true,
"stage":1}` + `src/lib/stage.ts`; package shells; site shell emitting
`site/dist/index.html`. Six minimum gate tests, all green via `npm run verify`.
