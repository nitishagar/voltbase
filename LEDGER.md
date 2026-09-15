# LEDGER — voltbase

## 0. Resume procedure (read this first, then nothing else until step 3)

1. Read sections 1 to 4. Do not read section 7 unless section 1 points you to an event.
2. Run: `node --version && npm install && npm run verify` (once S1 exists; before that: `ls ~/repos/learn/voltbase`).
   Expect `VERIFY OK stage=<N>` where N is the last PASSED stage in section 3. If it fails, run `git status` and `git log -3 --oneline`, record as event in section 7, fix tree first.
3. Continue from "Next action" in section 1. Sequential only: one builder then one verifier per stage. Never parallelise (ratelimit).

## 1. Status

- Current stage: S13
- Stage status: PARTIAL (public flip DONE: repo PUBLIC, Pages live 200, CI 5/5 green on GitHub, master protected require-ci; wrangler deploy + tag v0.1.0 still blocked on credentials)
- Last verified commit: 5dca212 (S13: scope release CI guard to --publish path — CI green on GitHub run 34933522064)
- Next action: Export `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (env, never git), then `wrangler deploy --config packages/mcp/worker/wrangler.jsonc` (worker config carries the S6 cron; root config is dev-only) → live `/healthz` check → optional `wrangler secret put OCM_API_KEY` → tag `v0.1.0` + push → LEDGER `DEPLOYED`.
- Blocked on: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (deploy); OCM_API_KEY value (optional live OCM check)
- Updated: 2026-09-15T05:45:00Z by orchestrator S13 flip run (user-approved flip: pages.yml publish wired 9add3a5, CI-guard fix 5dca212, repo PUBLIC, Pages build_type=workflow + URL 200, branch protection strict 5-contexts)

## 2. Context capsule (at most 15 lines; rewrite, do not append)

- What exists: S0–S8 PASSED (VERIFY OK stage=8, 130/130 tests); S13 flip DONE — repo `nitishagar/voltbase` PUBLIC, Pages live https://nitishagar.github.io/voltbase/ (200), CI 5/5 green on GitHub, master protected (strict, require typecheck/lint/build/test/smoke); deploy + tag NOT done (credentials).
- How to run it: `npm install && npm run verify`.
- What is faked locally: site served from Pages (built artifact); memory journal/budget; last-good artifact; e2e via app.request; Worker not yet deployed anywhere.
- Gotchas: deploy uses `packages/mcp/worker/wrangler.jsonc` (has the S6 cron `17 * * * *`), NOT the root dev config; master is protected (direct admin pushes still allowed; force pushes blocked); `private:true` stays until a real npm release; Worker stateless; pins TS 5.9.3/vitest 4.1.11/plugin 1.1.9/hono 4.13.7; 1/5 crons, 6 concurrent, 50 subreq; OCM BYOK; OSM extracts only.
- Decisions: Hono default; npm; NL→LU(CC0 KML)→FR; hourly transition-only + 80% guard + cut-to-artifact; Collective partitioned; lightweight e2e; user-approved public flip executed 2026-09-15.
- Open: CF token/account (deploy+tag), OCM key value (optional), LU 2nd-set / PT Mobi.e / OCM-keyed-call (ingest-time).
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
| S8 | PASSED | auditor (fresh clone) | verifier r1 PASS | 72477be | 130 | docs/ledger/S8-audit.md |
| S13 | PARTIAL (flip done; deploy+tag blocked) | builder | r1 BLOCKED (gate-trip) → r2 PASS-PARTIAL → flip run (9add3a5, 5dca212) | 5dca212 (flip+fix; original partial 8e213db) | 130 | docs/ledger/S13-partial.md + addendum |

## 4. Decisions

| ID | Decision (one line) | File |
|---|---|---|
| ADR-001 | (S0) stack: TS-first unless challenger +10pts + spike pass | docs/adr/ADR-001-stack.md |
| ADR-002 | (S0) feeds: OCM opendata + OSM extracts + NAP subset (candidates NL→LU→FR) with per-dataset licences | docs/adr/ADR-002-feeds.md |
| ADR-003 | (S0) licence boundary: served index = ODbL Collective (partitioned) or Derivative (ODbL) | docs/adr/ADR-003-licence-boundary.md |

## 5. Environment

- Node: v22.23.2 npm 10.9.8 | gh: nitishagar (scopes admin:public_key, gist, read:org, repo; verified 2026-09-14)
- Registry facts 2026-09-14 (`npm view`): hono 4.13.7, itty-router 5.0.24, wrangler 4.131.2, @cloudflare/vitest-plugin 1.1.9 (peer vitest ^4.1), vitest 4.1.11 (5.0.0 unsupported by plugin), typescript 7.0.2 latest / 6.0.3 last usable with typescript-eslint 8.70.0, @modelcontextprotocol/sdk 1.30.0, agents 0.23.0, astro 7.3.2, pagefind 1.5.2, zod 4.6.5, eslint 10.10.0
- Local: `~/repos/learn/voltbase`; remote: `origin → github.com/nitishagar/voltbase` (PUBLIC since 2026-09-15 flip; Pages enabled `build_type=workflow`, live at https://nitishagar.github.io/voltbase/; master protected require-ci)
- Vars/secrets/bindings: docs/env.md (S0); credentials present: gh nitishagar only; ABSENT: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, OCM_API_KEY value (deploy+tag pending these)

## 6. Open issues

| # | Found in | Description | Severity | Status |
|---|---|---|---|---|
| 1 | PLAN_VALIDATION W1 | AFIR poll cadence vs KV/D1 write caps unproven | Medium | CLOSED (ADR-002 W1 math + S6 80% guard + cut-to-artifact, verified S6) |
| 2 | PLAN_VALIDATION W2 | npm-vs-pnpm deviation needs ADR-001 rationale | Low | CLOSED (ADR-001 §npm, verified S0) |
| 3 | PLAN_VALIDATION W3 | e2e tool (Playwright vs light) undecided | Low | CLOSED (S7 lightweight decision, verified S7) |
| 4 | research pass 6 | NL NDW licence: CC0 site-wide + dataset page checked 2026-09-14 (nothing contrary); S0 eyeballs page at ingest time | Low | research-closed → S0.4 confirm |
| 5 | research pass 6 | DE Mobilithek consumer model VERIFIED (registration + approval + mTLS X.509; DATEX II mandatory from 2026-04-14); stays second-wave on evidence | Low | research-closed → S0.4 confirm |
| 6 | PLAN_VALIDATION W6 | Fly/Render/Oracle facts not re-verified (hosts ruled out) | Low | open (only if host decision reopens) |
| 7 | research pass 2 | ODbL Collective-vs-Derivative decision for merged index (ADR-003) | High | CLOSED (ADR-003 Collective partitioned, verified S0+S2) |
| 8 | research pass 2 | Toolchain pins: vitest 4.1.x, TS ≤6.0.x, vitest-plugin not pool-workers | Medium | CLOSED (package-check + S1 exact pins 11/11, verified S1) |
| 9 | research pass 4 | S5–S8 briefs need explicit Depends/Extra-gates/Files-owned (PLAN_VALIDATION W7) | Low | CLOSED (stack.md S5–S8 lines, verified S0) |
| 10 | research pass 6 | LU second multi-operator DATEX II set is "License Not Specified" — clear licence before ingesting beyond CC0 Chargy KML | Medium | open → ingest-time (ADR-002 ticket; S13+ feed onboarding) |
| 11 | research pass 6 | OCM spec URL re-pinned (ocm-docs raw + /v3/openapi); D1 2026-09-01 date primary-sourced; NAPSPAN pricing re-pinned; FR canonical URL + NAP beta noted | Low | research-closed → S0 cites new URLs |
| 12 | S13 run | Real `wrangler deploy` needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (both absent); live OCM check needs OCM_API_KEY value; Pages needs public flip + GITHUB_TOKEN | High | PART-CLOSED (flip+Pages done 2026-09-15; deploy+tag v0.1.0 still blocked on CF creds) |
| 13 | S13 run | Branch protection require-CI returns HTTP 403 on private-free plan | Low | CLOSED (public flip 2026-09-15: protection ON, strict, contexts typecheck/lint/build/test/smoke) |
| 14 | S13 flip run | Latent: publish-workspaces CI guard tripped the dry-run in CI (test job failed on every GitHub push while green locally) | Medium | CLOSED (5dca212: guard scoped to --publish; CI 5/5 green run 34933522064) |
| 15 | S13 flip run | Runbook + S13-partial deploy command pointed at root wrangler config (no `triggers.crons`) — would deploy without the S6 cron | Medium | CLOSED (runbook+S13-partial corrected 2026-09-15 to packages/mcp/worker/wrangler.jsonc) |

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
| 2026-09-15T00:00:00Z | S8 | orchestrator-verifier | S8 verify r1 PASS: fresh-clone 130/130 + VERIFY OK stage=8, 8 tasks cited, ADR↔code + spec↔route full, sec clean, kill-4 no-trigger, mutation STAGE 8→999 FAIL then green, remote empty → READY_FOR_CREDENTIALS | PASS | 72477be |
| 2026-09-15T00:00:00Z | S13 | builder | S13 partial: repo nitishagar/voltbase created PRIVATE + master pushed (72477be); protection 403 (private-free); wrangler dry-run exit 0 (2118KiB/383KiB gzip); STOP at credential wall (CF token/account absent); banned OK | PARTIAL | — |
| 2026-09-15T00:00:00Z | S13 | orchestrator-verifier | S13 verify r1 BLOCKED: check-banned FAIL on S13-partial.md literal trailer pattern (builder artifact trips own gate); transport/visibility/dry-run confirmed (private, no tags, dry-run 0, CF names absent) | BLOCKED | — |
| 2026-09-15T00:00:00Z | S13 | orchestrator | S13 fix: reworded S13-partial.md trailer line to descriptive citation (no literals); check-banned OK + VERIFY OK stage=8 restored | ok | — |
| 2026-09-15T00:00:00Z | S13 | orchestrator-verifier | S13 verify r2 PASS-PARTIAL: VERIFY OK stage=8, 130/130, banned OK, remote origin private, dry-run exit 0, no flip/tag/deploy; BLOCKED items recorded (CF token/account, OCM key value, flip+Pages, protection) | PASS-PARTIAL | pending |
| 2026-09-15T05:35:00Z | S13 | orchestrator | S13 flip run (user-approved "Deploy + public flip"; CF creds still absent so deploy deferred): pages.yml publish wired + master trigger fixed (9add3a5), repo flipped PUBLIC via API, Pages enabled build_type=workflow, pages run green, https://nitishagar.github.io/voltbase/ 200; latent CI bug fixed — publish-workspaces CI guard scoped to --publish (5dca212), CI 5/5 green first time (run 34933522064); runbook+S13-partial deploy config corrected to packages/mcp/worker/wrangler.jsonc (cron); branch protection ON (strict, 5 contexts) | ok (deploy+tag still blocked on creds) | 9add3a5, 5dca212 |
