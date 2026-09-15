# S8 audit — clean-clone verification (2026-09-15)

Verdict: **PASS**. No BLOCKING items. Status → READY_FOR_CREDENTIALS.

## 1. Fresh clone (clone outputs)

- `git clone /home/nitish/repos/learn/voltbase /tmp/voltbase-S8-audit` (file-local; clone `origin` = source path only, source `git remote -v` empty, no network).
- Clone `npm install`: clean, 0 vulnerabilities. `node v22.23.2`, `npm 10.9.8`.
- Clone `npm run verify`: **VERIFY OK stage=7** pre-bump (typecheck + lint + build + bundle + TTFB + test + smoke + check-banned, all green).
- Clone `npx vitest run`: **23 files / 130 tests passed**.

## 2. Re-verified 8 random S2–S6 tasks (with citations)

| # | Task | Evidence (source file:line) |
|---|------|------------------------------|
| 1 | Normalise partition key `(feature_type, regional_cut, source, licence)` | `packages/core/src/index.ts:74-76` (`partitionKey`), `packages/core/src/index.ts:78-81` (`partitionKeyString`) |
| 2 | Licence filter: UNKNOWN⇒CLOSED, servable/closed split | `packages/normalise/src/index.ts:521-542` (`closeUnknownLicence` + `licenceFilter`); licence aliases `packages/normalise/src/index.ts:135-154` |
| 3 | Closed-exclusion: closed/self rows never served (404, never a closed signal) | `packages/mcp/worker/store.ts:26-29` (servable-only index build), `packages/mcp/worker/store.ts:67-69` (`findServableById`); routes `packages/mcp/worker/routes.ts:120-126,129-144` |
| 4 | Rate-limit (60/min/IP ⇒ 429) + SSRF guard + outbound allowlist | `packages/mcp/worker/guards.ts:281-301` (limiter), `packages/mcp/worker/guards.ts:190-210` (`validatePublicHttpUrl`), `packages/mcp/worker/guards.ts:221-227` (allowlist), `packages/mcp/worker/guards.ts:252-263` (`fetchAllowed`); enforced `packages/mcp/worker/index.ts:107-145`; runtime backstop `global_fetch_strictly_public` in `packages/mcp/worker/wrangler.jsonc:12` |
| 5 | MCP parity (4 locked tools, stdio = HTTP) + per-request BYOK isolation | `packages/mcp/src/server.ts:49-51` (`TOOL_NAMES`), parity test `packages/mcp/src/server.test.ts:173-201`, BYOK test `packages/mcp/src/server.test.ts:104-121`; `packages/mcp/worker/composition.ts:20-28` (per-request `readByok`, never stored/logged) |
| 6 | Site artifact (prebuilt docs, Pages-shaped `site/dist`) | `site/dist/index.html` + legal/attributions/providers/mcp-onboarding/quickstart/api-reference cuts present; artifact-sync test `packages/providers/src/dynamic/artifact.test.ts`; `packages/providers/src/dynamic/artifact.ts:29-41` |
| 7 | Journal-once (transitions only, first sight seeds baseline, repeats append nothing) | `packages/providers/src/dynamic/journal.ts:45-52` (`observe`); tests `packages/providers/src/dynamic/journal.test.ts` |
| 8 | 80% write-budget guard (800 KV / 80k D1 ⇒ `UPSTREAM_FAILED` + last-good cut) | `packages/providers/src/dynamic/budget.ts:15-20` (ratio + guard lines), `packages/providers/src/dynamic/budget.ts:58-71` (`exhausted` + `check`); handler seam `packages/mcp/worker/reliability.ts:41-52`; test `packages/mcp/worker/reliability.test.ts:36-52` |

All 8 re-verified green in the clone run (130/130).

## 3. Coverage

### ADR↔code

| ADR | Code | Status |
|-----|------|--------|
| ADR-001 Hono 4.x default, itty/plain rejected, exact pins | `packages/mcp/worker/index.ts:25` (`import { Hono }`), pins in `package.json` (TS 5.9.3, vitest 4.1.11, eslint 10.10.0, wrangler 4.131.2) | Full |
| ADR-002 feed order NL→LU→FR, OCM BYOK-filtered, OSM CI-only; hourly cron + transition-only + 80% guards | `packages/mcp/worker/guards.ts:221-227` (allowlist, OSM absent), `packages/mcp/worker/wrangler.jsonc:13` (single cron `17 * * * *`), `packages/providers/src/dynamic/poller.ts:20-22,60-66` (50/6 caps), `packages/providers/src/dynamic/budget.ts` | Full |
| ADR-003 partition key / no cross-partition join / closed-never-served | `packages/core/src/index.ts:70-91`, `packages/mcp/worker/store.ts:45-64` (filter-only, no joins), partition tests `packages/normalise/src/fixtures.test.ts:56-77` | Full |

No gaps.

### spec↔route (`docs/spec.md` S1 slice vs Worker surface)

| Spec | Route/tool | Status |
|------|------------|--------|
| `GET /` landing contains voltbase | `packages/mcp/worker/index.ts:147-152` | Covered |
| `GET /healthz {"ok":true,"stage":N}` | `packages/mcp/worker/index.ts:154` | Covered (stage 8 post-bump) |
| IS-05 BYOK by name, never stored | `packages/mcp/worker/index.ts:98`, `composition.ts:26` | Covered |
| IS-06 stateless, zero bindings | `wrangler.jsonc` (no KV/D1/DO/R2), per-request instances | Covered |
| IS-09/IS-10 process + free-tier ceilings | `scripts/verify.sh`, `budget.ts`, `poller.ts` caps, publish script no-op while private | Covered |
| S3/S4/S6 extensions (sites/status/reliability/MCP tools) | `routes.ts`, `reliability.ts`, `server.ts` — beyond the S1 spec slice, pinned by stage suites | Covered by stage tests, no spec drift (spec is S1-scoped by design) |

No gaps.

## 4. Security scrub (diff since S5: `8082d1d..HEAD` = S6+S7)

Files reviewed: `budget.ts`, `journal.ts`, `poller.ts`, `rollup.ts`, `artifact.ts`, `last-good.ts`, `reliability.ts` (+worker), `publish-workspaces.mjs`, `smoke-check.mjs`, `check-ttfb.mjs`, `check-bundle.sh`, `smoke.sh`, `verify.sh`, e2e/ttfb tests, `wrangler.jsonc`.
- Injection: `publish-workspaces.mjs:148` uses `execFileSync('npm', ['run','build'], …)` — fixed argv, no shell, no user input. No `eval`/dynamic import of remote code.
- Auth/secrets: only `process.env.CI` read (`publish-workspaces.mjs:123`); key material only via per-request headers (`x-ocm-key`, `x-voltbase-key`), never logged (access log = method+path+status+request-id, `index.ts:75-77`), never persisted. No secrets in tree.
- SSRF/traversal: `fetchAllowed` (allowlist + public-URL guard) is the exclusive outbound seam; `MANIFESTS` is a const list joined under repo root (no traversal); e2e/ttfb use `app.request` local-only, no network.
- Cron/poller: single cron, caps enforced in code (`poller.ts:60-66`), lane pool ≤6 (`poller.ts:61,80-104`).

Sign-off: **clean, no findings**.

### Kill-4 re-check (code evidence, no network)

NAPSPAN proprietary tiers + OCM #237 open/unassigned ⇒ **no trigger**, per `docs/adr/ADR-002-feeds.md:27-28`. No DATEX II ingest added in S6+S7 diff (poller consumes status samples only; LU second-set ticket still open). Re-check at next feed-scope change.

## 5. Blocking items

None. No source fixes required.

## 6. STAGE 7→8 bump

Touched: `src/lib/stage.ts` (`STAGE 7→8`), `packages/mcp/worker/index.ts` (landing + healthz comments), `packages/mcp/worker/scaffold.test.ts`, `packages/mcp/worker/healthz.workers.test.ts`, `scripts/smoke-check.mjs`, `scripts/verify.sh` (header comment). Post-bump `npm run verify` in source → **VERIFY OK stage=8** (expected).

Remote: empty. No publish (publish script dry-run default; private manifests intact).
