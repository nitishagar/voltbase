# S0-R1 frameworks — raw data (observed 2026-09-14)
Inputs thoughts/shared/*, PLAN.md §2/S0, IMPLICIT_SPEC.md IS-10 NOT FOUND in voltbase repo (searched 2026-09-14, UNVERIFIED); brief baselines taken as given.
## 1. Rubric — cell = score 0–3, weights W1..W10 = 5,5,4,4,3,4,3,3,2,5; max = 3×38 = 114
| fw | W1 Workers-first | W2 moving-parts | W3 SSR/static | W4 offline-test | W5 bindings | W6 bundle | W7 health | W8 docs | W9 helpers | W10 spike | total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hono 4.13.7 | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 105 = 15+10+12+12+9+8+9+9+6+15 |
| itty-router 5.0.24 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 2 | 1 | 3 | 100 = 15+15+8+12+9+12+6+6+2+15 |
| plain Worker | 3 | 3 | 1 | 3 | 3 | 3 | 3 | 1 | 0 | 0 | 79 = 15+15+4+12+9+12+9+3+0+0 |
| Rust (workers-rs) | 2 | 1 | 1 | 1 | 2 | 2 | 3 | 2 | 1 | 0 | 54 = 10+5+4+4+6+8+9+6+2+0 |
| Go (net/http+Wasm) | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 1 | 0 | 43 = 5+5+4+4+3+8+6+6+2+0 |
| Fastify 5.12.4 | 0 | 1 | 1 | 0 | 0 | 0 | 3 | 3 | 2 | 0 | 31 = 0+5+4+0+0+0+9+9+4+0 |
| NestJS 12.0.2 | 0 | 0 | 1 | 0 | 0 | 0 | 3 | 3 | 2 | 0 | 26 = 0+0+4+0+0+0+9+9+4+0 |
Rubric winner: Hono (105). No recommendation — architect decides.
## 2. Spikes (top-2 only, reused ~/.spike code; D1 one-row read + POST-redirect; re-verified 2026-09-14)
| spike | files | raw B | gzip B | dry-run raw/gzip | wrangler dev curl | vitest-plugin test | min |
|---|---|---|---|---|---|---|---|
| itty | src/index.ts (49 lines), test (34), migration, htmx.min.js 51238 B static asset (unbundled) | 4295 | 1911 | 4.19 KiB / 1.87 KiB | GET / 200 490 B seed row; POST /sign 302 → / | 2/2 pass, 2.56 s | ≤30 ESTIMATE |
| hono | src/index.tsx (55 lines, hono/jsx SSR), test (48), migration | 94991 (dry-run 95952) | 23383 (dry-run 22.88 KiB; dry raw 93.70 KiB) | 93.70 KiB / 22.88 KiB | GET / 200 397 B seed row; POST /sign 302 → / | 2/2 pass, 3.00 s | ≤30 ESTIMATE |
Baseline MCP-on-Workers (lumen packages/mcp/dist/index.js, metafile outputs total 1191202 B): raw 1191202 B, gzip 297982 B (~291 KiB) vs brief ≈298 KB gz (drift = dep versions).
## 3. Validation / lint-format / CSS
| lib | version (npm view 2026-09-14) | unpacked B | note |
|---|---|---|---|
| zod | 4.6.5 (modified 2026-09-13) | 6140311 | lumen pins ^4.5.2 (packages/mcp/package.json, observed 2026-09-14); CF docs advise ≥4.5.0 for Worker memory (source: developers.cloudflare.com/workers/platform/limits, observed 2026-09-14) |
| valibot | 1.5.0 (modified 2026-09-09) | 1865457 | smaller unpacked; no spike — tree-shaken delta UNVERIFIED |
| eslint 10.10.0 vs @biomejs/biome 2.5.13 (npm view 2026-09-14) | lumen uses eslint 9 flat + typescript-eslint recommended (eslint.config.js, observed 2026-09-14) | typescript-eslint 8.70.0 peer TS >=4.8.4 <6.1.0 (npm view 2026-09-14) → TS 7.0.2 (latest) excluded; 5.9.3 exists |
| CSS | hono spike: hono/jsx SSR, zero CSS dep | itty spike: raw HTML strings + htmx.min.js 51238 B as Workers Static Asset (wrangler.jsonc assets dir, observed 2026-09-14), not bundled | no CSS framework decision — UNVERIFIED beyond spikes |
## 4. Toolchain pins
vitest 4.1.x available (4.1.0–4.1.11; latest 5.0.0 — do NOT take 5.x) (source: npm view vitest, 2026-09-14).
@cloudflare/vitest-plugin latest 1.1.9; spikes used 1.1.6 (hono) / 1.0.0 (itty) (package.json, observed 2026-09-14); NOT pool-workers.
Gotcha: readD1Migrations not exported in 1.1.x — both spikes inline migration SQL via define __MIGRATION_SQL__ (vitest.config, observed 2026-09-14).
TypeScript: latest 7.0.2, 5.9.3 exists (npm view 2026-09-14); pin 5.9.x (or 6.0.x, peer allows <6.1.0), NOT 7.0.x.
npm (not pnpm): lumen has package-lock.json + npm workspaces scripts (observed 2026-09-14); spikes use pnpm-lock — record rationale in ADR-001.
wrangler 4.131.2 latest; spikes re-verified on 4.130.0 (dry-run output, observed 2026-09-14).
Health/activity (npm view 2026-09-14): hono 4.13.7 modified 2026-09-04, unpacked 1391192 B, homepage hono.dev; itty-router 5.0.24 modified 2026-06-08, unpacked 40998 B, zero-dep router, homepage itty.dev/itty-router.
Registry remainder (npm view 2026-09-14): fastify 5.12.4, @nestjs/core 12.0.2, eslint 10.10.0, @biomejs/biome 2.5.13.
## 5. Go/Rust verdict (adopt only on ≥10pt win + spike pass — neither met: Rust 54, Go 43, no spikes per brief)
Rust deployability FIRST-CLASS: Cloudflare docs "Write Workers in 100% Rust using workers-rs" via wasm32-unknown-unknown + worker-build + wasm-bindgen JS plumbing (source: developers.cloudflare.com/workers/languages/rust, updated 2026-04-23, observed 2026-09-14).
Rust bindings: workers-rs Env covers KV, R2, D1, Queues, AI, Hyperdrive (same docs page, observed 2026-09-14); D1 usage here ESTIMATE (untested).
Rust cold-start/size: unoptimized Wasm "may exceed limits or experience long startup"; template sets lto/strip/codegen-units=1 + wasm-opt; 1 s startup limit, 64 MiB uncompressed cap, no compressed limit (sources: rust docs page; developers.cloudflare.com/workers/platform/limits updated 2026-09-05; observed 2026-09-14). Actual cold-start ms ESTIMATE (no spike).
Rust MCP SDK: rmcp = official Rust SDK (modelcontextprotocol/rust-sdk: rmcp + rmcp-macros crates, observed 2026-09-14), tokio async runtime; tokio-on-Wasm Workers compat UNVERIFIED — risk.
Go deployability WASM-ONLY, experimental: syumai/workers-go "experimental", serves http.Handler, D1 alpha, TinyGo template for smaller binary, TinyGo ≥0.42 required for net/http Wasm (source: github.com/syumai/workers-go README, observed 2026-09-14).
Go distribution: Go modules (go get), NOT npm — second toolchain + custom wrangler build step; team-of-one maintenance cost ESTIMATE high vs single TS toolchain.
Go/Rust rejected FOR NOW: no ≥10pt win (Hono 105 vs Rust 54 vs Go 43), no spike pass; bundle size NOT a disqualifier per 64 MiB cap (sourced above). Revisit only with spike + ≥10pt win.
## 6. Rejected list
Fastify 5.12.4: Node http-server APIs absent in workerd — cannot run on Workers (rationale UNVERIFIED against primary source; no spike).
NestJS 12.0.2: Node + reflect-metadata + large dep tree, incompatible with 1 s startup / isolate model (rationale UNVERIFIED against primary source; no spike).
plain Worker: viable fallback (79), zero deps; loses on SSR/helpers/docs; no spike per brief (top-2 only).
