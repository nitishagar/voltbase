# LEDGER — voltbase

## 0. Resume procedure (read this first, then nothing else until step 3)

1. Read sections 1 to 4. Do not read section 7 unless section 1 points you to an event.
2. Run: `node --version && npm install && npm run verify` (once S1 exists; before that: `ls ~/repos/learn/voltbase`).
   Expect `VERIFY OK stage=<N>` where N is the last PASSED stage in section 3. If it fails, run `git status` and `git log -3 --oneline`, record as event in section 7, fix tree first.
3. Continue from "Next action" in section 1. Sequential only: one builder then one verifier per stage. Never parallelise (ratelimit).

## 1. Status

- Current stage: S0
- Stage status: NOT_STARTED
- Last verified commit: none
- Next action: Create `~/repos/learn/voltbase`, `git init`, copy this LEDGER, commit `S0: initialise ledger`, then spawn S0 researcher 1 (frameworks incl. Go/Rust).
- Blocked on: none
- Updated: 2026-09-14T16:30:00Z by verification pass 8 (exhaustive per-claim, 6 seam agents A-F + main-context sed/gzip/npm checks + live fetch of OCM #237/#245, NAPSPAN, Pages docs: A 2 citation nits, B 2 citation fixes, C build-vs-measure date wording, D AFIR-label note, E 4 agent-refutations rejected in main context [#237 stands, #245 separate; NAPSPAN pricing live; Cloudflare-Pages vs GitHub-Pages confusion; eur-lex now fetchable], F CONFIRMED zero load-bearing [R]; still NOT_STARTED, ~/repos/learn/voltbase absent)

## 2. Context capsule (at most 15 lines; rewrite, do not append)

- What exists: research + plan + spec + validation on disk (thoughts/); NO code yet; `~/repos/learn/voltbase` absent.
- How to run it: n/a until S1 (`npm install && npm run verify` then).
- What is faked locally: nothing yet; S0 uses live docs only.
- Gotchas: private repo ⇒ Pages local-preview only until public flip; `private:true` blocks publish; Worker stateless; LOCAL_ONLY divergence by design; sequential agents (ratelimit); pin vitest 4.1.x + `@cloudflare/vitest-plugin` (not pool-workers) + TypeScript ≤6.0.x (TS 7.0 breaks typescript-eslint); Worker size cap is 64 MiB uncompressed (1.5 MB gzip is our own budget); D1 Free hard-fails past daily caps; 5 crons/account, 6 concurrent outbound; OCM needs an API key (BYOK); OSM from extracts never live Overpass; NL NDW is CC0 by site-wide statement (dataset page check pending); MCP-on-Workers baseline ≈298 KB gzip (lumen measured).
- Parallel work in flight: none (forbidden).

## 3. Stage table

| Stage | Status | Builder | Verifier rounds | Final commit | Tests total | Report |
|---|---|---|---|---|---|---|
| S0 | NOT_STARTED | | | | 0 | |
| S1 | NOT_STARTED | | | | | |
| S2 | NOT_STARTED | | | | | |
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
