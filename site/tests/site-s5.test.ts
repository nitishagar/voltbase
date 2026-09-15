import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const SLUGS = ['index', 'quickstart', 'api-reference', 'mcp-onboarding', 'providers', 'attributions', 'legal'];

const htmlPath = (slug: string): string =>
  slug === 'index' ? join(dist, 'index.html') : join(dist, slug, 'index.html');
const readHtml = (slug: string): string => readFileSync(htmlPath(slug), 'utf8');
const allHtml = (): string => SLUGS.map(readHtml).join('\n');

/** Total bytes of every file under dir (recursive). */
const dirBytes = (dir: string): number => {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(full) : statSync(full).size;
  }
  return total;
};

/** Closed-row ids from the S2 fixtures (api.test.ts CLOSED_IDS) — must never appear in dist. */
const CLOSED_IDS = ['OCM:910001', 'DATEX2:LU-2ND-001', 'DATEX2:FR-UNK-001', 'OCM:920001', 'OCM:920002'];
const CLOSED_NAMES = ['Proprietary Netz', 'Delhi Discom', 'Fleet Operator Pvt Ltd', 'Multi-Operator Pool'];

describe('site S5 gates', () => {
  it('build emits index.html plus one html file per page (7 pages)', () => {
    for (const slug of SLUGS) {
      expect(existsSync(htmlPath(slug)), `missing ${slug}`).toBe(true);
      const html = readHtml(slug);
      expect(html.toLowerCase()).toContain('voltbase');
      expect(html).toContain('data-pagefind-body');
      expect(html).toMatch(/<h1[^>]*>/);
    }
  });

  it('single hand-written stylesheet exists and is linked from every page', () => {
    const css = join(dist, 'styles.css');
    expect(existsSync(css)).toBe(true);
    expect(readFileSync(css, 'utf8')).toContain(':root');
    for (const slug of SLUGS) {
      expect(readHtml(slug)).toContain('/voltbase/styles.css');
    }
  });

  it('pagefind index exists and clears the threshold (real binary data or labelled fallback)', () => {
    const pagefindDir = join(dist, 'pagefind');
    expect(existsSync(pagefindDir)).toBe(true);
    const bytes = dirBytes(pagefindDir);
    const entryJson = join(pagefindDir, 'pagefind-entry.json');
    const fallbackJson = join(pagefindDir, 'pagefind-index.json');
    if (existsSync(entryJson)) {
      // Real pagefind 1.5.2 output: 7 indexed pages + fragment per page.
      const entry = JSON.parse(readFileSync(entryJson, 'utf8')) as {
        languages: Record<string, { page_count: number }>;
      };
      const counts = Object.values(entry.languages).map((l) => l.page_count);
      expect(Math.max(...counts)).toBeGreaterThanOrEqual(7);
      expect(bytes).toBeGreaterThanOrEqual(8192);
    } else {
      // Honestly labelled fallback (binary unavailable offline).
      expect(existsSync(fallbackJson)).toBe(true);
      const fallback = JSON.parse(readFileSync(fallbackJson, 'utf8')) as {
        generator: string;
        entries: unknown[];
      };
      expect(fallback.generator).toMatch(/fallback/i);
      expect(fallback.entries.length).toBeGreaterThanOrEqual(7);
      expect(bytes).toBeGreaterThanOrEqual(2048);
    }
  });

  it('no closed or non-public rows leak into dist (ids, names, closed licences)', () => {
    const html = allHtml();
    for (const id of CLOSED_IDS) expect(html).not.toContain(id);
    for (const name of CLOSED_NAMES) expect(html).not.toContain(name);
    expect(html).not.toContain('providerCopyrighted');
    expect(html).not.toMatch(/licence["']?\s*:\s*["']?(CLOSED|UNKNOWN)/i);
  });

  it('only open licences are served (open tokens present end to end)', () => {
    const html = allHtml();
    for (const token of ['CC0', 'ODbL', 'Etalab', 'CC BY 4.0']) {
      expect(html).toContain(token);
    }
  });

  it('every internal link resolves to a dist file; external hosts are attribution-allowlisted', () => {
    const allowHosts = new Set([
      'openchargemap.io',
      'www.openstreetmap.org',
      'opendata.ndw.nu',
      'data.public.lu',
      'transport.data.gouv.fr',
      'info.nobil.no',
    ]);
    const resolveTarget = (pageSlug: string, raw: string): string | null => {
      if (raw === '' || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('data:')) {
        return null;
      }
      if (/^https?:\/\//i.test(raw)) {
        const host = new URL(raw).hostname;
        expect(allowHosts.has(host), `non-allowlisted external host ${host}`).toBe(true);
        return null;
      }
      const path = raw.split('#')[0]?.split('?')[0] ?? '';
      if (path === '' || path === '/voltbase' || path === '/voltbase/') return join(dist, 'index.html');
      if (path.startsWith('/voltbase/')) {
        const rest = path.slice('/voltbase/'.length);
        if (rest === '') return join(dist, 'index.html');
        if (rest.endsWith('/')) return join(dist, rest, 'index.html');
        return join(dist, rest);
      }
      // Relative link: resolve against the page directory.
      const base = pageSlug === 'index' ? dist : join(dist, pageSlug);
      return join(base, path);
    };
    for (const slug of SLUGS) {
      const html = readHtml(slug);
      const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1] ?? '');
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        const target = resolveTarget(slug, href);
        if (target !== null) expect(existsSync(target), `${slug}: ${href} -> missing`).toBe(true);
      }
    }
  });

  it('legal DRAFT markers present, including the DPDP Act 2023 India-data note', () => {
    const html = allHtml();
    expect(html).toContain('DRAFT');
    expect(html).toContain('DPDP Act 2023');
    expect(readHtml('legal')).toContain('data-only');
  });

  it('robots.txt allows the public docs (no blanket disallow)', () => {
    const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
    expect(robots).toMatch(/Allow:/);
    expect(robots).toContain('/voltbase/');
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  it('artifact is static: zero script tags, no runtime loads in html/css', () => {
    for (const slug of SLUGS) {
      const html = readHtml(slug);
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toContain('fetch(');
    }
    const css = readFileSync(join(dist, 'styles.css'), 'utf8');
    expect(css).not.toContain('fetch(');
  });

  it('BYOK is names-only: key names present, no key values or secret shapes', () => {
    const html = allHtml();
    expect(html).toContain('OCM_API_KEY');
    expect(html).toContain('NOBIL_API_KEY');
    expect(html).not.toMatch(/(OCM_API_KEY|NOBIL_API_KEY)\s*=\s*['"]?[A-Za-z0-9]/);
    expect(html).not.toMatch(/ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|sk-(live|test)-[A-Za-z0-9]{16,}/);
    expect(html).not.toContain('BEGIN PRIVATE KEY');
  });

  it('api-reference snippets match the contract-tested Worker routes', () => {
    const ref = readHtml('api-reference');
    for (const token of [
      '/api/v1/sites',
      'OCM:900000',
      'OSM:node/22000101',
      'staleReason',
      'NOT_FOUND',
      'INVALID_ARGUMENTS',
      'RATE_LIMITED',
      'tools/list',
      'POST /mcp',
      'GET /mcp',
      '"stage":5',
      'limit',
      'offset',
    ]) {
      expect(ref, `api-reference missing ${token}`).toContain(token);
    }
  });

  it('mcp-onboarding names the four locked tools with their typed errors', () => {
    const page = readHtml('mcp-onboarding');
    for (const token of [
      'voltbase_search_sites',
      'voltbase_site_detail',
      'voltbase_status',
      'voltbase_reliability',
      'voltbase mcp',
      'UNAVAILABLE_S6',
      'LOCAL_ONLY_CAPABILITY',
    ]) {
      expect(page, `mcp-onboarding missing ${token}`).toContain(token);
    }
  });
});
