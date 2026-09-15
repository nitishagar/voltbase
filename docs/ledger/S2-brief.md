# S2 brief — normalisation core + fixtures

Role: builder. Sequential only. No remotes, no secrets, no deploy.
Inputs (read first): PLAN.md §4 S2; IMPLICIT_SPEC IS-03/04/09/10; `docs/adr/ADR-003-licence-boundary.md` (Collective partitioned, key `(feature_type, regional_cut, source, licence)`, unknown⇒closed, no cross-partition joins); `docs/adr/ADR-002-feeds.md` (feed order + licences); `docs/stack.md` layout; existing `packages/core/src/index.ts`, `packages/normalise/src/index.ts`, `src/lib/stage.ts`, `scripts/verify.sh`.

## Tasks
1. `packages/core`: types ChargePoint, Connector, Status, Attribution, Provenance + per-row `licence` + `source` + partition key `(feature_type, regional_cut, source, licence)`; ULID + ISO-time helpers; `licence` union incl `CC0-1.0 | Etalab-2.0 | CC-BY-4.0 | ODbL-1.0 | CLOSED | UNKNOWN`; `isServable()` (UNKNOWN/CLOSED/provider-copyright ⇒ false); `partitionKey()`; no `any` without `// allow-any:`.
2. `packages/normalise`: mappers OCM→core (enforce `opendata=true`, provider-copyright ⇒ CLOSED), OSM→core (from extract objects, never Overpass), OCPI 2.2.1→core (NL shape), DATEX II→core + `licenceFilter` (unknown⇒closed) + validators; deterministic idempotent re-normalise (same input ⇒ same output IDs).
3. Fixtures: `packages/normalise/fixtures/` — 30 EU sites mix (NL OCPI, LU KML, FR IRVE, OCM open, OSM) + 10 India static (OCM/OSM) incl. closed rows proving filter (unknown licence, provider-copyright OCM, LU 2nd-set Not-Specified). Fixture counts asserted in tests.
4. Bump `src/lib/stage.ts` STAGE 1→2. Keep `npm run verify` printing `VERIFY OK stage=2` (update scripts/verify.sh + worker /healthz stage).
5. TS strict, exact pins only, eslint clean. Files owned: `packages/core`, `packages/normalise`, fixtures. No KV/D1. No remote fetch.

## Min tests 14 (vitest, keep S1's 10 green → ≥24 total)
Each mapper happy + each licence-reject (OCM provider-copyright, UNKNOWN, LU-Not-Specified, closed); idempotent re-normalise; boundary empty/malformed/max-size/unicode/negative-kW; attribution preserved (OCM/OSM/NAP strings survive); fixture counts (30+10).
Place in `packages/normalise/src/*.test.ts` + extend core tests.

## Extra gates
Fixture counts asserted; closed rows never served (`isServable` false); `npm run verify` → stage=2; remote empty.
Return: files + verify output + test summary. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
