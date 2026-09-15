# S0 package-check — `npm view` proofs (observed 2026-09-14; npm 10.9.8, node v22.23.2)
| package | latest | decision (exact pin) | proof |
|---|---|---|---|
| vitest | 5.0.0 | 4.1.11 (4.1.0–4.1.11 exist) | 5.0.0 unsupported by plugin peer below |
| @cloudflare/vitest-plugin | 1.1.9 | 1.1.9 | peers: `vitest ^4.1.0`, `@vitest/runner ^4.1.0`, `@vitest/snapshot ^4.1.0` |
| typescript | 7.0.2 | 5.9.3 (6.0.3 approved fallback) | typescript-eslint peer below; TS 7 lacks programmatic API [V-secondary] |
| typescript-eslint | 8.70.0 | 8.70.0 | peers: `eslint ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`; `typescript >=4.8.4 <6.1.0` |
| itty-router | 5.0.24 | 5.0.24 (fallback only, ADR-001) | dist-tags: `latest: 5.0.24` (6.0.0 exists, not latest) |
| hono | 4.13.7 | 4.13.7 (ADR-001 default) | — |
| wrangler | 4.131.2 | 4.131.2 | engines `node >=22.0.0`; local v22.23.2 OK |
| zod | 4.6.5 | 4.6.5 | CF docs advise ≥4.5 for Worker memory (frameworks.md §3) |
| eslint | 10.10.0 | 10.10.0 | typescript-eslint peer `^10.0.0` OK |
| astro | 7.3.2 | 7.3.2 | engines `node >=22.12.0`; local OK |
| pagefind | 1.5.2 | 1.5.2 | — |
| @modelcontextprotocol/sdk | 1.30.0 | 1.30.0 (lumen parity) | — |
| agents | 0.23.0 | 0.23.0 (`createMcpHandler`) | — |
| @cloudflare/workers-types | 5.20260914.1 | match wrangler date | — |
| @biomejs/biome | 2.5.13 | rejected (eslint, lumen parity) | — |

All pins exact, no `^`/`~` (PLAN §1.7). Spikes ran plugin 1.1.6/1.0.0 + vitest 4.1 — S1 pins newer. Re-run this check if S1 slips past 30 days.
