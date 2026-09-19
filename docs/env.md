# voltbase — environment variable NAMES only (BYOK; S0, 2026-09-14)
This file contains ZERO secret values — names only. Keys are read per request by NAME from env/header, never logged, persisted, baked into git, or shipped in the Pages artifact or npm `dist/` (IS-05). `.dev.vars` is gitignored; remote secrets go in via `wrangler secret` at S13 only. A missing key ⇒ the tool payload flags `byokConfigured: false` (a graceful skip), never a failure.

| NAME | Purpose | Consumer |
|---|---|---|
| OCM_API_KEY | Open Charge Map API key (mandatory; `opendata=true` rows only) | Worker + CLI, per request |
| CLOUDFLARE_API_TOKEN | Workers deploy (S13 only) | wrangler (CI/local) |
| CLOUDFLARE_ACCOUNT_ID | Workers deploy (S13 only) | wrangler |
| GITHUB_TOKEN | Pages deploy on public flip (S13) | Actions |

Second-wave names (NOT set until their ADR-002 tickets clear): `NOBIL_API_KEY` (SE/NO), Mobilithek mTLS material (DE; name fixed at onboarding).
