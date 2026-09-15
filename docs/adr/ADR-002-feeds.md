# ADR-002 — Feeds, poll cadence, write budgets (S0 decision, 2026-09-14)
WHAT: ingest order **NL NDW → LU Chargy (CC0 KML ONLY) → FR IRVE**; OCM (BYOK, filtered) and OSM (extracts, CI-only) are orthogonal global sources. WHY: evidence-ranked on licence clarity + zero-auth access + live cadence (R2 `docs/research/feeds.md`, all observed 2026-09-14).

## Per-dataset licence + access evidence (all URLs observed 2026-09-14)
| feed | licence | access | format / cadence | evidence URL |
|---|---|---|---|---|
| NL NDW DOT-NL (1st) | CC0 site-wide ("Tenzij anders vermeld…CC0"); dataset page bare listing, nothing contrary | free, no key/registration/stated limit | OCPI 2.2.1 JSON.gz 17 MB + GeoJSON 4.7 MB + tariffs 3.7 MB; live | opendata.ndw.nu + www.ndw.nu/copyright |
| LU Chargy KML (2nd) | CC0 1.0 | free, open | KML every 5 min | data.public.lu/en/datasets/bornes-de-chargement-publiques-pour-voitures-electriques/ |
| FR IRVE (3rd) | Licence Ouverte / Etalab | free, open | static CSV/GeoJSON schema v2.3.1 nightly + dynamic CSV keyed id_pdc_itinerance | transport.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques |
| OCM (BYOK) | CC BY 4.0 user rows; provider rows © provider, not same terms | API key mandatory (X-API-Key / key=) | JSON; modifiedsince/boundingbox/maxresults 100; throttle duplicate queries | api.openchargemap.io/v3 + openchargemap.io/about/terms |
| OSM | ODbL 1.0 share-alike | Geofabrik/planet extracts in CI; NEVER live Overpass from Worker (regular apps <100 queries/10 MB per day) | planet/regional extracts | openstreetmap.org/copyright + wiki.openstreetmap.org/wiki/Overpass_API |
| DE Mobilithek (2nd wave) | per-offer (CC0 recommended) | org registration + manual approval (days) + X.509 mTLS | DATEX II v2/v3; ≤24 h / ≤1 min | mobilithek.info |
| SE/NO NOBIL (2nd wave) | CC BY 4.0 | API key by application (~2 working days) | NOBIL JSON (OCPI-fed); live | info.nobil.no/index.php/api |

Second wave WHY: DE = registration friction + per-offer licence variance (consumer model VERIFIED 2026-09-14 but approval takes days); SE/NO = key-gated + attribution obligations; neither blocks v0.1.

## W1 — poll cadence × write-budget math (ESTIMATE until S6 measures; caps from docs/free-tier-limits.md, observed 2026-09-14)
- Naive per-minute polling REJECTED: 1 feed = 1,440 polls/day ⇒ ≥1,440 KV marker writes — breaks KV 1k writes/d with a single feed (3 feeds = 4,320, 4.3×). D1: per-minute full upserts of ~2k sites = 1,440 × 2k = ~2.88M rows/day ≈ 29× the 100k/d cap — instant hard-fail (enforced since 2026-09-01, errors until midnight UTC).
- Adopted: hourly-class Worker cron (≤5 crons/account, ≤6 concurrent outbound, ≤50 subrequests/invocation) journaling STATUS TRANSITIONS ONLY, never full upserts — even hourly full upserts of 3 feeds × ~2k sites ≈ 144k rows/d would break the 100k cap; transitions (~5%/hr ESTIMATE) ≈ 2.4k rows/d/feed ≈ 7k/d total. Daily CI static refresh via Actions (~5 min/day ≈ 150 min/mo of the 2,000 min/mo private budget).
- Guards: write-budget counters stop at 80% of KV 1k writes/d and D1 100k rows/d — never approach the hard-fail line. On stop ⇒ cut-to-artifact fallback: serve last-good prebuilt JSON cut + stale-label (S3 stale-SLO), typed UPSTREAM_FAILED per IS-06. Guard failure ⇒ closed rows, never a paid tier (IS-10).

## Open tickets
1. LU second multi-operator DATEX II set (Feb 2026) is "License Not Specified" — clear licence before ingesting anything beyond the CC0 Chargy KML (LEDGER #10).
2. PT Mobi.e DATEX II endpoints (named in OCM #237 body) — licence + access UNVERIFIED; hands-on check before any ingest.
3. OCM self-served /v3/openapi returns 403 without a key — first ingest call must carry the BYOK key.

## Kill-4 re-check (PLAN §1.10)
NAPSPAN proprietary (25 NAPs live, €0/€29/€99/€299 tiers, static-only EV layer 250k+ pts / 36 countries, AFIR-live "on roadmap"; napspan.com observed 2026-09-14) + OCM #237 "Support DATEX II as input source" open/unassigned since 2025-09-24 ⇒ **no trigger**. Re-check at S8.
