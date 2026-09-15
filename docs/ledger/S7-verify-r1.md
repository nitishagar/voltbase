# S7 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Scope: S7-brief Tasks/Min-tests/Extra-gates + docs/stack.md S7 line (Depends S6 PASSED; verify stage=7; bundle FAIL >1.5MB gz; TTFB <300ms local / + /api/v1/sites; release script clears private + repoints exports to dist/ + restores tree) + LEDGER #3 (e2e tool → lightweight, close here). No FAIL occurred. PLAN.md text lives outside repo; scope quotes are S7-brief + stack.md S7 line (S6 precedent).

## G1 — Scope fidelity: every S7-brief task present (PASS)

- T1 `tests/e2e/journey.test.ts` (6): lightweight e2e, node + vitest, NO Playwright — header records decision closing LEDGER #3 (reason: free-tier + no browser deps + seeded S2 fixtures suffice; Worker surfaces are plain request/response). Covers: full journey happy (search→detail→status→reliability→MCP tools→docs dist read); closed-id 404/NOT_FOUND on REST+MCP; stale flag 60min SLO; MCP search→detail parity with REST; reliability rollup REST+MCP; docs links (/voltbase/api-reference/ + /voltbase/mcp-onboarding/ + /api/v1/sites + POST /mcp + voltbase_search_sites) ✓.
- T2 Budgets: `scripts/check-bundle.sh` hardens FAIL >1.5MiB (CAP_BYTES=1572864, exit 1 + `FAIL — … exceed the 1.5 MiB self-budget`, platform 64 MiB noted), wired into verify + smoke ✓. `scripts/check-ttfb.mjs` (<300ms local / + /api/v1/sites via app.request, honest local-only label, `--budget=`/env override + `parseBudgetMs` validation, exit 1 + FAIL), wired into smoke + verify ✓.
- T3 Docs: `docs/architecture.md` (Layout, Data flow OCM/OSM/NAP→normalise→partition→API/MCP, Licence boundary, Budgets, Cron, E2E decision closes #3) ✓. `docs/runbook.md` (Deploy S13-only, Rotate keys via wrangler secret, Refresh feeds incl manual-refresh + cut-to-artifact, Handle failed poll UPSTREAM_FAILED, Refunds n/a, On-call none) ✓. `scripts/publish-workspaces.mjs` (mirror lumen: clear private, exact-pins check, repoint exports ./src/*.ts → ./dist/index.js, build, restore tree on exit; dry-run default, --publish opt-in, no registry write in v0.1; CI+private → SKIP exit 0, never runs in CI while private) ✓.
- T4 2 unit `tests/release-ttfb.test.ts`: release dry-run restores tree (private back, exports back, no ./dist/index.js leak); TTFB thresholds parse (default 300, explicit, reject nope/-5/0) ✓. STAGE 6→7 everywhere (src/lib/stage.ts 7, /healthz live, verify prints stage=7, smoke asserts 7) ✓. Files owned respected (tests/e2e/**, size/TTFB scripts, architecture+runbook, publish script) ✓.
- Min tests 6 e2e + 2 unit: 122→130 total (≥130) ✓.

## G2 — Green chain (PASS)

- `$ npm install` → `audited 533 packages, found 0 vulnerabilities` (Node v22.23.2 npm 10.9.8).
- `$ npm run verify` → typecheck ✓, lint ✓, build ✓, `check-bundle: OK (33959 gz bytes <= 1572864; 1.5 MiB self-budget, platform cap 64 MiB uncompressed)` ✓, `check-ttfb: OK — GET / ~60ms + GET /api/v1/sites ~3ms < 300ms (local-only via app.request, no network)` ✓, `Test Files 23 passed (23) / Tests 130 passed (130)` ✓, `smoke-check: / + /healthz + search + site + status + mcp green` + `SMOKE OK` ✓, `check-banned: OK` ✓, `VERIFY OK stage=7` ✓.
- `$ npx vitest run` → 23 files / 130 passed ✓. `$ npx vitest run tests/e2e/journey.test.ts` → 6/6 ✓. `$ npx vitest run tests/release-ttfb.test.ts` → 2/2 ✓. `$ npm run lint` → exit 0 ✓. `$ npm run check:banned` → OK ✓. `$ npm run smoke` → SMOKE OK ✓. `$ git remote -v` → empty ✓.
- Bundle FAIL path (no residue): code inspect (`if BYTES > CAP_BYTES → echo FAIL >&2; exit 1`) + subshell lower-cap simulation (`cap 1 → FAIL — 33959 gz bytes exceed cap 1`) + live `node scripts/check-ttfb.mjs --budget=1 → FAIL both routes, EXIT=1`; script file untouched (diff identical) ✓.
- TTFB script: `node scripts/check-ttfb.mjs` → both OK <300ms local-only ✓.
- Release dry-run: `node scripts/publish-workspaces.mjs --dry-run → DRY-RUN — 12 planned edit(s) across 7 manifest(s); tree untouched` (root+5 pkgs+site: clear private + 5× repoint exports); `git status --short` identical before/after ✓. `CI=true node scripts/publish-workspaces.mjs → SKIP — CI detected while private:true …, EXIT=0`, tree untouched ✓.
- CI: `ci.yml` jobs = typecheck/lint/build/test/smoke only (no publish/deploy) ✓; `pages.yml` scaffold-only, `if: github.event.repository.visibility == 'public'`, body is echo-only (no publish wired until S13) ✓.
- STAGE=7 (stage.ts + live /healthz + smoke `STAGE === 7`) ✓. Priors green: S1–S6 122/122 inside 130 ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)

- `$ git remote -v` → empty ✓. `git status` → S7 builder set only (10 modified + 6 untracked incl. S7-brief family), LEDGER.md untouched ✓.
- `check-banned: OK` ✓. Secret grep via gate: no `*_KEY=` values, no BYOK material; BYOK by header name only ✓.
- CI while private: no publish/deploy jobs (see G2); release script CI-guarded ✓.

## G4 — Mutation kill (PASS, proof)

- Mutation (1 line, `scripts/check-ttfb.mjs`): `export const TTFB_BUDGET_MS = 300;` → `= 1;` (cp backup + sed).
- Under mutation: `node scripts/check-ttfb.mjs → FAIL both routes (budget 1ms)`; `npx vitest run tests/release-ttfb.test.ts → Test Files 1 failed (1) / Tests 1 failed | 1 passed (2)` (TTFB-PARSE OK assertion fails, budget≠300) ✓.
- Reverted (cp backup back; `grep TTFB_BUDGET_MS` → 300; diff identical, `git status` still `?? scripts/check-ttfb.mjs` S7-new only, no residue); `node scripts/check-ttfb.mjs → OK both <300ms`; vitest file → 2/2 ✓.

## G5 — Exactness re-checks (PASS)

- E2E 6/6: happy journey (5 rows + id chain + 4 tools + dist contains voltbase); closed OCM:910001 → 404 NOT_FOUND ×3 REST + isError/NOT_FOUND ×3 MCP tools; stale OCM:900000 → stale:true + staleReason contains 60min; MCP parity (page.total equal + id arrays equal + detail id equal); reliability (REST uptime 0..1 + MCP id/uptime); docs links (index→api-reference/+mcp-onboarding/, api-reference→/api/v1/sites+POST /mcp, onboarding→voltbase_search_sites) ✓.
- Unit 2/2: dry-run writes nothing (private back ×root+core, ./src/index.ts back, no ./dist/index.js); TTFB parse (300 default/empty, 150 explicit, reject nope/-5/0) ✓.
- Architecture/runbook sections: arch Layout/Data-flow/Licence-boundary/Budgets/Cron/E2E-decision ✓; runbook Deploy/Rotate-keys/Refresh-feeds/Handle-failed-poll/Refunds-n/a/On-call ✓. E2E decision lightweight-not-Playwright documented in test header + architecture E2E decision (closes LEDGER #3) ✓.

## G6 — Process (PASS)

- No commit made; `LEDGER.md` untouched ✓. Only write is this report: `docs/ledger/S7-verify-r1.md` ✓.

Verdict: **PASS** — S7 meets brief + stack.md S7 line + LEDGER #3 closure. Ready for orchestrator ledger + `S7:` commit.
