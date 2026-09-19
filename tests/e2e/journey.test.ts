/**
 * S7 lightweight e2e (node + vitest, NO Playwright).
 *
 * Decision (S7): the e2e tool is direct `createApp` over
 * `app.request` (no network) plus the MCP `Client` over `InMemoryTransport`
 * and `site/dist` file reads. Reason: free-tier CI carries no browser deps,
 * the seeded S2 fixtures suffice for the journey, and the Worker surfaces
 * are plain request/response — a browser adds no coverage.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createApp } from '../../packages/mcp/worker/index.ts';
import { buildMcpServer, type McpDeps } from '../../packages/mcp/src/server.ts';

const CLOSED_ID = 'OCM:910001';
const OPEN_ID = 'OCM:900000';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site', 'dist');
const readDist = (slug: string): string =>
  readFileSync(slug === 'index' ? join(dist, 'index.html') : join(dist, slug, 'index.html'), 'utf8');

const connectClient = async (deps: McpDeps): Promise<Client> => {
  const server = buildMcpServer(deps);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'e2e-client', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
};

interface ToolText {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}
const parseJson = <T>(res: ToolText): T => JSON.parse(res.content[0]?.text ?? '{}') as T;

describe('e2e journey (lightweight, no browser)', () => {
  it('full journey happy: search → detail → status → reliability → MCP tools → docs dist read', async () => {
    const app = createApp({});
    const search = await app.request('/api/v1/sites?limit=5&offset=0');
    expect(search.status).toBe(200);
    const searchBody = (await search.json()) as { data: Array<{ id: string }> };
    expect(searchBody.data.length).toBe(5);
    const id = searchBody.data[0]?.id ?? OPEN_ID;
    const enc = encodeURIComponent(id);

    const detail = await app.request(`/api/v1/sites/${enc}`);
    expect(detail.status).toBe(200);
    expect(((await detail.json()) as { data: { id: string } }).data.id).toBe(id);

    const status = await app.request(`/api/v1/status/${enc}`);
    expect(status.status).toBe(200);
    expect(((await status.json()) as { data: { id: string } }).data.id).toBe(id);

    const reliability = await app.request(`/api/v1/reliability/${enc}`);
    expect(reliability.status).toBe(200);
    expect(((await reliability.json()) as { data: { id: string } }).data.id).toBe(id);

    const client = await connectClient({ now: Date.now, runtime: 'local' });
    const tools = (await client.listTools()).tools.map((t) => t.name);
    for (const name of ['voltbase_search_sites', 'voltbase_site_detail', 'voltbase_status', 'voltbase_reliability']) {
      expect(tools).toContain(name);
    }
    await client.close();

    expect(readDist('index').toLowerCase()).toContain('voltbase');
  });

  it('closed-id journey answers 404 / NOT_FOUND on every surface', async () => {
    const app = createApp({});
    const enc = encodeURIComponent(CLOSED_ID);
    for (const path of [`/api/v1/sites/${enc}`, `/api/v1/status/${enc}`, `/api/v1/reliability/${enc}`]) {
      const res = await app.request(path);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) as unknown } });
    }
    const client = await connectClient({ now: Date.now, runtime: 'local' });
    for (const tool of ['voltbase_site_detail', 'voltbase_status', 'voltbase_reliability'] as const) {
      const res = (await client.callTool({ name: tool, arguments: { id: CLOSED_ID } })) as unknown as ToolText;
      expect(res.isError).toBe(true);
      expect(parseJson<{ code: string }>(res).code).toBe('NOT_FOUND');
    }
    await client.close();
  });

  it('stale journey flags fixture rows with the 60min SLO reason', async () => {
    const res = await createApp({}).request(`/api/v1/status/${encodeURIComponent(OPEN_ID)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { stale: boolean; staleReason: string } };
    expect(body.data.stale).toBe(true);
    expect(body.data.staleReason).toContain('60min');
  });

  it('MCP search → detail parity with REST', async () => {
    const app = createApp({});
    const rest = (await (await app.request('/api/v1/sites?limit=5&offset=0')).json()) as {
      data: Array<{ id: string }>;
      page: { total: number };
    };
    const client = await connectClient({ now: Date.now, runtime: 'local' });
    const mcp = parseJson<{ data: Array<{ id: string }>; page: { total: number } }>(
      (await client.callTool({ name: 'voltbase_search_sites', arguments: { limit: 5, offset: 0 } })) as unknown as ToolText,
    );
    expect(mcp.page.total).toBe(rest.page.total);
    expect(mcp.data.map((r) => r.id)).toEqual(rest.data.map((r) => r.id));
    const mcpDetail = parseJson<{ data: { id: string } }>(
      (await client.callTool({ name: 'voltbase_site_detail', arguments: { id: OPEN_ID } })) as unknown as ToolText,
    );
    const restDetail = (await (await app.request(`/api/v1/sites/${encodeURIComponent(OPEN_ID)}`)).json()) as {
      data: { id: string };
    };
    expect(mcpDetail.data.id).toBe(restDetail.data.id);
    await client.close();
  });

  it('reliability rollup is served on REST and MCP', async () => {
    const res = await createApp({}).request(`/api/v1/reliability/${encodeURIComponent(OPEN_ID)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; uptime: number } };
    expect(body.data.id).toBe(OPEN_ID);
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(body.data.uptime).toBeLessThanOrEqual(1);
    const client = await connectClient({ now: Date.now, runtime: 'local' });
    const mcp = parseJson<{ data: { id: string; uptime: number } }>(
      (await client.callTool({ name: 'voltbase_reliability', arguments: { id: OPEN_ID } })) as unknown as ToolText,
    );
    expect(mcp.data.id).toBe(OPEN_ID);
    expect(mcp.data.uptime).toBeGreaterThanOrEqual(0);
    await client.close();
  });

  it('docs page links the API reference and MCP onboarding', async () => {
    expect(readDist('index')).toContain('/voltbase/api-reference/');
    expect(readDist('index')).toContain('/voltbase/mcp-onboarding/');
    expect(readDist('api-reference')).toContain('/api/v1/sites');
    expect(readDist('api-reference')).toContain('POST /mcp');
    expect(readDist('mcp-onboarding')).toContain('voltbase_search_sites');
  });
});
