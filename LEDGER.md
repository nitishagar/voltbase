# LEDGER — voltbase

## 0. Resume procedure (read this first, then nothing else until step 3)

1. Read sections 1 to 4. Do not read section 7 unless section 1 points you to an event.
2. Run: `node --version && npm install && npm run verify` (once S1 exists; before that: `ls ~/repos/learn/voltbase`).
   Expect `VERIFY OK stage=<N>` where N is the last PASSED stage in section 3. If it fails, run `git status` and `git log -3 --oneline`, record as event in section 7, fix tree first.
3. Continue from "Next action" in section 1. Sequential only: one builder then one verifier per stage. Never parallelise (ratelimit).

## 1. Status

- Current stage: S2
- Stage status: PASSED
- Last verified commit: 95e1f60 (S1: scaffold app, tooling, and verification gates)
- Next action: Commit `S2: add normalisation core and fixtures`, then spawn S3 builder (public REST API + abuse controls).
- Blocked on: none
- Updated: 2026-09-15T00:00:00Z by orchestrator S2-VERIFY (PASS r1: VERIFY OK stage=2, 37/37 tests, mutation isServable→true 7-fail then green, remote empty)

## 2. Context capsule (at most 15 lines; rewrite, do not append)

- What exists: S2 PASSED (core types + partition key + ULID/time, 4 mappers + licence filter unknown⇒closed, fixtures 30 EU + 10 India with closed proofs); VERIFY OK stage=2, 37/37 tests.
- How to run it: `npm install && npm run verify`.
- What is faked locally: site/dist local build; no KV/D1 (stateless); fixtures deterministic, no live fetch.
- Gotchas: private repo ⇒ Pages local-preview only; `private:true`; Worker stateless; sequential agents; pins TS 5.9.3/vitest 4.1.11/plugin 1.1.9/hono 4.13.7; 64 MiB cap (1.5 MB gzip self); D1 hard-fail; 5 crons, 6 concurrent; OCM BYOK; OSM extracts only; NL CC0 site-wide.
- Decisions: Hono default; npm; NL→LU(CC0 KML)→FR, DE/SE-NO wave 2; hourly transition-only + 80% guard + cut-to-artifact; Collective partitioned (feature_type, regional_cut, source, licence), closed never served.
- Open: LU 2nd DATEX II Not Specified; PT Mobi.e UNVERIFIED; OCM /v3/openapi keyed call; S3 next.
- Parallel work in flight: none (sequential).

## 3. Stage table

| Stage | Status | Builder | Verifier rounds | Final commit | Tests total | Report |
|---|---|---|---|---|---|---|
| S0 | PASSED | architect | verifier 1 round PASS | 5c98f8e | 0 | docs/ledger/S0-ARCH-brief.md |
| S1 | PASSED | builder | verifier r1 PASS | 95e1f60 | 10 | docs/ledger/S1-verify-r1.md |
| S2 | PASSED | builder | verifier r1 PASS | pending `S2: add normalisation core and fixtures` | 37 | docs/ledger/S2-verify-r1.md |
| S3 | NOT_STARTED | | | | | |
| S4 | NOT_STARTED | | | | | |
| S5 | NOT_STARTED | | | | | |
| S6 | NOT_STARTED | | | | | |
| S7 | NOT_STARTED | | | | | |
| S8 | NOT_STARTED | | | | | |
| S13 | NOT_STARTED | | | | | |

## 4. Decisions

| ID | Decision (one line) | File |
|---|---|---|
| ADR-001 | (S0) stack: TS-first unless challenger +10pts + spike pass | docs/adr/ADR-001-stack.md |
| ADR-002 | (S0) feeds: OCM opendata + OSM extracts + NAP subset (candidates NL→LU→FR) with per-dataset licences | docs/adr/ADR-002-feeds.md |
| ADR-003 | (S0) licence boundary: served index = ODbL Collective (partitioned) or Derivative (ODbL) | docs/adr/ADR-003-licence-boundary.md |

## 5. Environment

- Node: v22.23.2 npm 10.9.8 | gh: nitishagar (scopes admin:public_key, gist, read:org, repo; verified 2026-09-14)
- Registry facts 2026-09-14 (`npm view`): hono 4.13.7, itty-router 5.0.24, wrangler 4.131.2, @cloudflare/vitest-plugin 1.1.9 (peer vitest ^4.1), vitest 4.1.11 (5.0.0 unsupported by plugin), typescript 7.0.2 latest / 6.0.3 last usable with typescript-eslint 8.70.0, @modelcontextprotocol/sdk 1.30.0, agents 0.23.0, astro 7.3.2, pagefind 1.5.2, zod 4.6.5, eslint 10.10.0
- Local: `~/repos/learn/voltbase` (to create); remote: none until S13
- Vars/secrets/bindings: docs/env.md (S0); credentials present: none needed until S13 (Cloudflare token/account, npm account optional)

## 6. Open issues

| # | Found in | Description | Severity | Status |
|---|---|---|---|---|
| 1 | PLAN_VALIDATION W1 | AFIR poll cadence vs KV/D1 write caps unproven | Medium | open → S0.4 |
| 2 | PLAN_VALIDATION W2 | npm-vs-pnpm deviation needs ADR-001 rationale | Low | open → S0.5 |
| 3 | PLAN_VALIDATION W3 | e2e tool (Playwright vs light) undecided | Low | open → S7 |
| 4 | research pass 6 | NL NDW licence: CC0 site-wide + dataset page checked 2026-09-14 (nothing contrary); S0 eyeballs page at ingest time | Low | research-closed → S0.4 confirm |
| 5 | research pass 6 | DE Mobilithek consumer model VERIFIED (registration + approval + mTLS X.509; DATEX II mandatory from 2026-04-14); stays second-wave on evidence | Low | research-closed → S0.4 confirm |
| 6 | PLAN_VALIDATION W6 | Fly/Render/Oracle facts not re-verified (hosts ruled out) | Low | open (only if host decision reopens) |
| 7 | research pass 2 | ODbL Collective-vs-Derivative decision for merged index (ADR-003) | High | open → S0.5 |
| 8 | research pass 2 | Toolchain pins: vitest 4.1.x, TS ≤6.0.x, vitest-plugin not pool-workers | Medium | open → S0.5/S1 |
| 9 | research pass 4 | S5–S8 briefs need explicit Depends/Extra-gates/Files-owned (PLAN_VALIDATION W7) | Low | open → S0 |
| 10 | research pass 6 | LU second multi-operator DATEX II set is "License Not Specified" — clear licence before ingesting beyond CC0 Chargy KML | Medium | open → S0.4/ADR-002 |
| 11 | research pass 6 | OCM spec URL re-pinned (ocm-docs raw + /v3/openapi); D1 2026-09-01 date primary-sourced; NAPSPAN pricing re-pinned; FR canonical URL + NAP beta noted | Low | research-closed → S0 cites new URLs |

## 7. Event log (append only; newest last)

| Time (UTC) | Stage | Role | Event | Result | Commit |
|---|---|---|---|---|---|
| 2026-09-14T10:50:00Z | S0 | planner | plan bundle written (research+spec+plan+validation+ledger) | ok | — |
| 2026-09-14T13:50:00Z | S0 | research-verifier | research verification pass 2: 6 claims corrected, Follow-up §A–§G appended; PLAN/SPEC/VALIDATION rev 2; open issues 4–8 added | ok | — |
| 2026-09-14T14:15:00Z | S0 | research-verifier | verification pass 3: all load-bearing claims re-verified (gzip exact, EV lines, template :106-110/:118, npm peers, 64MiB changelog); 2 ledger rows [R]→[V], PLAN §2 wording fix, validation addendum 2 | ok | — |
| 2026-09-14T14:30:00Z | S0 | research-verifier | verification pass 4: six seam agents (C CONFIRMED, A/B/D/E/F PARTIAL) + main-context checks; 11 citation fixes in research, IS-03 NL edge, PLAN_VALIDATION W7 + addendum 3 | ok | — |
| 2026-09-14T14:50:00Z | S0 | research-verifier | verification pass 5: six fresh seam agents (A/B/C/D/E CONFIRMED, F CONFIRMED+3 style FLAGS) + main-context checks; 5 inline research fixes (wrangler path, EV :16, metafile ≈81%, Hono/NestJS nuance, itty 6.0.0 note), PLAN S0.3 wording, validation addendum 4; 0 new warnings | ok | — |
| 2026-09-14T15:00:00Z | S0 | research-verifier | follow-up pass 6: all 5 S0 re-pin tickets closed (OCM spec re-pinned, D1 date primary-sourced, NAPSPAN pricing live, NL page checked, DE model verified); LU second-set licence flagged (new issue 10); IS-03 edges updated | ok | — |
| 2026-09-14T14:57:00Z | S0 | research-verifier | verification pass 7 (exhaustive per-claim, 6 seam agents A-F + main-context gzip/metafile/OCM checks): A/B/D CONFIRMED, C grouping-clarified (both splits recorded, dominance ≥81%), E 403-nuance (call /v3/openapi with key), F FLAGS accepted; 0 plan logic changes | ok | — |
| 2026-09-14T16:30:00Z | S0 | research-verifier | verification pass 8 (exhaustive per-claim, 6 seam agents + main-context + live fetch): 5 citation fixes applied inline (remote :111-112, builder :113-117, BYOK :1-9/:39-42, README :8+:19, build-vs-measure dates); 4 Seam-E refutations REJECTED (#237 DATEX II stands vs #245 OCPI; NAPSPAN pricing live; Cloudflare-vs-GitHub Pages confusion; eur-lex fetchable); 0 intent changes, 0 plan logic changes | ok | — |
| 2026-09-15T00:00:00Z | S0 | orchestrator-verifier | S0-ARCH verify PASS: 6 files 115/200 lines, env.md names-only (0 values), rubric recompute OK (Hono 105/itty 100/plain 79/Rust 54/Go 43), W1 math recompute OK (1440/d, KV 4.3x, D1 2.88M=29x, hourly-full 144k>100k, transitions ~7k/d), remote empty, docs/ untracked, LEDGER §§1-3 rewritten | PASS | pending |
| 2026-09-15T00:00:00Z | S1 | orchestrator-verifier | S1 verify r1 PASS: VERIFY OK stage=1, 10/10 tests (6/6 minimums), exact pins 11/11, wrangler voltbase-api + 2026-08-04 + global_fetch_strictly_public no KV/D1, CI no-deploy, mutation STAGE 1→999 1-fail then green, remote empty | PASS | pending |
| 2026-09-15T00:00:00Z | S2 | orchestrator-verifier | S2 verify r1 PASS: VERIFY OK stage=2, 37/37 tests (27 new: core 8 + normalise 13 + fixtures 6), partition key enforced, unknown⇒closed, closed never servable, fixtures 30+10, idempotent renormalise, attribution preserved, mutation isServable→true 7-fail then green, remote empty | PASS | pending |
