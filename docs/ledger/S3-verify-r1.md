# S3 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Mapping derived from
S3-brief Tasks/Min-tests/Extra-gates + PLAN §4 S3 + ADR-003 serve-time rule
(no cross-partition OSM/non-OSM joins, attribution preserved) + IS-03/04/05/06/08/10.
No FAIL occurred. PLAN.md text is not in-repo; scope is S3-brief + ADR-003 + stack.md.

## G1 — Scope fidelity: every S3-brief task present (PASS)

- T1 routes `packages/mcp/worker/` (Hono): `GET /healthz` → `{ok:true,stage:3}`
  via `src/lib/stage.ts`; `GET /api/v1/sites?...` (bbox, connector, minPower,
  openOnly, limit/offset) in `routes.ts:handleListSites`; `GET /api/v1/sites/:id`
  (`handleGetSite`, closed/self ids ⇒ 404, never a closed signal);
  `GET /api/v1/status/:id` (`handleGetStatus`, stale-label >60min ⇒
  `stale:true` + reason). Serve from in-memory fixture index `store.ts`:
  `licenceFilter(renormalise([...EU_FIXTURES, ...INDIA_FIXTURES]))` +
  `isServable` filter ⇒ 35 rows (27 EU + 8 IN); `filterSites` is
  filter-then-serve per row, no merge/join/cross-reference of OSM/non-OSM
  (ADR-003 test 1, comment in code) ✓. Verified live: 4 routes 200;
  `total 35`, `bbox 4.8,52.3,5.0,52.45 ⇒ 1 row (OCPI:NL-NDW-001)`.
- T2 abuse controls `guards.ts` (+ `index.ts` wiring): optional free-key gate
  (`isAuthorized`, missing/invalid ⇒ 401 typed, public reads allowed when no
  `VOLTBASE_API_KEY`, `/` + `/healthz` stay public, OPTIONS preflight never
  gated); in-memory IP rate-limit 60/min (`createRateLimiter` sliding window ⇒
  429 typed + `retry-after`); outbound allowlist (`ALLOWED_OUTBOUND_HOSTS`,
  5 ADR-002 feed hosts, OSM absent by design) + capping fetcher 2.5 MB
  (`createCappingFetcher`, Content-Length rejected BEFORE read, lying streams
  capped mid-read) + public-URL guard (`validatePublicHttpUrl` /
  `isBlockedHost`: 10/172.16/192.168/127/169.254/::1/fc00/localhost/metadata
  refused); per-request BYOK (`readByok` by header NAME `x-ocm-key`, value used
  for nothing on S3 read paths, never logged/stored/echoed); CORS-minimal
  (`isCorsSurface` exactly `/api/v1/`, `GET, OPTIONS`); security headers
  (CSP `default-src 'none'; frame-ancestors 'none'`, nosniff, DENY,
  no-referrer) + request-id echo/mint + JSON access log
  `{method,path,status,requestId}` only ✓. Verified live: 401 missing-key,
  429 second-hit, SSRF private `ok:false` ×3 / public `ok:true`, oversize
  rejected `UpstreamTooLargeError` before-read `true`, guarded seam `calls 0`
  for blocked targets.
- T3 STAGE 2→3: `src/lib/stage.ts` (`STAGE = 3`), `scripts/verify.sh` prints
  `VERIFY OK stage=3` (stage read live), `/healthz` serves live STAGE,
  `scripts/smoke-check.mjs` asserts `STAGE === 3` + exercises
  `/` + `/healthz` + search + site + status; bundle gate wired
  (`scripts/check-bundle.sh` in both `verify.sh` and `smoke.sh`, comment:
  1.5 MB gzip self-budget cold-start choice, platform 64 MiB uncompressed) ✓.
- T4 TS strict (`strict:true` + `noUncheckedIndexedAccess` in
  `tsconfig.base.json`, `tsc --noEmit` clean), eslint clean, exact pins only
  (no `^`/`~`: typescript 5.9.3, vitest 4.1.11, eslint 10.10.0,
  wrangler 4.131.2, hono 4.13.7). Files owned: `packages/mcp/worker/*`
  (index/routes/store/guards), owned-line stage bump, smoke/verify scripts.
  No KV/D1/DO/R2 (both wrangler.jsonc name `voltbase-api`, compat 2026-08-04,
  `nodejs_compat` + `global_fetch_strictly_public`, zero bindings; scaffold
  test asserts no-persistence) ✓.
- Min tests: 32 new S3 (api 20 + guards 12) covering filters-narrow
  (bbox/connector/minPower/openOnly + typed 400s), closed/self excluded (5
  closed ids 404 on site+status, exactly 35 served), pagination disjoint,
  key missing/invalid 401 (healthz stays public), IP 429 + retry-after +
  per-IP buckets, oversize/SSRF rejected (allowlist + private-host reject,
  inner fetcher never called), stale flag (live-clock stale + injected-clock
  fresh), CSP/security headers, 404 shape (site + route), request-id
  present/echo/mint, BYOK silence, attribution + OSM slash-id + per-partition
  ADR-003 + CORS preflight; S1+S2 37 still green → 69 total (≥49) ✓.

## G2 — Green chain (PASS)

- `$ npm install` → `found 0 vulnerabilities` (Node v22.23.2, npm 10.9.8).
- `$ npm run verify` → typecheck ✓, lint ✓, build
  (`site/build.mjs: emitted site/dist/index.html`) ✓,
  `check-bundle: OK (26915 gz bytes <= 1572864; 1.5 MiB self-budget,
  platform cap 64 MiB uncompressed)` ✓,
  `Test Files 10 passed (10) / Tests 69 passed (69)` ✓,
  `smoke-check: / + /healthz + search + site + status green` + bundle + `SMOKE OK` ✓,
  `check-banned: OK` ✓, final line `VERIFY OK stage=3` ✓.
- `$ npx vitest run --reporter=verbose` → 10 files / 69 passed: core 8 +
  normalise 13 + fixtures 6 + site 1 + scaffold 6 + api 20 + guards 12 +
  healthz workers ×2 + plain-node CLI 1 (incl. workerd pool healthz stage=3) ✓.
- `$ npm run lint` → exit 0 ✓. `$ npm run check:banned` → `check-banned: OK` ✓.
  `$ npm run smoke` → `SMOKE OK` ✓. `bash scripts/check-bundle.sh` → OK ✓.
  `$ git remote -v` → empty ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)

- `$ git remote -v` → empty ✓. `$ git status --short` → S3 builder file set
  only (7 modified + 7 untracked incl. this brief family), zero unexpected
  modifications ✓.
- `npm run check:banned` (scans `git ls-files --cached --others
  --exclude-standard`, briefs + this report excluded by design) → OK ✓.
  Standalone `any` grep in worker/src hits only `expect.any(String)` in tests
  + `wraps any inner fetcher` comment; no standalone `any` type in source ✓.
- Secret-value grep: no tracked `.dev.vars`, no key material in tree (BYOK by
  header name only) ✓.

## G4 — Mutation kill (PASS, proof)

- Mutation (2 lines, `packages/mcp/worker/guards.ts:175-176`):
  `export const isBlockedHost = (hostname: string): boolean => {` +
  `const host = normalizeHost(hostname);` →
  `export const isBlockedHost = (hostname: string): boolean => {` +
  `void hostname; return false; // MUTATION-G4: allow private hosts (must FAIL)`.
- `$ npx vitest run packages/mcp/worker/guards.test.ts` under mutation →
  `Test Files 1 failed (1) / Tests 1 failed | 11 passed (12)` (SSRF
  `refuses private, loopback, link-local, ULA, and localhost targets` kills) ✓.
- Reverted via backup copy; `diff` empty, no `MUTATION` residue;
  `$ npx vitest run` → `10 passed (10) / 69 passed (69)` green ✓.

## G5 — Exactness re-checks (PASS)

- 4 routes work: `/healthz`, `/api/v1/sites`, `/api/v1/sites/:id`,
  `/api/v1/status/:id` all 200 live (CSP + request-id on each) ✓.
- Filters narrow: bbox 35→1 (Amsterdam box contains OCPI:NL-NDW-001);
  connector/minPower/openOnly each `>0` and `<35`, per-row assertions in tests ✓.
- Closed/self excluded + 404: `total 35`; all 5 closed ids
  (`OCM:910001`, `DATEX2:LU-2ND-001`, `DATEX2:FR-UNK-001`, `OCM:920001`,
  `OCM:920002`) 404 `{NOT_FOUND}` on site + status; unknown id/route 404 typed ✓.
- Pagination disjoint: limit=5 offset=0 vs 5 overlap 0 (test asserts
  10 distinct ids) ✓.
- 401/429 paths: keyed app missing/wrong ⇒ 401 `UNAUTHORIZED`, correct ⇒ 200,
  healthz public; hot IP (limit 1–2) third hit ⇒ 429 `RATE_LIMITED` +
  numeric `retry-after`, other IP unaffected ✓.
- SSRF/oversize rejected before fetch: `10.0.0.1`/`169.254.169.254`/`localhost`
  `ok:false`, public feed `ok:true`; allowlist admits `opendata.ndw.nu`
  (+ subdomains) only; Content-Length overrun throws `UpstreamTooLargeError`
  with `bodyRead false`; `fetchAllowed` blocked ⇒ `OutboundBlockedError`,
  `calls 0` ✓.
- Stale flag: live clock fixture `stale:true` + `60min` reason; injected clock
  `2026-09-14T06:30:00Z` ⇒ `stale:false`, no reason ✓.
- CSP/headers + request-id: CSP contains `frame-ancestors 'none'`, nosniff,
  DENY, no-referrer; minted id matches `/^[A-Za-z0-9_-]{8,}$/`, sane id echoed,
  insane id reminted ✓.
- No PII logs: live capture `{method,path,status,requestId}` only; probe with
  IP + BYOK + query secret ⇒ `has_ip false, has_sentinel false,
  has_secret_qs false`; IP used only as rate-limit bucket key ✓.
- BYOK never stored: `readByok` header-NAME lookup, `void`-discarded per
  request in middleware, no assignment/cache/log/echo; sentinel absent from
  all three response bodies ✓.
- No cross-partition OSM/non-OSM joins: live index 35 rows, 0 mixed
  `(feature_type|regional_cut)` partitions; every row carries full 4-part key
  + source-prefixed id; list aggregates per-partition attribution only ✓.
- STAGE=3 everywhere: `stage.ts`, `/healthz`, smoke assertion, scaffold +
  workerd tests `toBe(3)` ✓.
- Prior tests green: S1+S2 37/37 inside the 69 (core 8, normalise 13,
  fixtures 6, scaffold/artifact/CLI/workerd rest) ✓.

## G6 — Process (PASS)

- No commit made; `LEDGER.md` untouched (`git diff -- LEDGER.md` empty) ✓.
  Only write is this report: `docs/ledger/S3-verify-r1.md` ✓.

Verdict: **PASS** — S3 meets brief + PLAN §4 S3 + ADR-003 serve-time rule.
Ready for orchestrator ledger + `S3:` commit.
