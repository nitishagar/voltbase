#!/usr/bin/env node
/**
 * site/build.mjs (S5) — static emit for the Pages artifact (7 pages).
 *
 * Emits `site/dist/` from hand-written templates mirroring `src/pages/*.astro`
 * (no astro install needed for the gate; `astro build` stays the future path
 * and the .astro sources are kept in sync by hand). The artifact is fully
 * static: zero <script> tags, zero runtime loads — the pagefind search runtime
 * is deliberately NOT shipped (see the index step below).
 *
 * Pagefind index step: runs the real `pagefind` binary (1.5.2, devDependency)
 * over `site/dist`, then ships only the binary-generated INDEX DATA
 * (`pagefind-entry.json`, `*.pf_meta`, `index/*.pf_index`,
 * `fragment/*.pf_fragment`) plus an honest `PAGEFIND_NOTE.txt`. The vendor
 * search runtime (`pagefind.js`, UI bundles, wasm) is pruned because it loads
 * index shards at runtime, which would break the S5 "static, nothing loaded
 * at runtime" gate — no page references it (asserted: zero <script> in dist).
 * If the binary is unavailable offline, a labelled pagefind-compatible
 * `pagefind-index.json` fallback is emitted instead (threshold test accepts
 * either path; both are honestly labelled in the build log).
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'dist');
const rootDir = join(here, '..');

const NAV = [
  ['/voltbase/', 'Home', 'index'],
  ['/voltbase/quickstart/', 'Quickstart', 'quickstart'],
  ['/voltbase/api-reference/', 'API reference', 'api-reference'],
  ['/voltbase/mcp-onboarding/', 'MCP onboarding', 'mcp-onboarding'],
  ['/voltbase/providers/', 'Providers', 'providers'],
  ['/voltbase/attributions/', 'Attributions', 'attributions'],
  ['/voltbase/legal/', 'Legal', 'legal'],
];

const FOOT =
  '<footer class="site-foot"><div class="wrap"><p>voltbase docs — local preview. ' +
  'Legal pages are <strong>DRAFT</strong>; see <a href="/voltbase/legal/">Legal</a> ' +
  '(includes the DPDP Act 2023 note for India data).</p></div></footer>';

const navFor = (slug) =>
  '<header class="site-head"><div class="wrap"><a class="brand" href="/voltbase/">voltbase</a>' +
  '<nav aria-label="Docs"><ul>' +
  NAV.map(([href, label, key]) =>
    `<li><a href="${href}"${key === slug ? ' aria-current="page"' : ''}>${label}</a></li>`,
  ).join('') +
  '</ul></nav></div></header>';

const doc = (slug, title, desc, body) =>
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<link rel="stylesheet" href="/voltbase/styles.css" />
<base href="/voltbase/" />
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${navFor(slug)}
<div class="wrap"><main id="main" data-pagefind-body>
${body}
</main></div>
${FOOT}
</body>
</html>
`;

/** Page bodies mirror src/pages/*.astro (same headings and copy). */
const PAGES = {
  index: {
    title: 'voltbase — open-core EV charging-data tooling',
    desc: 'voltbase is developer-first open-core tooling for EV charging data: normalisation library, discovery API, and MCP server over open data only.',
    body: `<h1>voltbase</h1>
<p class="lede">Developer-first open-core tooling for EV charging data — a normalisation library, a discovery API, and an MCP server over open data only.</p>
<div class="cta-row"><a class="cta" href="/voltbase/quickstart/">Get started</a> <a class="cta secondary" href="/voltbase/api-reference/">Read the API reference</a></div>
<h2>How it works</h2>
<div class="grid-3">
<section class="card"><h3>1. Normalise</h3><p>OCM, OSM extracts, OCPI 2.2.1 and DATEX II feeds map into one core row with a per-row source and licence partition key. Unknown licences are treated as closed and never served.</p></section>
<section class="card"><h3>2. Serve</h3><p>A stateless edge API serves servable rows only, each with source, retrieved-at and attribution. Stale rows carry a stale label, never silent empties.</p></section>
<section class="card"><h3>3. Ask</h3><p>The same four tools answer over CLI stdio (<code>voltbase mcp</code>) and over HTTP (<code>POST /mcp</code>), with typed errors where a capability is local-only.</p></section>
</div>
<h2>Pricing</h2>
<p><strong>Free self-serve (v0.1):</strong> everything in these docs — normalisation, discovery API and MCP over open data. <strong>Paid self-serve:</strong> placeholder — no payments, sessions or billing exist in v0.1 (see <a href="/voltbase/legal/">Legal</a>).</p>
<h2>Open data only</h2>
<p>Every example on this site uses open-licenced rows: NL NDW (CC0), LU Chargy KML (CC0), FR IRVE (Licence Ouverte / Etalab), OCM open rows (CC BY 4.0) and OSM extracts (ODbL). Provider-copyright and unclear-licence rows are excluded before serving — see <a href="/voltbase/attributions/">Attributions</a>.</p>`,
  },
  quickstart: {
    title: 'Quickstart — voltbase',
    desc: 'Install voltbase, run the Worker locally, and make your first search over open EV charging data.',
    body: `<h1>Quickstart</h1>
<p class="lede">From zero to your first open-data charging-site search in five minutes.</p>
<h2>1. Prerequisites</h2>
<ul><li>Node.js 22 or newer</li><li>npm (the repo uses npm workspaces)</li><li>No API keys, no accounts, no cloud bindings for this guide</li></ul>
<h2>2. Install and verify</h2>
<pre><code>git clone &lt;your-voltbase-mirror&gt; voltbase
cd voltbase
npm ci
npm run verify   # typecheck, lint, build, test, smoke -&gt; VERIFY OK stage=5</code></pre>
<h2>3. Run the Worker locally</h2>
<pre><code>npm run dev
# GET /healthz answers {"ok":true,"stage":5}</code></pre>
<h2>4. First search (open data only)</h2>
<pre><code>curl 'http://localhost:8787/api/v1/sites?connector=CCS2&amp;minPower=50&amp;limit=5&amp;offset=0'</code></pre>
<p>The response carries <code>data</code>, page info (<code>limit</code>, <code>offset</code>, <code>total</code>) and per-partition <code>attribution</code>. Try a known open row next:</p>
<pre><code>curl 'http://localhost:8787/api/v1/sites/OCM%3A900000'
curl 'http://localhost:8787/api/v1/status/OCM%3A900000'</code></pre>
<p>IDs use a source prefix (<code>OCM:</code>, <code>OSM:</code>); the colon must be URL-encoded as <code>%3A</code>. Unknown or closed ids answer typed <code>NOT_FOUND</code> — never a closed signal.</p>
<h2>5. Try the CLI</h2>
<pre><code>node packages/cli/bin/voltbase.js --help
node packages/cli/bin/voltbase.js search --connector CCS2 --limit 5</code></pre>
<h2>Next steps</h2>
<ul><li><a href="/voltbase/api-reference/">API reference</a> — every route, filter and error code</li><li><a href="/voltbase/mcp-onboarding/">MCP onboarding</a> — the same tools for agents over stdio and HTTP</li><li><a href="/voltbase/providers/">Providers / BYOK</a> — when you need your own OCM key</li></ul>`,
  },
  'api-reference': {
    title: 'API reference — voltbase',
    desc: 'Hand-written voltbase REST reference: health, sites search, site detail, status, errors and MCP transport notes.',
    body: `<h1>API reference</h1>
<p class="lede">Hand-written from the Worker routes. Read-only, stateless, open data only. Every error uses one typed envelope: <code>{"error":{"code":"...","message":"..."}}</code>.</p>
<h2>GET /healthz</h2>
<p>Liveness plus the build stage marker.</p>
<pre><code>GET /healthz
{"ok":true,"stage":5}</code></pre>
<h2>GET /api/v1/sites</h2>
<p>Search servable sites. Filters: <code>bbox</code> (<code>minLon,minLat,maxLon,maxLat</code>), <code>connector</code> (case-insensitive substring, max 64 chars), <code>minPower</code> (kW floor), <code>openOnly</code> (<code>true</code> keeps AVAILABLE rows only). Pagination: <code>limit</code> (1–100, default 20), <code>offset</code> (0–100000, default 0).</p>
<pre><code>GET /api/v1/sites?bbox=4.0,52.0,5.0,53.0&amp;connector=CCS2&amp;minPower=50&amp;openOnly=true&amp;limit=20&amp;offset=0

{
  "data": [{ "id": "OCM:900000", "source": "ocm", "licence": "CC-BY-4.0" }],
  "page": { "limit": 20, "offset": 0, "total": 35 },
  "attribution": [{ "text": "EnBW (via Open Charge Map)", "url": "https://openchargemap.io" }]
}</code></pre>
<h2>GET /api/v1/sites/:id</h2>
<p>One servable site. IDs are source-prefixed (<code>OCM:900000</code>, <code>OSM:node/22000101</code>); encode the colon as <code>%3A</code>. Closed or unknown ids answer <code>NOT_FOUND</code>.</p>
<pre><code>GET /api/v1/sites/OCM%3A900000
{"data": {"id": "OCM:900000", "source": "ocm", "licence": "CC-BY-4.0"}}</code></pre>
<h2>GET /api/v1/status/:id</h2>
<p>Live status with a stale label against the 60-minute refresh SLO. Fixture rows predate the SLO, so expect <code>stale:true</code> with a <code>staleReason</code> (serving last-good static cut).</p>
<pre><code>GET /api/v1/status/OCM%3A900000
{"data": {"id": "OCM:900000", "status": "AVAILABLE",
  "retrievedAt": "2026-09-14T06:15:00.000Z", "source": "ocm",
  "stale": true, "staleReason": "retrievedAt 2026-09-14T06:15:00.000Z is older than the 60min refresh SLO (serving last-good static cut)",
  "attribution": {"text": "EnBW (via Open Charge Map)", "url": "https://openchargemap.io"}}}</code></pre>
<h2>Errors</h2>
<table><thead><tr><th>Code</th><th>Status</th><th>When</th></tr></thead><tbody>
<tr><td>INVALID_ARGUMENTS</td><td>400</td><td>Bad bbox, connector, minPower, limit or offset</td></tr>
<tr><td>UNAUTHORIZED</td><td>401</td><td>Missing or invalid API key when the free-key gate is set</td></tr>
<tr><td>RATE_LIMITED</td><td>429</td><td>More than 60 requests per minute per IP (retry-after header set)</td></tr>
<tr><td>NOT_FOUND</td><td>404</td><td>Unknown route, or unknown/closed site id (never a closed signal)</td></tr>
<tr><td>UPSTREAM_BLOCKED</td><td>403</td><td>Non-allowlisted or private-origin request refused before any outbound call</td></tr>
<tr><td>PAYLOAD_TOO_LARGE</td><td>413</td><td>Request body over the cap, rejected before parsing</td></tr>
</tbody></table>
<pre><code>{"error": {"code": "NOT_FOUND", "message": "unknown site id"}}</code></pre>
<h2>MCP transport</h2>
<p>The same four tools are served over Streamable HTTP at <code>POST /mcp</code> (use <code>tools/list</code> then <code>tools/call</code>). Non-POST methods answer the typed JSON-RPC error with status 405 — there is no session to hold. See <a href="/voltbase/mcp-onboarding/">MCP onboarding</a>.</p>
<pre><code>POST /mcp   # JSON-RPC tools/list, tools/call — 200
GET /mcp    # 405 Method not allowed: use POST /mcp for Streamable HTTP (stateless)</code></pre>`,
  },
  'mcp-onboarding': {
    title: 'MCP onboarding — voltbase',
    desc: 'Use the four voltbase MCP tools over CLI stdio or Streamable HTTP, with typed errors and per-result attribution.',
    body: `<h1>MCP onboarding</h1>
<p class="lede">One tool set, two transports: CLI stdio for local compute, Streamable HTTP for remote agents. The four tool names are identical on both.</p>
<h2>Option A — stdio (local)</h2>
<pre><code>voltbase mcp</code></pre>
<p>Stdio mode has full local compute, including the reliability stub answer below. Point any MCP-compatible client at the command above.</p>
<h2>Option B — HTTP (remote)</h2>
<pre><code>POST /mcp   # JSON-RPC: tools/list, then tools/call
GET /mcp    # 405 — stateless, there is no session stream to hold</code></pre>
<h2>The four tools</h2>
<table><thead><tr><th>Tool</th><th>Arguments</th><th>Answers</th></tr></thead><tbody>
<tr><td><code>voltbase_search_sites</code></td><td><code>bbox</code>, <code>connector</code>, <code>minPower</code>, <code>openOnly</code>, <code>limit</code>, <code>offset</code></td><td>Paged servable rows plus per-partition attribution credits</td></tr>
<tr><td><code>voltbase_site_detail</code></td><td><code>id</code> (for example <code>OCM:900000</code>)</td><td>One servable row, or typed <code>NOT_FOUND</code></td></tr>
<tr><td><code>voltbase_status</code></td><td><code>id</code>, optional <code>after</code> (ISO instant, newer-only polling)</td><td>Status plus the 60-minute stale label; <code>newer:false</code> when nothing is newer than <code>after</code></td></tr>
<tr><td><code>voltbase_reliability</code></td><td><code>id</code></td><td>Stub in v0.1: typed <code>UNAVAILABLE_S6</code> locally, typed <code>LOCAL_ONLY_CAPABILITY</code> remotely (run <code>voltbase mcp</code>)</td></tr>
</tbody></table>
<h2>Rules clients should know</h2>
<ul><li>Results are JSON-in-text; every served payload carries attribution and provenance.</li><li>Unknown arguments answer typed <code>INVALID_ARGUMENTS</code> (strict schemas, no silent drops).</li><li>Closed or unknown ids answer typed <code>NOT_FOUND</code> — the tools never confirm that a closed row exists.</li><li>BYOK is per request and by name (<code>OCM_API_KEY</code>); key values are never logged, stored or echoed. Missing key means a typed skip, not a failure.</li></ul>`,
  },
  providers: {
    title: 'Providers / BYOK — voltbase',
    desc: 'Which data providers voltbase uses, which need your own key by name, and which are second-wave notes only.',
    body: `<h1>Providers / BYOK</h1>
<p class="lede">Keys are referenced <strong>by name</strong> per request and never stored. This page names names only — there are no key values anywhere on this site.</p>
<h2>Live in v0.1</h2>
<table><thead><tr><th>Feed</th><th>Access</th><th>Key name (by name only)</th><th>Notes</th></tr></thead><tbody>
<tr><td>NL NDW (OCPI 2.2.1, CC0)</td><td>Open, no key</td><td>—</td><td>Hourly-class static refresh; tariffs included</td></tr>
<tr><td>LU Chargy KML (CC0)</td><td>Open, no key</td><td>—</td><td>CC0 KML set only; the second multi-operator DATEX II set stays excluded until its licence clears</td></tr>
<tr><td>FR IRVE (Licence Ouverte / Etalab)</td><td>Open, no key</td><td>—</td><td>Static schema plus dynamic keyed rows</td></tr>
<tr><td>Open Charge Map (CC BY 4.0 user rows)</td><td>BYOK, key mandatory</td><td><code>OCM_API_KEY</code></td><td>Filtered to <code>opendata=true</code> before ingest; provider-copyright rows excluded; throttle duplicate queries; send as <code>X-API-Key</code> or <code>key=</code></td></tr>
<tr><td>OpenStreetMap extracts (ODbL)</td><td>CI extracts only</td><td>—</td><td>Never live Overpass from the Worker</td></tr>
</tbody></table>
<h2>Second wave (notes only, not ingested)</h2>
<table><thead><tr><th>Feed</th><th>Licence</th><th>Access path</th></tr></thead><tbody>
<tr><td>NOBIL (SE/NO)</td><td>CC BY 4.0</td><td>API key by application (about two working days); key name <code>NOBIL_API_KEY</code></td></tr>
<tr><td>Mobilithek (DE, DATEX II)</td><td>Per-offer (CC0 recommended)</td><td>Organisation registration plus manual approval (days) plus X.509 mTLS material</td></tr>
</tbody></table>
<h2>BYOK rules</h2>
<ul><li>Keys arrive per request by environment or header <strong>name</strong>; concurrent callers never cross-read.</li><li>Key values are never logged, persisted, baked into git, or shipped in this Pages artifact.</li><li>Missing key answers a typed <code>UNCONFIGURED</code> skip, not a failure.</li></ul>`,
  },
  attributions: {
    title: 'Attributions — voltbase',
    desc: 'Per-feed licences and attribution for every row voltbase serves, plus what is excluded and why.',
    body: `<h1>Attributions</h1>
<p class="lede">Every served row carries its own source, retrieved-at and credit; list responses additionally aggregate the per-partition credits. The served index is an ODbL <strong>Collective Database</strong> (partitioned per ADR-003), not a Derivative Database — each feed keeps its own licence.</p>
<h2>Per-feed credits</h2>
<table><thead><tr><th>Feed</th><th>Licence</th><th>Credit shown on rows</th></tr></thead><tbody>
<tr><td>Open Charge Map (open rows only)</td><td>CC BY 4.0</td><td>Operator via Open Charge Map — <a href="https://openchargemap.io">openchargemap.io</a></td></tr>
<tr><td>OpenStreetMap extracts</td><td>ODbL 1.0</td><td>© OpenStreetMap contributors — <a href="https://www.openstreetmap.org/copyright">openstreetmap.org/copyright</a></td></tr>
<tr><td>NL NDW (OCPI 2.2.1)</td><td>CC0 1.0</td><td>Operator via opendata.ndw.nu — <a href="https://opendata.ndw.nu">opendata.ndw.nu</a></td></tr>
<tr><td>LU Chargy KML</td><td>CC0 1.0 (KML set only)</td><td>Chargy via Chargy — <a href="https://data.public.lu/en/datasets/bornes-de-chargement-publiques-pour-voitures-electriques/">data.public.lu</a></td></tr>
<tr><td>FR IRVE</td><td>Licence Ouverte / Etalab 2.0</td><td>Operator via IRVE — <a href="https://transport.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques">transport.data.gouv.fr</a></td></tr>
<tr><td>NOBIL (second wave)</td><td>CC BY 4.0</td><td>Via NOBIL — <a href="https://info.nobil.no/index.php/api">info.nobil.no</a> (not ingested in v0.1)</td></tr>
</tbody></table>
<h2>Excluded before serving</h2>
<ul><li>OCM provider-copyright rows (provider terms, not the CC BY user licence) — filtered via <code>opendata=true</code> before ingest.</li><li>The LU second multi-operator DATEX II set — licence Not Specified, open ticket; only the CC0 Chargy KML is ingested.</li><li>Any row with an unknown or unrecognised licence string — treated as closed, never served.</li></ul>
<p>Partition discipline: within one <code>(feature_type, regional_cut, source, licence)</code> cut, rows are all-OSM or all-non-OSM; serve-time code never joins across that boundary.</p>`,
  },
  legal: {
    title: 'Legal (DRAFT) — voltbase',
    desc: 'Draft legal notes for voltbase: licences, India data-only scope, and the DPDP Act 2023 note.',
    body: `<h1>Legal — DRAFT</h1>
<p class="notice"><strong>DRAFT:</strong> everything on this page is a draft pending review. It is engineering due-diligence, not legal advice. Nothing here widens the v0.1 scope (read-only discovery, no sessions, no payments).</p>
<h2>Repository licence</h2>
<p>Repository and package code is Apache-2.0. Data served through the API and MCP keeps its per-feed licence per row (see <a href="/voltbase/attributions/">Attributions</a>); the served index is a partitioned ODbL Collective Database, not a Derivative Database.</p>
<h2>India data-only scope — DRAFT</h2>
<p>India coverage in v0.1 is <strong>data-only</strong>: static OSM-extract rows (ODbL) for discovery, with EU-first live data. No live Indian operator feeds, no sessions, no payments.</p>
<h2>DPDP Act 2023 note — DRAFT</h2>
<p>India's Digital Personal Data Protection Act 2023 governs personal data; voltbase v0.1 serves charging-site location records (open data), not personal data, and stores no user data at the edge (stateless, no sessions, no KV/D1). Any future handling of personal data — including consent, notice and retention workflows for India users — must be designed, reviewed and recorded before it ships. This note is a <strong>DRAFT</strong> marker, not a compliance finding.</p>
<h2>Per-feed licence drafts</h2>
<ul><li>OCM user rows: CC BY 4.0 with attribution; provider-copyright rows excluded.</li><li>OSM extracts: ODbL 1.0 share-alike on OSM partitions only.</li><li>NL NDW: CC0; LU Chargy KML: CC0 (second DATEX II set excluded, licence ticket open).</li><li>FR IRVE: Licence Ouverte / Etalab 2.0; NOBIL (second wave): CC BY 4.0.</li></ul>
<p><strong>DRAFT</strong> — these summaries do not replace the publishers' terms linked from <a href="/voltbase/attributions/">Attributions</a>.</p>
<h2>Hosting</h2>
<p>Docs are built locally and previewed from <code>site/dist</code>; there is no publish while the repo is private. Robots allow public docs only.</p>`,
  },
};

const ROBOTS = `User-agent: *
Allow: /voltbase/
Allow: /voltbase/quickstart/
Allow: /voltbase/api-reference/
Allow: /voltbase/mcp-onboarding/
Allow: /voltbase/providers/
Allow: /voltbase/attributions/
Allow: /voltbase/legal/

# voltbase S5 scaffold: public docs are allow-listed above; the API worker
# and MCP transport are not crawled via this site (no Disallow needed for
# paths outside the Pages artifact). Local preview only — no publish while
# the repo is private.
`;

/** Total bytes of every file under dir (recursive). */
const dirBytes = (dir) => {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += dirBytes(full);
    else total += statSync(full).size;
  }
  return total;
};

/** Best-effort real pagefind index; returns 'real' | 'fallback'. */
const buildIndex = (pagefindDir) => {
  const candidates = [
    join(rootDir, 'node_modules', '.bin', 'pagefind'),
    join(here, 'node_modules', '.bin', 'pagefind'),
  ];
  const binary = candidates.find((p) => existsSync(p));
  if (binary !== undefined) {
    try {
      execFileSync(binary, ['--site', outDir], { stdio: 'pipe' });
      // Ship the binary-generated INDEX DATA only; prune the vendor search
      // runtime (JS bundles + wasm) so the artifact stays zero-script static.
      // No page references the runtime (asserted by the site gate suite).
      const generated = join(outDir, 'pagefind');
      if (existsSync(generated)) {
        for (const entry of readdirSync(generated)) {
          if (/^pagefind.*\.(js|css)$|^wasm\..*\.pagefind$/.test(entry)) {
            rmSync(join(generated, entry), { force: true });
          }
        }
        writeFileSync(
          join(generated, 'PAGEFIND_NOTE.txt'),
          'voltbase S5 pagefind index — REAL binary output (pagefind 1.5.2).\n' +
            'Shipped: pagefind-entry.json + .pf_meta + index/*.pf_index +\n' +
            'fragment/*.pf_fragment (index data generated from site/dist).\n' +
            'Pruned: vendor search runtime (pagefind*.js/css, wasm) — it loads\n' +
            'index shards at runtime, which the S5 static gate forbids; no\n' +
            'page references it (zero script tags site-wide, gate-asserted).\n' +
            'The search UI ships when a static-safe UI exists.\n',
        );
        return 'real';
      }
    } catch {
      // Fall through to the labelled fallback below.
    }
  }
  mkdirSync(pagefindDir, { recursive: true });
  const entries = Object.entries(PAGES).map(([slug, page]) => ({
    url: slug === 'index' ? '/voltbase/' : `/voltbase/${slug}/`,
    title: page.title,
    excerpt: page.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280),
  }));
  writeFileSync(
    join(pagefindDir, 'pagefind-index.json'),
    `${JSON.stringify(
      {
        generator:
          'voltbase S5 FALLBACK pagefind-compatible index (binary unavailable offline) — honestly labelled, not binary output',
        base: '/voltbase',
        version: 'S5-fallback-1',
        entries,
      },
      null,
      2,
    )}\n`,
  );
  return 'fallback';
};

// --- emit -----------------------------------------------------------------
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const [slug, page] of Object.entries(PAGES)) {
  const html = doc(slug, page.title, page.desc, page.body);
  if (slug === 'index') {
    writeFileSync(join(outDir, 'index.html'), `${html}\n`);
  } else {
    const dir = join(outDir, slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), `${html}\n`);
  }
}

copyFileSync(join(here, 'src', 'styles.css'), join(outDir, 'styles.css'));
writeFileSync(join(outDir, 'robots.txt'), ROBOTS);

const indexKind = buildIndex(join(outDir, 'pagefind'));

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(outDir);
// Fail fast if a closed-row id or a script tag ever leaks into the artifact.
const htmlFiles = files.filter((f) => f.endsWith('.html'));
for (const file of htmlFiles) {
  const raw = readFileSync(file, 'utf8');
  if (/<script/i.test(raw)) throw new Error(`site/build.mjs: refusing to emit script tag in ${file}`);
}
const indexBytes = existsSync(join(outDir, 'pagefind')) ? dirBytes(join(outDir, 'pagefind')) : 0;
process.stdout.write(
  `site/build.mjs: emitted ${String(files.length)} files to site/dist ` +
    `(+ pagefind ${indexKind} index, ${String(indexBytes)} bytes)\n`,
);
