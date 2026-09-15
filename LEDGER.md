# LEDGER — voltbase

## 0. Resume procedure (read this first, then nothing else until step 3)

1. Read sections 1 to 4. Do not read section 7 unless section 1 points you to an event.
2. Run: `node --version && npm install && npm run verify` (once S1 exists; before that: `ls ~/repos/learn/voltbase`).
   Expect `VERIFY OK stage=<N>` where N is the last PASSED stage in section 3. If it fails, run `git status` and `git log -3 --oneline`, record as event in section 7, fix tree first.
3. Continue from "Next action" in section 1. Sequential only: one builder then one verifier per stage. Never parallelise (ratelimit).

## 1. Status

- Current stage: S8
- Stage status: PASSED
- Last verified commit: 7c468e0 (S7: add end-to-end suite, budgets, and docs)
- Next action: Commit `S8: pass clean-clone audit`, then run S13 preconditions (verify stage=8, gh auth, CF token/account, remote empty, tree clean).
- Blocked on: none
- Updated: 2026-09-15T00:00:00Z by orchestrator S8-VERIFY (PASS: fresh-clone 130/130 + VERIFY OK stage=8, mutation STAGE 8→999 FAIL then green, sec clean, kill-4 no-trigger, remote empty)

## 2. Context capsule (at most 15 lines; rewrite, do not append)

- What exists: S8 PASSED (fresh-clone install+verify+e2e green, 8 tasks re-verified with citations, ADR↔code + spec↔route full, sec scrub clean, kill-4 no-trigger); VERIFY OK stage=8, 130/130 tests. Status READY_FOR_CREDENTIALS.
- How to run it: `npm install && npm run verify`.
- What is faked locally: site/dist local build; memory journal/budget; last-good artifact; e2e via app.request; clone was file-local /tmp/voltbase-S8-audit.
- Gotchas: private repo ⇒ no publish/deploy until S13; `private:true`; Worker stateless; sequential; pins TS 5.9.3/vitest 4.1.11/plugin 1.1.9/hono 4.13.7; 64 MiB cap (1.5 MB gzip self); D1 hard-fail; 1/5 crons, 6 concurrent, 50 subreq; OCM BYOK; OSM extracts only.
- Decisions: Hono default; npm; NL→LU(CC0 KML)→FR; hourly transition-only + 80% guard + cut-to-artifact; Collective partitioned; lightweight e2e.
- Open: LU 2nd DATEX II Not Specified; PT Mobi.e UNVERIFIED; OCM keyed call (all S13+ ingest-time); S13 next.
- Parallel work in flight: none (sequential).

## 3. Stage table

| Stage | Status | Builder | Verifier rounds | Final commit | Tests total | Report |
|---|---|---|---|---|---|---|
| S0 | PASSED | architect | verifier 1 round PASS | 5c98f8e | 0 | docs/ledger/S0-ARCH-brief.md |
| S1 | PASSED | builder | verifier r1 PASS | 95e1f60 | 10 | docs/ledger/S1-verify-r1.md |
| S2 | PASSED | builder | verifier r1 PASS | 7d5e7d0 | 37 | docs/ledger/S2-verify-r1.md |
| S3 | PASSED | builder | verifier r1 PASS | 8e27526 | 69 | docs/ledger/S3-verify-r1.md |
| S4 | PASSED | builder | verifier r1 PASS | b96a046 | 90 | docs/ledger/S4-verify-r1.md |
| S5 | PASSED | builder | verifier r1 PASS | 8082d1d | 102 | docs/ledger/S5-verify-r1.md |
| S6 | PASSED | builder | verifier r1 PASS | f41aafc | 122 | docs/ledger/S6-verify-r1.md |
| S7 | PASSED | builder | verifier r1 PASS | 7c468e0 | 130 | docs/ledger/S7-verify-r1.md |
| S8 | PASSED | auditor (fresh clone) | verifier r1 PASS | pending `S8: pass clean-clone audit` | 130 | docs/ledger/S8-audit.md |
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
| 2026-09-15T00:00:00Z | S3 | orchestrator-verifier | S3 verify r1 PASS: VERIFY OK stage=3, 69/69 tests (32 new: api 20 + guards 12), 4 routes 200, closed→404, 401/429 live, SSRF refused, stale+CSP+request-id, BYOK never stored, 0 mixed partitions, mutation isBlockedHost→false 1-fail then green, remote empty | PASS | pending |
| 2026-09-15T00:00:00Z | S4 | orchestrator-verifier | S4 verify r1 PASS: VERIFY OK stage=4, 90/90 tests (21 new: server 12 + worker-mcp 5 + cli-mcp 4), 4 tools identical stdio/HTTP, key isolation, LOCAL_ONLY→CLI, bad-args typed, after= newer-only, POST 200/GET 405, mutation tool-rename 5-fail then green, remote empty | PASS | pending |
| 2026-09-15T00:00:00Z | S5 | orchestrator-verifier | S5 verify r1 PASS: VERIFY OK stage=5, 102/102 tests (12 new site), dist 20 files 7 pages + pagefind 15592B/7 entries, no closed data, links resolve, DRAFT+DPDP, robots, static, BYOK names-only, pages.yml public-guarded, mutation legal-marker 1-fail then green, remote empty | PASS | pending |
| 2026-09-15T00:00:00Z | S6 | orchestrator-verifier | S6 verify r1 PASS: VERIFY OK stage=6, 122/122 tests (20 new), journal-once + rollup exact + stale + 80% guard→UPSTREAM_FAILED+cut, ≤50/≤6/1-cron, null-cache, route+tool live, no bindings, mutation guard-ratio 1-fail then green, sec-review 0 issues, remote empty | PASS | pending |
| 2026-09-15T00:00:00Z | S7 | orchestrator-verifier | S7 verify r1 PASS: VERIFY OK stage=7, 130/130 tests (6 e2e + 2 unit), bundle FAIL-path + TTFB local OK, release dry-run 12-edits restores tree, arch+runbook present, mutation TTFB 300→1 FAIL then green, remote empty, no publish | PASS | pending |
| 2026-09-15T00:00:00Z | S8 | orchestrator-verifier | S8 verify r1 PASS: fresh-clone 130/130 + VERIFY OK stage=8, 8 tasks cited, ADR↔code + spec↔route full, sec clean, kill-4 no-trigger, mutation STAGE 8→999 FAIL then green, remote empty → READY_FOR_CREDENTIALS | PASS | pending |
