# S0-R2 feeds — raw data (observed 2026-09-14)
Feed order: NL NDW → LU Chargy KML → FR IRVE; second-wave DE Mobilithek, SE/NO NOBIL.

## 1. OCM (global, mixed licence — filter before serve)
| fact | value | source (observed 2026-09-14) |
|---|---|---|
| base + spec | https://api.openchargemap.io/v3 ; live spec https://api.openchargemap.io/v3/openapi ; raw https://raw.githubusercontent.com/openchargemap/ocm-docs/refs/heads/master/Model/schema/ocm-openapi-spec.yaml | ocm-openapi-spec.yaml (observed 2026-09-14) |
| key mandatory | X-API-Key header or key= param; BYOK name only, never stored | https://raw.githubusercontent.com/openchargemap/ocm-docs/refs/heads/master/Model/schema/ocm-openapi-spec.yaml Fair Usage (observed 2026-09-14) |
| open filter | opendata=true = only OCM-provided open rows | same spec (observed 2026-09-14) |
| deltas | modifiedsince + boundingbox + maxresults(100) + compact/verbose | same spec (observed 2026-09-14) |
| throttle | no duplicate queries; debounce/throttle; admin (auto)ban on excess | same spec (observed 2026-09-14) |
| licence | user rows CC BY 4.0; provider rows © provider, not same terms; visible end-user attribution required | https://openchargemap.io/about/terms (observed 2026-09-14) |

## 2. OSM (ODbL — extracts in CI, never live Overpass from Worker)
| fact | value | source |
|---|---|---|
| licence | ODbL 1.0; alter/build-upon ⇒ share-alike; credit OSM+contributors | https://openstreetmap.org/copyright (observed 2026-09-14) |
| ingest | Geofabrik/planet extracts + osmium-class filter in CI | https://download.geofabrik.de/ (observed 2026-09-14) |
| overpass ban | NEVER live Overpass from Worker; regular apps <100 queries + <10 MB/day (of 10k q/1 GB overall); 429/406 ⇒ pause 30s; commercial ⇒ self-host | https://wiki.openstreetmap.org/wiki/Overpass_API (observed 2026-09-14) |
| collective test | merged OSM+non-OSM index needs Collective-vs-Derivative ADR before S2 | OSMF Collective DB Guideline — UNVERIFIED this pass, re-pin in ADR-003 |

## 3. AFIR NAPs (per-publisher licence, not per-country class)
| # | feed | access | format | cadence | licence | URL (observed) |
|---|---|---|---|---|---|---|
| 1 | NL NDW DOT-NL | free, no key/registration/stated limit | OCPI 2.2.1 JSON gz 17M + GeoJSON 4.7M + tariffs 3.7M | live, listing dated 2026-09-14 | CC0 site-wide; dataset page bare listing, nothing contrary | https://opendata.ndw.nu/ + https://www.ndw.nu/copyright (observed 2026-09-14) |
| 2 | LU Chargy KML ONLY | free, open | KML, refreshed every 5 min | 5-min | CC0 1.0 | https://data.public.lu/en/datasets/bornes-de-chargement-publiques-pour-voitures-electriques/ (observed 2026-09-14) |
| 3 | FR IRVE | free, open | CSV/GeoJSON static schema v2.3.1 + dynamic CSV keyed id_pdc_itinerance | static nightly consolidation; dynamic real-time | Licence Ouverte / Etalab v2.0 | https://transport.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques (observed 2026-09-14) |
| — | LU 2nd multi-operator DATEX II | DO NOT INGEST here | DATEX II (Feb 2026 set) | UNVERIFIED | License Not Specified — ADR-002 ticket | data.public.lu second set — UNVERIFIED this pass |
| 4 | DE Mobilithek (2nd wave) | org registration + manual approval (days) + X.509 mTLS | DATEX II v2+v3 (JSON for v3), REST/SOAP/OCIT-C | ≤24h/≤1min class | per-offer, CC0 recommended | https://mobilithek.info/ + https://napspan.com/blog/mobilithek-mtls-authentication.html (observed 2026-09-14) |
| 5 | SE/NO NOBIL (2nd wave) | API key by application (~2 working days) | NOBIL JSON (OCPI-fed); WS real-time via data.enova.no | live | CC BY 4.0 | https://info.nobil.no/index.php/api (observed 2026-09-14) |
| — | PT Mobi.e | public DATEX II endpoints per OCM #237 | DATEX II XML evActualStatus/evChargingInfra | UNVERIFIED | UNVERIFIED | https://pgm.mobie.pt/integration/nap/evActualStatus — UNVERIFIED this pass |

## 4. Comparator / upstream (kill-4)
| fact | value | source |
|---|---|---|
| OCM #237 | Support DATEX II as input source (required for NAPs); open 2025-09-24, unassigned, no labels | https://github.com/openchargemap/ocm-system/issues/237 (observed 2026-09-14) |
| OCM #245 | TASK: implement new complete OCPI feed onboarding workflow; open 2026-02-08; separate — do not confuse | https://github.com/openchargemap/ocm-system/issues/245 (observed 2026-09-14) |
| NAPSPAN | proprietary; 25 NAPs live; trial €0 / €29 / €99 / €299; EV layer static-only 250k+ pts/36 countries; AFIR-live on roadmap; kill-4 NO trigger, re-check S8 | https://napspan.com/ (observed 2026-09-14) |

## 5. Cost-model inputs for architect (PLAN §3)
- Normalise budget: max feeds × poll cadence × normalise CPU ≤ 10ms/req p50. source https://developers.cloudflare.com/workers/platform/limits/ (observed 2026-09-14)
- Fan-out ≤ 6 concurrent outbound + ≤ 50 subrequests per cron invocation. same source (observed 2026-09-14)
- ≤ 5 cron triggers/account (paid 250). same source (observed 2026-09-14)
- KV guard 1k writes/d diff keys; D1 guard 100k rows written/d + 5M read/d; D1 hard-fails past caps since 2026-09-01. sources https://developers.cloudflare.com/kv/platform/limits/ + https://developers.cloudflare.com/d1/platform/pricing/ + https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/ (observed 2026-09-14)
- W1: naive AFIR per-minute polling × feeds × writes breaks KV/D1 daily write caps — ESTIMATE; cut cadence (static ≤24h, dynamic only with budget ADR) or manual-refresh + stale-label. ESTIMATE, no measured qps.
- p50 ≤10ms is ESTIMATE until spike measures; 1.5MB gzip self-budget is cold-start choice, not platform cap (64 MiB uncompressed; 3MB compressed cap removed 2026-09-04). source https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/ (observed 2026-09-14)

## 6. ADR-002 tickets
- Clear LU second-set licence before ingesting beyond CC0 Chargy KML.
- Hands-on confirm: fetch NDW bytes + eyeball licence footer at ingest time.
- OCM self-served /v3/openapi needs key (403 without) — UNVERIFIED this pass.
