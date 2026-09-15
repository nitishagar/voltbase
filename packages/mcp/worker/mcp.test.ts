/**
 * S4 Worker MCP gateway gates (node pool): `POST /mcp` serves the same 4
 * locked tools statelessly over Streamable HTTP; `GET /mcp` answers the
 * typed 405 JSON-RPC protocol error; CORS + security + request-id headers
 * match the S3 surface.
 */
import { describe, expect, it } from 'vitest';
import { createApp } from './index.ts';

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
  Host: 'localhost',
};

const postMcp = (body: unknown, headers: Record<string, string> = {}): Promise<Response> =>
  Promise.resolve(
    createApp({}).request('/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...headers },
      body: JSON.stringify(body),
    }),
  );

describe('POST /mcp stateless gateway', () => {
  it('answers tools/list 200 with the 4 locked tools (same set as stdio)', async () => {
    const res = await postMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    expect(res.status).toBe(200);
    const text = await res.text();
    for (const name of ['voltbase_search_sites', 'voltbase_site_detail', 'voltbase_status', 'voltbase_reliability']) {
      expect(text).toContain(name);
    }
  });

  it('serves tools/call search with attribution + request-id + CORS', async () => {
    const res = await postMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'voltbase_search_sites', arguments: { limit: 2 } },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    const text = await res.text();
    expect(text).toContain('attribution');
    expect(text).toContain('NL-NDW');
  });

  it('never echoes a BYOK value in MCP responses (IS-05)', async () => {
    const sentinel = 'ocm-sentinel-mcp-7q2w';
    const res = await postMcp(
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'voltbase_search_sites', arguments: { limit: 1 } } },
      { 'x-ocm-key': sentinel },
    );
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain(sentinel);
  });
});

describe('GET /mcp + preflight', () => {
  it('answers GET /mcp with the typed 405 JSON-RPC protocol error', async () => {
    const res = await createApp({}).request('/mcp');
    expect(res.status).toBe(405);
    const body = (await res.json()) as { jsonrpc: string; id: null; error: { code: number; message: string } };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBeNull();
    expect(body.error.code).toBe(-32000);
    expect(body.error.message).toContain('POST /mcp');
  });

  it('answers CORS preflight on /mcp without a key', async () => {
    const app = createApp({ VOLTBASE_API_KEY: 'free-key-1' });
    const res = await app.request('/mcp', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
