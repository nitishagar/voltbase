# S7 brief — e2e, budgets, release docs

Role: builder. Sequential only. No remotes, no secrets, no deploy/publish.
Inputs: PLAN.md §4 S7; LEDGER #3 (e2e tool undecided → decide lightweight, close it here); IS-01 (release clears private + repoints exports to dist/ + restores tree) + IS-09/10; docs/stack.md S7 line (Depends S6 PASSED; verify stage=7; bundle fail >1.5MB gz; TTFB <300ms local / + /api/v1/sites; release script; files owned); existing scripts (verify.sh, check-bundle.sh, smoke.sh, smoke-check.mjs), worker app (createApp), mcp server, site/dist, package.json workspaces.

## Tasks
1. `tests/e2e/`: lightweight e2e (node + vitest, NO Playwright — record decision closing LEDGER #3: reason = free-tier + no browser deps + seeded fixtures suffice) against app directly (import createApp, no network): search→detail→status→reliability→MCP tools→docs dist read. 6 e2e tests: full journey happy; closed-id journey 404; stale journey flag; MCP search→detail parity with REST; reliability rollup served; docs page contains API+MCP onboarding links.
2. Budgets: bundle gate already wired — harden to FAIL >1.5MB gzip in verify (exit 1 + message); TTFB check script `scripts/check-ttfb.mjs` (<300ms local / + /api/v1/sites via app.request, honest local-only label) wired into smoke + verify.
3. Docs: `docs/architecture.md` (layout, data flow OCM/OSM/NAP→normalise→partition→API/MCP, licence boundary, budgets, cron), `docs/runbook.md` (deploy S13 steps, rotate keys via wrangler secret, refresh feeds incl manual-refresh + cut-to-artifact, handle failed poll UPSTREAM_FAILED, refund n/a, on-call资源的 none). Release script `scripts/publish-workspaces.mjs` (mirror lumen: clear private, exact pins check, repoint exports to dist/, build, restore tree on exit; dry-run default, --publish opt-in; never runs in CI while private).
4. 2 unit tests: release dry-run restores tree (private back, exports back); TTFB thresholds parse. STAGE 6→7 everywhere. Files owned: `tests/e2e/**`, size/TTFB scripts, docs/architecture.md + runbook.md, publish script.

## Min tests 6 e2e + 2 unit (keep 122 green → ≥130)
Place `tests/e2e/journey.test.ts` (6) + `scripts/*.test.ts` or `tests/*.test.ts` (2).

## Extra gates
VERIFY OK stage=7; bundle fail>1.5MB; TTFB<300ms local; remote empty; no publish.
Return files + verify + tests. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
