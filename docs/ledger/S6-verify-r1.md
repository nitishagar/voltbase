# S6 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Scope: S6-brief Tasks/Min-tests/Extra-gates + docs/stack.md S6 line (Depends S5 PASSED + ADR-002; ≤5 crons / ≤6 concurrent / ≤50 subrequests; 80% write-guard; null-cache; bundle ≤1.5MB) + ADR-002 §W1 math. No FAIL occurred. PLAN.md text lives outside repo; scope quotes are S6-brief + stack.md S6 line (S4/S5 precedent).

## G1 — Scope fidelity: every S6-brief task present (PASS)

- T1 `packages/providers/src/dynamic/`: `poller.ts` (hourly-class, enforces ≤6 concurrent lane pool + ≤50 subrequests via `PollerCapError`, 1 KV marker/invocation, 1 D1 row/transition, mid-run stop → `stopped:'UPSTREAM_FAILED'`), `journal.ts` (`TransitionJournal.observe` appends ONCE per transition; first sight seeds baseline, repeats append nothing), `budget.ts` (KV 1k/d + D1 100k/d, `WRITE_GUARD_RATIO=0.8` → 800/80k lines, `exhausted` + typed `UPSTREAM_FAILED`), `artifact.ts` + `last-good.ts` + `artifacts/reliability.json` (3-site cut, TS mirror sync-asserted, read-only const) ✓.
- T2 Journal + rollups: `reliability.ts` facade (`getReliability`: budget-check first → `UPSTREAM_FAILED` + stale cut, else journal rollup; null-cache documented — fresh budget/journal per call, no KV/D1 bindings). `rollup.ts`: uptime=up/(up+down) with AVAILABLE/OCCUPIED=up, transitions counted once, empty window→1; `reliabilityStale` 60min SLO ✓.
- T3 API+MCP+cron: `GET /api/v1/reliability/:id` (servable-only, closed→404, 503 `UPSTREAM_FAILED` + cut envelope on guard) + `voltbase_reliability` tool live on BOTH runtimes (S4/S5 `UNAVAILABLE_S6` stub + `LOCAL_ONLY` lane removed, documented as no honestly remote-lacking compute) ✓. ONE cron `packages/mcp/worker/wrangler.jsonc` `triggers.crons ["17 * * * *"]` + `scheduled()` calling `runScheduledPoll` (35 fixture ids, no live fetch, isolate-safe) ✓. `migrations/0001_reliability_journal.sql` placeholder only, no binding (comment states why) ✓.
- T4 STAGE 5→6 everywhere (`src/lib/stage.ts` 6, `/healthz` live, `verify.sh` prints stage=6, smoke asserts 6, CLI help stub→rollups, composition comment) ✓. Files owned respected (dynamic/**, worker cron/reliability, migrations) ✓.
- Min tests 8: journal-once (double-poll→1, N×M unchanged→0), rollup exact (8h/2h→0.8/1 trans; OCCUPIED=up, flap→2), stale (fresh vs SLO-old+reason), guard 800 KV→stop+UPSTREAM_FAILED+artifact, caps (50 targets within caps; 51st refused typed), cron ≤5 (=1), null-cache (deep-equal sequential, mutation-isolated), endpoint+tool happy → 20 new (12 dynamic + 6 worker-reliability + 2 server-reliability), 102→122 total (≥110) ✓.

## G2 — Green chain (PASS)

- `$ npm install` → `found 0 vulnerabilities` (Node v22.23.2 npm 10.9.8).
- `$ npm run verify` → typecheck ✓, lint ✓, build ✓, `check-bundle: OK (33959 gz bytes <= 1572864; 1.5 MiB self-budget, platform cap 64 MiB uncompressed)` ✓, `Test Files 21 passed (21) / Tests 122 passed (122)` ✓, `smoke-check: / + /healthz + search + site + status + mcp green` + `SMOKE OK` ✓, `check-banned: OK` ✓, `VERIFY OK stage=6` ✓.
- `$ npx vitest run` → 21 files / 122 passed ✓. `$ npm run lint` → exit 0 ✓. `$ npm run check:banned` → OK ✓. `$ npm run smoke` → SMOKE OK (incl. new `/api/v1/reliability/OCM:900000` 200 + numeric uptime) ✓. `$ git remote -v` → empty ✓.
- No new bindings: root + worker `wrangler.jsonc` have only name/main/compat_date/flags/triggers/vars (no kv/d1/do/r2) ✓. Crons: exactly 1 (`["17 * * * *"]`, ≤5) ✓. STAGE=6 (stage.ts + live healthz + smoke) ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)

- `$ git remote -v` → empty ✓. `git status` → S6 builder set only (14 modified + 7 untracked incl. S6-brief family), LEDGER.md untouched ✓.
- `check-banned: OK` ✓. Secret grep: no `*_KEY=` values, no `ghp_*`/`BEGIN PRIVATE KEY`; BYOK by header name only ✓.

## G4 — Mutation kill (PASS, proof)

- Mutation (1 line, `packages/providers/src/dynamic/budget.ts`): `WRITE_GUARD_RATIO = 0.8` → `2.0` (python one-liner).
- `$ npx vitest run budget.test.ts reliability-cut.test.ts` under mutation → `Test Files 1 failed (1) / Tests 1 failed | 3 passed (4)` (guard never trips, `expect(answer.ok).toBe(false)` fails) ✓.
- Reverted (`grep WRITE_GUARD_RATIO` → 0.8); budget suite 2/2, full `npm run verify` → `VERIFY OK stage=6` ✓.

## G5 — Exactness re-checks (PASS)

- Journal once-per-transition: `journal.test.ts` 2/2 ✓. Rollup exact: `rollup.test.ts` 3/3 (0.8 exact, flap 2) ✓. Stale: SLO 60min fresh/stale+reason ✓.
- Guard: `budget.test.ts` 800 KV + 80k D1 → `UPSTREAM_FAILED` 2/2; `reliability-cut.test.ts` journal lane (`servedFrom:journal`) + 800-writes→cut (`servedFrom:artifact`, stale) 2/2; worker `reliability.test.ts` 503 + `cut.stale=true` + `prebuilt cut` reason ✓.
- Caps: poller 50-targets maxConcurrent≤6 + refusal typed 2/2; scheduled 35 ids ≤50/≤6 `stopped:null` ✓. Cron=1 ≤5 ✓. Null-cache: per-request budget/journal, deep-equal + isolation ✓. Artifact sync: JSON⇔TS deep-equal + round-trip ✓.
- Route+tool: endpoint 200 + attribution / 404 closed / 503 cut (3/3); `server.test.ts` reliability local + remote (no stub/LOCAL_ONLY) 2/2 ✓. Priors green: S1–S5 102/102 inside 122 ✓.

## G6 — Process (PASS)

- No commit made; `LEDGER.md` untouched ✓. Only write is this report: `docs/ledger/S6-verify-r1.md` ✓.

## Security notes (poller/guard/cron lens: injection/auth/SSRF/traversal)

- SSRF: no new outbound. `runScheduledPoll` samples the in-memory fixture index (no fetch); future live fetch must reuse `validatePublicHttpUrl` + allowlist + capping fetcher (documented, unused on read paths — no bypass introduced). Cron `scheduledTime` is numeric → ISO only.
- Injection: `id` path/tool arg is map-lookup only (`findServableById` over servable fixtures, zod `max(128)` + strictObject on tool); no SQL (no D1 binding), no shell, no template. `decodeId` try/catch fallback never throws.
- Auth/traversal: reliability route mounted under `/api/*` abuse middleware (same 401/429 as S3); tool performs no auth change (BYOK names-only preserved). No filesystem read by id → no traversal. `LAST_GOOD_CUT` frozen read-only (shared-frozen ≠ shared-mutable, null-cache holds).
- Issues found: **0** (1 hardening note: when live ADR-002 fetch lands, add a test asserting poller fetch goes through the allowlisted/capping seam).

Verdict: **PASS** — S6 meets brief + stack.md S6 line + ADR-002 W1 gates. Ready for orchestrator ledger + `S6:` commit.
