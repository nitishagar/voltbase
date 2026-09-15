# S4 brief — MCP parity + CLI

Role: builder. Sequential only. No remotes, no secrets, no deploy.
Inputs: PLAN.md §4 S4; IS-04/05/07/08/10; ADR-003 (attribution preserved, closed never served); docs/stack.md (packages/mcp buildMcpServer factory = one composition root; bin voltbase mcp stdio); existing worker routes/store/guards, core/normalise, `packages/mcp/src/index.ts`, `packages/cli/bin/voltbase.js`, stage/verify/smoke; lumen `packages/mcp/worker/{index.ts,composition.ts}` + server factory patterns; @modelcontextprotocol/sdk 1.30.0 + agents 0.23.0 (createMcpHandler) exact pins.

## Tasks
1. `packages/mcp/src/server.ts` (or extend index.ts): `buildMcpServer(deps)` factory — the ONE composition root. Tools: `voltbase_search_sites` (bbox/connector/minPower/openOnly/limit/offset), `voltbase_site_detail` (id), `voltbase_status` (id + after= newer-only), `voltbase_reliability` STUB → typed `UNAVAILABLE_S6` (not failure). JSON-in-text results (JSON.stringify in text content); strict-args (zod 4.6.5 schemas, bad-args ⇒ typed error); URL/host guards reuse (no fetch in v0.1 except allowlisted — tools read fixture store); per-request BYOK isolation (keys from headers/env name per call, concurrent callers never cross-read — pass deps per request); LOCAL_ONLY typed errors where remote lacks compute (point at `voltbase mcp` CLI command); attribution+provenance on every result (IS-04).
2. Worker `POST /mcp` stateless via `createMcpHandler(() => buildMcpServer(mcpComposition(headers, env)))` (mirror lumen index.ts); GET /mcp ⇒ typed 405 JSON-RPC protocol error; CORS + sec-headers + request-id consistent with S3.
3. CLI `voltbase mcp` stdio (extend bin/voltbase.js + src/index.ts): boots same factory over stdio transport; `--help` still green; add `voltbase search/detail/status` convenience passthroughs optional (keep minimal but tested).
4. STAGE 3→4 everywhere (stage.ts, /healthz, verify.sh, smoke). Files owned: `packages/mcp/*`, `packages/cli/*`. No KV/D1.

## Min tests 10 (keep 69 green → ≥79)
each tool happy; third-party key isolation (two callers different keys ⇒ no cross-read); LOCAL_ONLY points at CLI; bad-args rejected; status after= newer-only; schema-contract locked (tool names + input schemas snapshot); POST /mcp 200 + GET /mcp 405; CLI `mcp --help`/stdio smoke. Place `packages/mcp/src/server.test.ts` + worker mcp test + cli test.

## Extra gates
VERIFY OK stage=4; MCP tool set identical stdio vs HTTP (assert same tool-name list in both); remote empty.
Return files + verify + tests. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
