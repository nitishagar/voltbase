# S0-R1 brief — frameworks (incl. Go/Rust) + validation/lint/CSS

Role: researcher. Sequential only (ratelimit — no parallel agents).
Scale: large. No code, no commits, no remotes, no secrets.

## Inputs (read, don't re-research from scratch)
- `thoughts/shared/research/2026-09-14-voltbase-open-core-ev-data-tooling.md` (esp. Follow-ups §C/D/F/G + pass-8 §)
- `thoughts/shared/plans/2026-09-14-voltbase/{PLAN.md §2/S0.2-S0.3, IMPLICIT_SPEC.md IS-10, LEDGER.md §§5-6}`
- Reusable artefacts (measure, don't assume): `~/repos/learn/.spike/hono`, `~/repos/learn/.spike/itty` (code/configs/dist only, no notes), `~/repos/learn/lumen` (`packages/mcp/dist/index.js` + `metafile.json`, `packages/mcp/worker/`, `packages/mcp/scripts/check-size.mjs`)
- Live registry only via `npm view` (no installs unless `wrangler dev` curl proof needs it)

## Tasks
1. Framework comparison with template rubric (weights: Workers-first 5, moving-parts 5, SSR/static 4, offline-test 4, bindings 3, bundle 4, health 3, docs 3, helpers 2, spike 5; max 114) across: Hono / itty-router / plain Worker / Fastify (documented Node-only fail) / NestJS (documented heavy fail) / **Go** (net/http + Wasm reality) / **Rust** (workers-rs reality). Short tables for validation (zod/valibot), lint/format (eslint vs biome), CSS.
2. Hands-on spike (≤30 min each) for top-2 ONLY: D1-or-KV one-row read page + POST-redirect form (or data-normalise equivalent), `wrangler dev` curl proof, `deploy --dry-run` bundle KB (raw + gzip), one `@cloudflare/vitest-plugin` test. Record minutes/files/KB/result. Reuse `.spike/` code first. Baselines: itty 1.9 KB gz, hono 23 KB gz, MCP-on-Workers ≈298 KB gz (zod+mcp-server+ajv ≈81%+).
3. Go/Rust verdict section: cold-start, Workers deployability (Rust `workers-rs` first-class; Go Wasm-only via `syumai/workers-go`, TinyGo ≥0.42 for net/http), MCP SDK maturity (rmcp for Rust), npm-vs-crates/modules distribution, team-of-one maintenance — with sources; bundle size is NOT a disqualifier (64 MiB uncompressed cap). Adopt only on ≥10pt win + spike pass. Rejected list with evidence if out.
4. Toolchain pins: vitest 4.1.x + `@cloudflare/vitest-plugin` (NOT pool-workers; gotcha: `readD1Migrations` not exported in 1.1.x — inline SQL via `define`), TypeScript 5.9.x or 6.0.x NOT 7.0.x (typescript-eslint peer `<6.1.0`), npm (not pnpm — lumen parity, record rationale for ADR-001).

## Return contract (STRICT)
Write report to `docs/research/frameworks.md` in the voltbase repo (create dirs as needed). Raw data, not prose: tables + one line per fact `source (observed YYYY-MM-DD)`. Rubric totals must recompute. Every factual claim carries `(source: URL, observed date)` or UNVERIFIED. Spikes show measured numbers (raw + gzip bytes, minutes spent). Estimates marked ESTIMATE. No recommendations beyond the rubric winner (architect decides). Hard cap: 120 lines.
Do NOT commit. Do NOT touch LEDGER.md. Report file path when done.
