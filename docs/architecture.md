# voltbase — architecture (S7)

## Layout (npm workspaces `["packages/*","site"]`)

- `packages/core` — domain types (`ChargePoint`, `Connector`, `Status`,
  `Attribution`, `Provenance`) with the per-row source+licence partition key
  `(feature_type, regional_cut, source, licence)` per ADR-003.
- `packages/normalise` — mappers OCM / OSM / OCPI 2.2.1 / DATEX II → core plus
  the licence filter (unknown ⇒ closed) and the S2 EU+IN fixtures.
- `packages/providers` — feed clients plus `src/dynamic/` (S6): hourly-class
  transition-only poller, status-transition journal, 80% write-budget guard,
  uptime rollups, and the checked-in last-good prebuilt cut.
- `packages/mcp` — `buildMcpServer` factory (`src/server.ts`, the one MCP
  composition root) plus `worker/` (Hono API routes, `POST /mcp` gateway,
  `scheduled()` cron body). Worker name `voltbase-api`.
- `packages/cli` — `voltbase` binary; stdio MCP via `voltbase mcp`.
- `site/` — static docs artifact (`site/dist`, base `/voltbase`); `src/lib/stage.ts`
  carries the `STAGE` marker served by `GET /healthz`.
- `tests/e2e/` — lightweight end-to-end suite (node + vitest, no browser).

## Data flow (OCM / OSM / NAP → normalise → partition → API / MCP)

1. Ingest: OCM (BYOK, `opendata=true` rows only), OSM extracts (CI only, never
   live Overpass from the Worker), AFIR NAP subsets (NL NDW → LU Chargy CC0 KML
   → FR IRVE per ADR-002; second-wave DE/NOBIL stay notes-only).
2. Normalise: each feed maps into one core row with source-prefixed id,
   `retrievedAt` provenance, and per-feed attribution.
3. Partition: the licence filter drops unknown licences to closed; served rows
   keep their own 4-tuple partition key and per-partition attribution. Serve
   time filters per row and never joins OSM with non-OSM rows (ADR-003).
4. Serve: the stateless edge API (`GET /api/v1/sites`, `:id`, `status/:id`,
   `reliability/:id`) and the four MCP tools (`voltbase_search_sites`,
   `voltbase_site_detail`, `voltbase_status`, `voltbase_reliability`) read the
   same servable-only index. Closed/self ids answer typed `NOT_FOUND` on every
   surface — never a closed signal.

## Licence boundary (ADR-003, IS-01)

- Code: Apache-2.0 (`LICENSE` canonical; manifests carry `Apache-2.0`).
- Data: the served index is an ODbL **Collective Database** (partitioned), not
  a Derivative Database — each feed keeps its own licence (OCM CC BY 4.0 user
  rows, OSM ODbL, NL/LU CC0, FR Licence Ouverte / Etalab). Provider-copyright
  and unclear-licence rows are excluded before serving.
- Tree: the working repo stays `private:true` until the public flip; public
  artefacts are `dist/` + `site/dist`. The S7 release script clears `private`,
  repoints `exports` to `dist/`, builds, then restores the tree.

## Budgets (IS-10, ADR-002 §W1)

- Worker: 100k req/d, 10 ms CPU, 50 subrequests + 6 concurrent outbound per
  invocation, 5 crons/account, 64 MiB uncompressed platform cap.
- Self budgets: 1.5 MiB gzip bundle (cold-start choice; `check-bundle.sh`
  FAILS past the cap) and 300 ms local TTFB on `/` + `/api/v1/sites`
  (`check-ttfb.mjs`, local-only via `app.request`, no network).
- Persistence: KV 1k writes/d, D1 100k rows/d — counters stop at 80% (800 /
  80k) with typed `UPSTREAM_FAILED` + cut-to-artifact (last-good prebuilt cut
  + stale label). Guard failure never widens serving and never buys a tier.

## Cron

- Exactly one hourly-class trigger (`17 * * * *`, the only cron in v0.1)
  running the transition-only poller through the 80% guard (≤50 subrequests /
  ≤6 concurrent per invocation). `scheduled()` replays the servable fixture
  index in v0.1 (no live fetch, no bindings); live ADR-002 fetch lands later
  without changing these caps.

## E2E decision (closes LEDGER #3)

- Chosen: lightweight e2e — node + vitest against `createApp` directly via
  `app.request` (no network) plus the MCP `Client` over `InMemoryTransport`
  and `site/dist` file reads. No Playwright.
- Reason: free-tier CI (no browser deps to install), seeded S2 fixtures
  suffice for the journey (search → detail → status → reliability → MCP →
  docs), and the Worker surfaces are plain request/response (a browser adds
  no coverage). Recorded here so the ledger row can close at S7.
