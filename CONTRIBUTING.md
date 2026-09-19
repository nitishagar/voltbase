# Contributing to voltbase

Thanks for looking at voltbase — developer-first open-core tooling for EV
charging data over open data only (OCM open rows, OSM extracts, AFIR NAP
feeds). Apache-2.0; all served rows keep their per-feed licence and
attribution.

## Development

Requires Node >= 22 and npm.

```bash
npm install
npm run verify   # typecheck, lint, build, test, smoke -> VERIFY OK stage=8
npm test         # full suite (node + workerd pools, site artifact gates)
npx vitest run site/tests/site-s5.test.ts   # a single test file
npx vitest run site/tests/site-s5.test.ts -t 'sitemap'   # a single test
```

The site artifact gates assert the BUILT `site/dist` — run `npm run build`
first (the site suite fails fast with a reminder if `dist` is missing).

## Rules

- Exact-pinned dependencies only (no `^`/`~`); the release gate fails on
  non-exact pins.
- No secrets in git: keys are referenced by NAME per request (BYOK) and are
  never logged, stored, or committed. `.dev.vars` is gitignored.
- Zero `<script>` in the docs artifact and no runtime fetches from Pages —
  the build throws and the gates assert.
- Commits: plain subject lines, no co-author or generated-with trailers.
- New served rows must carry source, licence and attribution; unknown
  licences are treated as closed and never served (see
  [docs/adr/ADR-003-licence-boundary.md](docs/adr/ADR-003-licence-boundary.md)).

## Pull requests

CI runs typecheck, lint, build, test and smoke (including the banned-content
scan) on every push; master requires all five checks. Keep the change
smallest that satisfies the fix, and add or extend gates for any new
behavior.
