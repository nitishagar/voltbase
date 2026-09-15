# ADR-003 — Licence boundary: ODbL Collective, partitioned (S0 decision, 2026-09-14)
WHAT: the served voltbase index is an ODbL **Collective Database** (partitioned), NOT a Derivative Database published under ODbL. Repo/package licence stays Apache-2.0 (IS-01); ODbL obligations attach only to partitions holding OSM rows.

## OSMF tests applied (re-pinned 2026-09-14 — closes the feeds.md §2 UNVERIFIED row)
Source: OSMF Collective Database Guideline, osmfoundation.org/wiki/Licence/Community_Guidelines/Collective_Database_Guideline_Guideline (board-endorsed 2016-06-17; observed 2026-09-14):
1. OSM and non-OSM datasets "do not reference each other" — no shared IDs, database keys, or "any other method of identifying" specific elements; performance-oriented joins count as references; physical separation is NOT required.
2. Per feature type within a regional cut, the data is "either all OSM or all non-OSM" — the non-OSM data either completely replaces a type in the cut (guideline example: all OSM highway=motorway replaced) or adds a type "not already present" containing no OSM data; property-level rule is all-or-no-OSM per property of a primary feature per cut; combinations are allowed.

## Partitioning for S2 (WHAT, not HOW)
- Every row carries partition key `(feature_type, regional_cut, source, licence)`; v0.1 regional cuts are country-level (coarse and defensible).
- Within a `(feature_type, regional_cut)` partition, rows are all-OSM or all-non-OSM — mixing inside a partition re-classifies the index as a Derivative Database ⇒ the whole index falls under ODbL share-alike.
- Serve-time (S3 API + S4 MCP) must not construct cross-partition joins or cross-referenced views between OSM and non-OSM rows (test 1). Attribution preserved per partition (IS-03/IS-04).
- Unknown licence ⇒ row treated as closed, never served; OCM provider-copyright rows excluded via `opendata=true` before ingest.

## WHY Collective over Derivative
A Derivative classification would impose ODbL share-alike on the merged whole — propagating onto NL CC0 / FR Etalab / OCM CC BY rows and conflicting with their per-feed attribution terms. Collective keeps each feed's licence intact at partition level. Trade-off accepted: partition discipline is a hard schema constraint from S2 onward; violating it is a licence incident, not a refactor.
Residual risk: engineering due-diligence, not legal advice; guideline wording verified 2026-09-14, but regional-cut granularity is a judgement call — kept coarse and recorded in the partition keys.
