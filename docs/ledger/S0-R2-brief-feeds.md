# S0-R2 brief — services/feeds/licences

Role: researcher. Sequential only (ratelimit — no parallel agents).
Scale: large. No code, no commits, no remotes, no secrets, no API keys (BYOK names only).

## Inputs (absolute paths — thoughts/ lives outside the repo)
- `/home/nitish/Documents/personal-development/thoughts/shared/research/2026-09-14-voltbase-open-core-ev-data-tooling.md` (esp. Follow-ups §B/C/E/G + pass-8 §)
- `/home/nitish/Documents/personal-development/thoughts/shared/plans/2026-09-14-voltbase/PLAN.md` (S0.4, §3 cost model)
- `/home/nitish/Documents/personal-development/thoughts/shared/plans/2026-09-14-voltbase/IMPLICIT_SPEC.md` (IS-03, IS-05, IS-06)
- Sibling report: `/home/nitish/repos/learn/voltbase/docs/research/frameworks.md`

## Tasks
1. Services/feeds table → `docs/research/feeds.md`: OCM (`opendata=true`, API key mandatory → BYOK name only, `modifiedsince` deltas, duplicate-query throttle), OSM (ODbL; Geofabrik/planet extracts in CI, NEVER live Overpass from Worker — public instance ~100 queries/10 MB per day for regular apps), 2–3 AFIR NAP feeds with per-dataset licence + access facts. Evidence-ranked candidates: NL NDW (no key, OCPI 2.2.1 JSON ~17 MB gz + GeoJSON + tariffs, live; CC0 by ndw.nu/copyright site-wide — record dataset page states nothing contrary) → LU data.public.lu (CC0 Chargy KML 5-min ONLY; second multi-operator DATEX II set is "License Not Specified" — DO NOT clear it here, record as ADR-002 ticket) → FR transport.data.gouv.fr IRVE (Etalab open, static nightly + dynamic real-time). DE Mobilithek (registration + per-offer licence + mTLS) and SE/NO NOBIL (key-gated, CC BY) are second-wave. Each row: URL + observed date or UNVERIFIED.
2. `docs/free-tier-limits.md`: Workers/KV/D1/R2/Pages/Actions rows with source URL + observed date + estimated use at 1k/10k users (ESTIMATE-marked). Include: 5 crons/account, 6 concurrent outbound/req, 50 subrequests/inv, 64 MiB uncompressed (no compressed cap — 3 MB cap removed 2026-09-04), D1 hard-fail since 2026-09-01, Pages public-only on Free (GitHub Pages — NOT Cloudflare Pages), Actions 2000 min/mo while private.
3. Cost-model inputs for architect: max feeds × poll cadence × normalise CPU ≤ 10ms/req p50; fan-out ≤ 6 concurrent + ≤ 50 subrequests per cron; ≤ 5 crons; KV 1k writes/d + D1 100k rows write/d guards. Comment on W1 (AFIR per-minute naive polling vs write caps).
4. OCM #237 (DATEX II ingest, open) vs #245 (OCPI onboarding, separate) — do not confuse. NAPSPAN proprietary (€29–299, AFIR-live roadmap) — kill-4 no trigger, re-check at S8.

## Return contract (STRICT)
Two files: `docs/research/feeds.md` + `docs/free-tier-limits.md`. Raw data, not prose: tables + one line per fact `source (observed YYYY-MM-DD)` or UNVERIFIED. Estimates marked ESTIMATE. Hard cap: 120 lines total. Do NOT commit. Do NOT touch LEDGER.md. Reply with paths + feed order + any UNVERIFIED rows in ≤15 lines.
