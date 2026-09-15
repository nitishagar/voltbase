# S4 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Mapping derived from
S4-brief Tasks/Min-tests/Extra-gates + PLAN §4 S4 + IS-04/05/07/08/10 +
ADR-003 (attribution preserved, closed never served).
No FAIL occurred. PLAN.md/IMPLICIT_SPEC.md text lives outside the repo
(plan bundle `2026-09-14-voltbase/`); scope quotes below are S4-brief +
IS-07 (`Same tools, honest divergence`) + ADR-003 serve-time rule.

## G1 — Scope fidelity: every S4-brief task present (PASS)

- T1 `buildMcpServer(deps)` ONE composition root `packages/mcp/src/server.ts`:
  4 tools `voltbase_search_sites` (bbox/connector/minPower/openOnly/limit/
  offset), `voltbase_site_detail` (id), `voltbase_status` (id + after=
  newer-only), `voltbase_reliability` STUB ⇒ typed `UNAVAILABLE_S6` local /
  `LOCAL_ONLY_CAPABILITY` remote (never generic failure). JSON-in-text
  results; strict-args (zod 4.6.5 strictObject at wire + handler-side
  `strictArgs` guard ⇒ typed `INVALID_ARGUMENTS`); URL/host guard reuse
  (connector URL-like ⇒ `validatePublicHttpUrl` typed refusal, no fetch in
  v0.1 — tools read fixture store only); per-request BYOK isolation
  (`deps.ocmKey` per-call snapshot, only `byokConfigured` boolean derived,
  never logged/stored/echoed); attribution+provenance on every result,
  per-partition credits on list (IS-04) ✓. Verified live over HTTP:
  search total 35, detail `OCM:900000` + openchargemap credit, status
  `newer:false` for future after, reliability remote `LOCAL_ONLY_CAPABILITY`
  + `cli: voltbase mcp`, bad-args wire `-32602` typed, closed `NOT_FOUND`.
- T2 Worker `POST /mcp` stateless via `createMcpHandler(() =>
  buildMcpServer(mcpComposition(headers, env)))` (`index.ts:152-175`,
  per-request server over per-request BYOK, `runtime: 'remote'`,
  `composition.ts` mirrors lumen pattern, nothing shared but code — IS-06);
  `GET /mcp` ⇒ typed 405 JSON-RPC `{code:-32000, message contains
  'POST /mcp'}` (`index.ts:179-188`); CORS + sec-headers + request-id
  consistent with S3 (mcp.test asserts `x-request-id` + ACAO `*` + CSP
  `frame-ancestors 'none'`) ✓. Verified live: POST tools/list 200 with all
  4 names; GET 405 typed.
- T3 CLI `voltbase mcp` stdio (`packages/cli/bin/voltbase.js` thin entry +
  `src/index.ts:runMcp` boots same factory over `StdioServerTransport`,
  stdout JSON-RPC only / ready-note stderr, `mcp --help` exit 0 mentions
  stdio); `search`/`detail`/`status` passthroughs minimal + tested
  (`cli-mcp.test.mjs` 4 tests) ✓. Verified live: `mcp --help` exit 0,
  `search --limit 1` 1 row + attribution, `detail OCM:900000` exit 0,
  `detail OCM:910001` exit 1.
- T4 STAGE 3→4 everywhere: `src/lib/stage.ts` (`STAGE = 4`), `/healthz`
  serves live STAGE, `verify.sh` prints `VERIFY OK stage=4` (stage read
  live), `smoke-check.mjs` asserts `STAGE === 4` + exercises `POST /mcp`
  tools/list + `GET /mcp` 405. Files owned: `packages/mcp/*`,
  `packages/cli/*` (+ owned-line stage/smoke/verify bumps). No KV/D1
  (bindings zero, scaffold no-persistence test still green) ✓.
- Min tests: 21 new S4 (server 12 + worker-mcp 5 + cli-mcp 4) covering each
  tool happy, key isolation (two callers different keys ⇒ no cross-read,
  no echo; bare ⇒ `byokConfigured:false`), LOCAL_ONLY points at CLI,
  bad-args rejected (malformed bbox + invalid after + unknown arg),
  after= newer-only (future `newer:false`, past `newer:true`),
  schema-contract locked (4 names + type object + required ids + strict),
  POST 200 + GET 405, CLI `mcp --help`/stdio smoke; S1+S2+S3 69 still
  green → 90 total (≥79) ✓.

## G2 — Green chain (PASS)

- `$ npm install` → `found 0 vulnerabilities` (Node v22.23.2, npm 10.9.8).
- `$ npm run verify` → typecheck ✓, lint ✓, build
  (`site/build.mjs: emitted site/dist/index.html`) ✓,
  `check-bundle: OK (29810 gz bytes <= 1572864; 1.5 MiB self-budget,
  platform cap 64 MiB uncompressed)` ✓,
  `Test Files 13 passed (13) / Tests 90 passed (90)` ✓,
  `smoke-check: / + /healthz + search + site + status + mcp green` + bundle
  + `SMOKE OK` ✓, `check-banned: OK` ✓, final line `VERIFY OK stage=4` ✓.
- `$ npx vitest run --reporter=verbose` → 13 files / 90 passed: core 8 +
  normalise 13 + fixtures 6 + site 1 + scaffold 6 + api 20 + guards 12 +
  server 12 + worker-mcp 5 + cli-mcp 4 + cli-help 1 + healthz workers ×2 ✓.
- `$ npm run lint` → exit 0 ✓. `$ npm run check:banned` → `check-banned:
  OK` ✓. `$ npm run smoke` → `SMOKE OK` ✓.
  `bash scripts/check-bundle.sh` → OK ✓. `$ git remote -v` → empty ✓.
- Exact pins: `@modelcontextprotocol/sdk 1.30.0`, `agents 0.23.0`,
  `zod 4.6.5`, hono 4.13.7 — no `^`/`~` ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)

- `$ git remote -v` → empty ✓. `$ git status --short` → S4 builder file
  set only (15 modified + 6 untracked incl. brief family), zero unexpected
  modifications ✓.
- `npm run check:banned` → OK ✓ (briefs + this report excluded by design).
- Secret-value grep: no tracked `.dev.vars`, no key material in tree (BYOK
  by header name `x-ocm-key` / env name `OCM_API_KEY` only; sentinel
  `ocm-sentinel-mcp-7q2w` absent from MCP response bodies per test) ✓.

## G4 — Mutation kill (PASS, proof)

- Mutation (1 line, `packages/mcp/src/server.ts:143`):
  `    'voltbase_search_sites',` →
  `    'voltbase_search_sites_broken', // MUTATION-G4`.
- `$ npx vitest run packages/mcp/src/server.test.ts` under mutation →
  `Test Files 1 failed (1) / Tests 5 failed | 7 passed (12)` (tool-name
  rename breaks search happy + isolation + bad-args + newer-only +
  contract tests) ✓.
- Reverted via backup copy; `diff` empty, zero `MUTATION` residue
  (`grep -c MUTATION-G4` → 0); `$ npx vitest run` →
  `13 passed (13) / 90 passed (90)` green ✓.

## G5 — Exactness re-checks (PASS)

- 4 tools live (3 + stub): HTTP `tools/list` 200 contains exactly
  `voltbase_search_sites, voltbase_site_detail, voltbase_status,
  voltbase_reliability`; stdio `tools/list` (cli-mcp parity test) exposes
  the same sorted 4 ✓.
- stdio vs HTTP identical tool list: `server.test.ts` asserts local names
  `== [...TOOL_NAMES]` and remote names `== localNames`; cli stdio test
  asserts the same 4 as `POST /mcp` ✓.
- Key isolation: two concurrent callers (A/B keys) both
  `byokConfigured:true`, neither response contains either value; bare
  caller `false`; HTTP sentinel probe (`x-ocm-key:
  ocm-sentinel-mcp-7q2w`) response omits sentinel ✓.
- LOCAL_ONLY→CLI: remote `voltbase_reliability` ⇒ `isError:true`,
  `code: LOCAL_ONLY_CAPABILITY`, `cli: 'voltbase mcp'`, message contains
  `voltbase mcp`; local ⇒ `UNAVAILABLE_S6` (typed, not failure) ✓.
- Bad-args typed: malformed bbox ⇒ `INVALID_ARGUMENTS`; invalid after ⇒
  `INVALID_ARGUMENTS`; unknown `bogus` arg ⇒ handler `INVALID_ARGUMENTS`
  or wire `-32602` (live HTTP probe: `-32602 … Unrecognized key: "bogus"`);
  both count as typed rejection per test ✓.
- after= newer-only: `after: 2030-…` ⇒ `{newer:false, retrievedAt,
  after, attribution}`; `after: 2020-…` ⇒ `{newer:true, data.id}` ✓.
- Schema-contract locked: each tool `inputSchema.type == 'object'`,
  required `[]` (search) / `['id']` (others), `additionalProperties ==
  false` ✓.
- POST /mcp 200 / GET 405: live POST tools/list 200; live GET 405
  `{jsonrpc:'2.0', id:null, error:{code:-32000, …'POST /mcp…'}}` ✓.
- CLI mcp smoke: `mcp --help` exit 0 + stdio; stdio `tools/list` 4 names
  (15 s timeout test green); `search/detail/status` passthroughs green ✓.
- Closed never served via tools: `OCM:910001` ⇒ `NOT_FOUND` on detail +
  status over MCP; CLI `detail OCM:910001` exit 1; REST 404s (S3 priors) ✓.
- Attribution present: search rows + list aggregate carry non-empty
  `attribution.text` + `provenance.retrievedAt`; detail URL contains
  `openchargemap`; live HTTP search text contains `attribution` +
  `NL-NDW` ✓.
- STAGE=4: `stage.ts`, `/healthz` (`{"ok":true,"stage":4}` incl. workerd
  pools ×2), smoke assertion, scaffold + workerd tests `toBe(4)` ✓.
- Priors green: S1+S2+S3 69/69 inside the 90 (core 8, normalise 13,
  fixtures 6, scaffold/artifact/CLI-help/workerd rest, api 20, guards 12) ✓.

## G6 — Process (PASS)

- No commit made; `LEDGER.md` untouched (`git diff -- LEDGER.md` empty) ✓.
  Only write is this report: `docs/ledger/S4-verify-r1.md` ✓.

Verdict: **PASS** — S4 meets brief + PLAN §4 S4 + IS-07 + ADR-003
serve-time rule. Ready for orchestrator ledger + `S4:` commit.
