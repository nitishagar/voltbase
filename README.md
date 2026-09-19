# voltbase

> Developer-first open-core tooling for EV charging data — normalisation library, discovery API, and MCP server over open data only.

**Status:** v0.1.0 — the Worker (REST + MCP) is live on Cloudflare Workers and the docs site is published on GitHub Pages. See [docs/stack.md](./docs/stack.md) for the stack contract and [docs/spec.md](./docs/spec.md) for the spec excerpts.

## Quickstart

Requires Node >= 22.

```bash
npm install
npm run verify   # typecheck && lint && build && test && smoke -> VERIFY OK stage=1
npm test         # vitest run (node pool + workers pool)
npm run dev      # wrangler dev (local Worker)
```

## Packages

| Package | Purpose (S1 shell; logic lands S2–S6) |
| --- | --- |
| [`@voltbase/core`](./packages/core) | domain types (ChargePoint, Connector, Status, Attribution, Provenance) — S2 |
| [`@voltbase/normalise`](./packages/normalise) | mappers OCM/OSM/OCPI/DATEX II → core + licence filter — S2 |
| [`@voltbase/providers`](./packages/providers) | feed clients + dynamic poller paths — S6 |
| [`@voltbase/mcp`](./packages/mcp) | `buildMcpServer` factory + `worker/` API routes + `POST /mcp` gateway — S3/S4 |
| [`@voltbase/cli`](./packages/cli) | `voltbase` CLI, stdio MCP launcher — S4 |
| `@voltbase/site` | docs site ([local preview](./site)) — S5 |

## Stewardship

- Open data only (OCM `opendata=true`, OSM extracts, AFIR NAP per-publisher terms); unknown licence ⇒ closed.
- Keys are referenced by env/header NAME per request, never stored or logged (see [docs/env.md](./docs/env.md)).
- Stateless edge: no KV/D1 in v0.1 until an ADR adds persistence with budget math.
- Exact-pinned deps (no `^`/`~`); TypeScript strict.

## License

[Apache-2.0](./LICENSE) — Copyright 2026 Nitish Agarwal
