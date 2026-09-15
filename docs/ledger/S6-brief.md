# S6 brief — reliability time-series (defensible data product)

Role: builder. Sequential only. No remotes, no secrets, no deploy.
Inputs: PLAN.md §4 S6 + §3 cost model; IS-03/04/06/10; ADR-002 §W1 math (hourly-class transition-only, transitions ~5%/hr ≈7k rows/d, 80% guards, cut-to-artifact + stale-label + UPSTREAM_FAILED); docs/stack.md S6 line (Depends S5 PASSED + ADR-002; ≤5 crons / ≤6 concurrent / ≤50 subrequests; 80% write-guard; null-cache preserved; bundle ≤1.5MB); existing providers/src, worker guards/store/routes/composition, mcp server (reliability stub), cron-less wrangler.jsonc files.

## Tasks
1. `packages/providers/src/dynamic/`: poller (hourly-class; fan-out ≤6 concurrent, ≤50 subrequests/invocation — enforce + test), status-transition detector (journal appends ONCE per transition, never full upserts), write-budget guard (counters stop at 80% of KV 1k writes/d and D1 100k rows/d → typed UPSTREAM_FAILED + cut-to-artifact: serve last-good prebuilt cut + stale-label; guard failure ⇒ closed rows never paid tier), prebuilt artifact writer (`artifacts/reliability.json` last-good cut checked in or built).
2. Journal + rollups: `packages/providers/src/reliability.ts` (or dynamic/journal.ts + rollup.ts): per-site uptime rollup math (up/(up+down) over window, transitions counted once); stale handling (beyond SLO ⇒ stale:true); null-cache default preserved (compute at request or prebuilt artifact — document choice in code comment + ADR ref, no KV/D1 bindings added).
3. Wire into API+MCP: `GET /api/v1/reliability/:id` (or extend status) + activate `voltbase_reliability` tool (replace UNAVAILABLE_S6 stub; keep LOCAL_ONLY only where honestly remote-lacking — document). Worker cron: ONE hourly-class trigger entry in `packages/mcp/worker/wrangler.jsonc` (triggers.crons ["17 * * * *"]) + `scheduled()` handler calling poller with guard; total crons ≤5 (assert 1). `migrations/**` placeholder SQL if D1 shape needed (no binding added — memory/artifact only, note why).
4. STAGE 5→6 everywhere. Files owned: `packages/providers/src/dynamic/**`, cron entry under `packages/mcp/worker/**`, `migrations/**`. No new bindings.

## Min tests 8 (keep 102 green → ≥110)
journal appends once per transition (double-poll same state ⇒ 1 entry); rollup math (known sequence ⇒ exact uptime); stale handling; budget guard stops at 80% (simulate 800 KV writes ⇒ stop + UPSTREAM_FAILED + artifact served); poll count ≤ caps in harness (≤50 subreq, ≤6 concurrent observed); cron count ≤5; null-cache preserved (no cross-request in-memory sharing — fresh composition per request asserted or documented test); reliability endpoint+tool happy. Place `packages/providers/src/dynamic/*.test.ts` + worker reliability test.

## Extra gates
VERIFY OK stage=6; bundle ≤1.5MB; remote empty.
Return files + verify + tests. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
