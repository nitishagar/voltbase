# OpenBosch submission packet — ChargeLens depot demo

Submit via: https://innovate-bosch.com/submit/index.html (OpenBosch get-in-touch;
venture-client track: paid first pilot, contact-to-pilot in ~3 weeks).

## Links
- Repo: https://github.com/nitishagar/voltbase (Apache-2.0, public)
- Depot dashboard: https://nitishagar.github.io/voltbase/depot/ (live)
- Depot API: `GET /api/v1/depot/sessions`, `GET /api/v1/depot/faults` on the voltbase Worker (live on next `wrangler deploy` — owner step, CI green; verified locally via app.request + CLI + eval)
- MCP: `POST /mcp` tools `voltbase_depot_sessions`, `voltbase_depot_faults` (same Worker as above)

## What it is (one paragraph for the form)
ChargeLens normalises heterogeneous EV-charger dialects (OCPP 1.6J and 2.0.1)
into one session schema with Wh-canonical energy, composite dedupe keys, and
flagged data-quality edges — served identically over MCP, REST, and CLI, with
a static depot dashboard and a graded MCP eval. Built as an extension of the
open-core voltbase project (licence-gated open data, deterministic adapters,
typed errors). Relevance to Bosch: depot/fleet charging analytics over
heterogeneous charge points, matching Bosch connected-charging and e-mobility
analytics needs; pilot-able against Bosch charger vocabulary without touching
production systems.

## Demo script (90 seconds, for the video)
1. Open the depot dashboard: 4 sessions across 3 chargers, 2 dialects (0:00–0:20).
2. Faults view: cp-16b most-faulted with 2 faults — replayed Stop and rolled
   register shown as flags, never silent (0:20–0:45).
3. Ask the MCP eval: `node scripts/mcp-eval/run.mjs` — 6 graded queries pass,
   including "which charger faulted most" (0:45–1:10).
4. CLI twin: `voltbase depot faults` prints the same rows (1:10–1:30).

## Pilot proposal (for OpenBosch matching)
- Pilot: point the depot normalisers at 1–2 Bosch sample charger vocabularies
  (message samples, not production access); deliver normalised depot analytics
  + dashboard + eval in 4 weeks, fixed scope.
- Buyer fit: connected-charging / fleet analytics teams; e-mobility validation.
- Artifacts: repo + live demo + eval harness + SBOM-friendly exact-pinned deps.

## Timing notes
- OpenBosch rolling intake (no fixed window observed 2026-11-24).
- Depot page/API links go live on the next successful push (Pages + Worker deploys).
- Video: narrated screencast recorded by the owner from the script above (Manual).
