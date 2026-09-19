# voltbase

> Developer-first open-core tooling for EV charging data — normalisation library, discovery API, and MCP server over open data only.

**Status:** v0.1.0 — the Worker (REST + MCP) is live on Cloudflare Workers and the docs site is published on GitHub Pages. See [docs/stack.md](./docs/stack.md) for the stack contract and [docs/spec.md](./docs/spec.md) for the spec excerpts.

## Quickstart

Requires Node >= 22.

```bash
npm install
npm run verify   # typecheck && lint && build && test && smoke -> VERIFY OK stage=8
npm test         # vitest run (node pool + workers pool + site artifact gates)
npm run dev      # wrangler dev (local Worker)
```

## Packages

| Package | Purpose |
| --- | --- |
| [`@voltbase/core`](./packages/core) | domain types (ChargePoint, Connector, Status, Attribution, Provenance) + the ADR-003 partition key |
| [`@voltbase/normalise`](./packages/normalise) | mappers OCM/OSM/OCPI/DATEX II → core + licence filter (unknown ⇒ closed) |
| [`@voltbase/providers`](./packages/providers) | feed clients + the hourly transition-only reliability poller |
| [`@voltbase/mcp`](./packages/mcp) | `buildMcpServer` factory + `worker/` REST routes + `POST /mcp` gateway (deployed live) |
| [`@voltbase/cli`](./packages/cli) | `voltbase` CLI, stdio MCP launcher |
| `@voltbase/site` | docs site ([live on GitHub Pages](https://nitishagar.github.io/voltbase/)) |

## Stewardship

- Open data only (OCM `opendata=true`, OSM extracts, AFIR NAP per-publisher terms); unknown licence ⇒ closed.
- Keys are referenced by env/header NAME per request, never stored or logged (see [docs/env.md](./docs/env.md)).
- Stateless edge: no KV/D1 in v0.1 until an ADR adds persistence with budget math.
- Exact-pinned deps (no `^`/`~`); TypeScript strict.

## License

[Apache-2.0](./LICENSE) — Copyright 2026 Nitish Agarwal
