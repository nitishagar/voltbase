/**
 * Worker MCP composition (S4, mirrors lumen `worker/composition.ts`).
 *
 * Per-request instances — nothing is shared between requests except
 * read-only code (IS-06). BYOK (IS-05): the OCM key VALUE is read at call
 * time from its header by env-var NAME (`x-ocm-key` for `OCM_API_KEY`) and
 * handed to `buildMcpServer` as a per-request snapshot; it is never logged,
 * stored, cached, or echoed. The Worker runtime is `remote`, so
 * `voltbase_reliability` answers `LOCAL_ONLY_CAPABILITY` pointing at the
 * CLI (IS-07). Memory only, no KV/D1/DO/R2.
 */
import type { McpDeps } from '../src/server.ts';
import { readByok, type KeyGateEnv } from './guards.ts';

export interface WorkerMcpEnv extends KeyGateEnv {
  ENVIRONMENT?: string;
}

export const mcpComposition = (headers: Headers, env: WorkerMcpEnv): McpDeps => {
  // `env` carries only the free-key gate + ENVIRONMENT (abuse controls live in
  // index.ts); BYOK values ride headers per request, never shared env state.
  void env;
  return {
    now: Date.now,
    ocmKey: readByok(headers, 'OCM_API_KEY'),
    runtime: 'remote',
  };
};
