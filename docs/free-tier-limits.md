# Free-tier limits — raw data (observed 2026-09-14)
Scope: GitHub Pages (NOT Cloudflare Pages). All use columns ESTIMATE.

| service | free cap | source (observed) | ESTIMATE use 1k / 10k users |
|---|---|---|---|
| Workers req | 100k req/day | https://developers.cloudflare.com/workers/platform/limits/ (observed 2026-09-14) | 1k×10/d=10k OK; 10k×10/d=100k AT CAP — ESTIMATE |
| Workers CPU | 10ms/req; cron 10ms | same (observed 2026-09-14) | normalise ≤10ms p50 — ESTIMATE |
| Workers subreq | 50/invocation | same (observed 2026-09-14) | fan-out ≤50 fetches/cron — ESTIMATE |
| Workers concurrent | 6 simultaneous outbound/req | same (observed 2026-09-14) | fan-out ≤6 concurrent — ESTIMATE |
| Workers crons | 5/account (paid 250) | same (observed 2026-09-14) | ≤5 pollers total — ESTIMATE |
| Workers size | 64 MiB uncompressed; NO compressed cap (3/10MB removed 2026-09-04) | https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/ (observed 2026-09-14) | 1.5MB gzip self-budget = cold-start choice — ESTIMATE |
| KV | 100k reads/d; 1k writes/d diff keys; 1GB; 25MiB value | https://developers.cloudflare.com/kv/platform/limits/ (observed 2026-09-14) | per-min polling breaks 1k writes — ESTIMATE (W1) |
| D1 | 5M rows read/d; 100k written/d; 5GB; 500MB/DB; 10 DBs; 50 q/inv; HARD-FAIL past caps since 2026-09-01 | https://developers.cloudflare.com/d1/platform/pricing/ + https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/ (observed 2026-09-14) | same W1 guard — ESTIMATE |
| R2 | 10GB-mo; 1M-A/10M-B ops/mo; egress free (Standard) | https://developers.cloudflare.com/r2/pricing/ (observed 2026-09-14) | extracts/fixtures only in v0.1 — ESTIMATE |
| Pages (GitHub) | 1GB published; 10-min timeout; soft 100GB/mo BW; soft 10 builds/h (custom Actions unaffected); Free = public repos only | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits + plans (observed 2026-09-14) | static docs fits — ESTIMATE |
| Actions | 2000 min/mo + 500MB artefacts while private; unmetered standard runners once public | https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions (observed 2026-09-14) | ~5min/run ⇒ ~400 runs/mo while private — ESTIMATE |

Notes
- D1 breach ⇒ binding/REST errors until midnight UTC + email alert. source changelog 2026-09-01 (observed 2026-09-14)
- Pages private publishing needs paid/Enterprise; Free must be public. source docs.github.com (observed 2026-09-14)
- Cloudflare Pages limits NOT applicable (different product) — excluded by scope.
