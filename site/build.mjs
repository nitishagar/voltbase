#!/usr/bin/env node
/**
 * site/build.mjs (S1) — static emit for the Pages artifact.
 *
 * Emits `site/dist/index.html` from a hand-written template (no astro install
 * needed for the S1 gate; astro 7.3.2 stays pinned in site/package.json for
 * the S5 docs build). The contract test asserts on `site/dist`, so S5 can
 * swap this file for `astro build` without touching the gates.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'dist');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>voltbase — open-core EV charging-data tooling</title>
<base href="/voltbase/" />
</head>
<body>
<main>
<h1>voltbase</h1>
<p>Developer-first open-core tooling for EV charging data: normalisation library, discovery API, and MCP server over open data only.</p>
<p>S1 scaffold: docs site shell. Full guides land in S5.</p>
</main>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), `${html}\n`);
process.stdout.write(`site/build.mjs: emitted ${join('site', 'dist', 'index.html')}\n`);
