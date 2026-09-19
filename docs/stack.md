# voltbase — stack & repo layout (S0, 2026-09-14)
Decisions: ADR-001 (stack), ADR-002 (feeds/cadence), ADR-003 (licence partitioning). Version proofs: `docs/research/package-check.md`; caps: `docs/free-tier-limits.md`.

## Layout (npm workspaces `["packages/*","site"]`; lumen-parity topology core → normalise/providers → mcp → cli)
- `packages/core` — domain types (ChargePoint, Connector, Status, Attribution, Provenance) with the per-row source+licence partition key (4-tuple `(feature_type, regional_cut, source, licence)` per ADR-003).
- `packages/normalise` — mappers OCM/OSM/OCPI 2.2.1/DATEX II → core + licence filter (unknown ⇒ closed).
- `packages/providers` — feed clients + dynamic poller paths (S6).
- `packages/mcp` — `buildMcpServer` factory (the one composition root) + `worker/` — API routes + `POST /mcp` gateway, Worker name `voltbase-api`.
- `packages/cli` — `bin: {voltbase: ./bin/voltbase.js}`; stdio MCP via `voltbase mcp`.
- `site/` — Astro static + pagefind, base `/voltbase`, artifact `site/dist` (local preview until public flip).

## Scripts (S1 scaffolds; names are the contract)
`dev, build, typecheck, lint, format, format:check, test, smoke, verify, check:banned` (+ `db/cache:reset` only when a binding exists). `verify` prints `VERIFY OK stage=<N>`; validate chain mirrors lumen: typecheck && lint && build && test && smoke.

## Bindings
None by default — no KV/D1/DO/R2 in v0.1 until an ADR + budget math adds them (IS-06). ADR-002 permits only: ≤5 cron triggers (hourly-class dynamic poller, S6) + static assets for prebuilt cuts. wrangler: name `voltbase-api`, compat date ≥ 2026-08-04 (nodejs_compat default there), `global_fetch_strictly_public` (private-origin fetch impossible at runtime), outbound allowlist + capping fetcher, 1.5 MB gzip self-budget (cold-start choice; platform cap is 64 MiB uncompressed).

## Test invocation
`npm test` = vitest 4.1.11: node pool (unit) + `@cloudflare/vitest-plugin` 1.1.9 (workers pool). Gotcha: `readD1Migrations` is not exported in 1.1.x — inline migration SQL via `define __MIGRATION_SQL__` (spike pattern).

## S1 mapping
S1 owns root configs (package.json, tsconfig strict, eslint, vitest), `scripts/check-banned.sh`, `scripts/smoke.sh`, `.dev.vars.example` (names only), `.github/workflows/ci.yml` (no deploy job), `/` + `/healthz {"ok":true,"stage":1}` + `src/lib/stage.ts`, site shell. No KV/D1 until an ADR exists.

## S5–S8 stage lines (proposed at S0; closes plan-validation W7)
- S5 Depends: S4 PASSED. Extra gates: `site/dist` builds + pagefind index ≥ threshold; artifact is static, fetches nothing at runtime; all shown data open-licenced; local preview only (no publish while private); robots allow public docs; legal DRAFT markers (DPDP note for India data). Files owned: `site/**`, pages workflow scaffold (trigger-guarded until S13 flip).
- S6 Depends: S5 PASSED + ADR-002 budget math. Extra gates: ≤5 crons / ≤6 concurrent outbound / ≤50 subrequests per cron invocation; write-guard stops at 80% of KV/D1 daily caps; null-cache default preserved on Worker; bundle ≤1.5 MB gz. Files owned: `packages/providers/src/dynamic/**`, cron entry under `packages/mcp/worker/**`, `migrations/**`.
- S7 Depends: S6 PASSED. Extra gates: `verify` prints stage=7; bundle gate fails >1.5 MB gz; TTFB <300 ms local on `/` + `/api/v1/sites`; release script clears `private` + repoints exports to `dist/` and restores tree. Files owned: `tests/e2e/**`, size/TTFB check scripts, `docs/architecture.md`, `docs/runbook.md`, `scripts/publish-workspaces.mjs`.
- S8 Depends: S7 PASSED. Extra gates: fresh-clone install+verify+e2e green; 8 random S2–S6 tasks re-verified with citations; ADR↔code + spec↔route coverage; security scrub of diff since S5; kill-gates re-checked (kill-4: NAPSPAN + OCM #237). Files owned: `docs/ledger/S8-audit.md` (report only, owns no code). Status → READY_FOR_CREDENTIALS.
