/**
 * S4 MCP server gates (node pool): the ONE `buildMcpServer` factory serves
 * the 4 locked tools over both transports with JSON-in-text results,
 * strict-args, BYOK isolation, S6 reliability rollups on both runtimes (the
 * S4/S5 LOCAL_ONLY stub lane is removed — memory + prebuilt cut serve both),
 * newer-only status polling, and a locked schema contract (IS-04/05/07).
 */
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { TOOL_NAMES, buildMcpServer, type McpDeps } from './server.ts';

const deps = (o: Partial<McpDeps> = {}): McpDeps => ({ now: Date.now, runtime: 'local', ...o });

const connectClient = async (d: McpDeps): Promise<Client> => {
  const server = buildMcpServer(d);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
};

interface ToolText {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}
const parseJson = <T>(res: ToolText): T => JSON.parse(res.content[0]?.text ?? '{}') as T;

describe('search/detail/status happy', () => {
  it('search returns servable rows + page + attribution (IS-04)', async () => {
    const client = await connectClient(deps());
    const res = (await client.callTool({ name: 'voltbase_search_sites', arguments: {} })) as unknown as ToolText;
    expect(res.isError).toBeUndefined();
    const body = parseJson<{ data: Array<{ id: string; attribution: { text: string }; provenance: { retrievedAt: string } }>; page: { total: number }; attribution: Array<{ text: string }> }>(res);
    expect(body.page.total).toBe(35);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.attribution.length).toBeGreaterThan(0);
    for (const row of body.data.slice(0, 3)) {
      expect(row.attribution.text.length).toBeGreaterThan(0);
      expect(row.provenance.retrievedAt.length).toBeGreaterThan(0);
    }
    await client.close();
  });

  it('detail preserves attribution + provenance for a servable id', async () => {
    const client = await connectClient(deps());
    const res = (await client.callTool({ name: 'voltbase_site_detail', arguments: { id: 'OCM:900000' } })) as unknown as ToolText;
    expect(res.isError).toBeUndefined();
    const body = parseJson<{ data: { id: string; attribution: { text: string; url?: string }; provenance: { retrievedAt: string } } }>(res);
    expect(body.data.id).toBe('OCM:900000');
    expect(body.data.attribution.url).toContain('openchargemap');
    await client.close();
  });

  it('status returns stale-labelled live status with attribution', async () => {
    const client = await connectClient(deps());
    const res = (await client.callTool({ name: 'voltbase_status', arguments: { id: 'OCM:900000' } })) as unknown as ToolText;
    expect(res.isError).toBeUndefined();
    const body = parseJson<{ data: { id: string; stale: boolean; staleReason: string; attribution: { text: string } } }>(res);
    expect(body.data.id).toBe('OCM:900000');
    expect(body.data.stale).toBe(true);
    expect(body.data.staleReason).toContain('60min');
    await client.close();
  });

  it('closed ids answer typed NOT_FOUND on detail + status (never a closed signal)', async () => {
    const client = await connectClient(deps());
    for (const tool of ['voltbase_site_detail', 'voltbase_status'] as const) {
      const res = (await client.callTool({ name: tool, arguments: { id: 'OCM:910001' } })) as unknown as ToolText;
      expect(res.isError).toBe(true);
      expect(parseJson<{ code: string }>(res).code).toBe('NOT_FOUND');
    }
    await client.close();
  });
});

describe('reliability rollups (S6, both runtimes)', () => {
  it('serves uptime rollups locally with attribution (no UNAVAILABLE_S6 stub)', async () => {
    const client = await connectClient(deps({ runtime: 'local' }));
    const res = (await client.callTool({ name: 'voltbase_reliability', arguments: { id: 'OCM:900000' } })) as unknown as ToolText;
    expect(res.isError).toBeUndefined();
    const body = parseJson<{
      data: { id: string; uptime: number; transitions: number; stale: boolean; attribution: { text: string } };
    }>(res);
    expect(body.data.id).toBe('OCM:900000');
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(body.data.uptime).toBeLessThanOrEqual(1);
    expect(body.data.attribution.text.length).toBeGreaterThan(0);
    await client.close();
  });

  it('serves the same rollups remotely (LOCAL_ONLY lane removed in S6)', async () => {
    const client = await connectClient(deps({ runtime: 'remote' }));
    const res = (await client.callTool({ name: 'voltbase_reliability', arguments: { id: 'OCM:900000' } })) as unknown as ToolText;
    expect(res.isError).toBeUndefined();
    const body = parseJson<{ data: { id: string; uptime: number } }>(res);
    expect(body.data.id).toBe('OCM:900000');
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
    await client.close();
  });
});

describe('BYOK isolation + strict args + newer-only (IS-05)', () => {
  it('two callers with different keys never cross-read and never echo values', async () => {
    const keyA = 'ocm-key-A-8f3k';
    const keyB = 'ocm-key-B-2q9z';
    const [clientA, clientB] = await Promise.all([connectClient(deps({ ocmKey: keyA })), connectClient(deps({ ocmKey: keyB }))]);
    const [resA, resB] = (await Promise.all([
      clientA.callTool({ name: 'voltbase_search_sites', arguments: { limit: 2 } }),
      clientB.callTool({ name: 'voltbase_search_sites', arguments: { limit: 2 } }),
    ])) as unknown as [ToolText, ToolText];
    expect(parseJson<{ byokConfigured: boolean }>(resA).byokConfigured).toBe(true);
    expect(parseJson<{ byokConfigured: boolean }>(resB).byokConfigured).toBe(true);
    expect(JSON.stringify(resA)).not.toContain(keyA);
    expect(JSON.stringify(resA)).not.toContain(keyB);
    expect(JSON.stringify(resB)).not.toContain(keyA);
    expect(JSON.stringify(resB)).not.toContain(keyB);
    const bare = await connectClient(deps({}));
    const resBare = (await bare.callTool({ name: 'voltbase_search_sites', arguments: { limit: 1 } })) as unknown as ToolText;
    expect(parseJson<{ byokConfigured: boolean }>(resBare).byokConfigured).toBe(false);
    await Promise.all([clientA.close(), clientB.close(), bare.close()]);
  });

  it('rejects malformed bbox + invalid after with typed INVALID_ARGUMENTS', async () => {
    const client = await connectClient(deps());
    const badBox = (await client.callTool({ name: 'voltbase_search_sites', arguments: { bbox: '1,2,3' } })) as unknown as ToolText;
    expect(badBox.isError).toBe(true);
    expect(parseJson<{ code: string }>(badBox).code).toBe('INVALID_ARGUMENTS');
    const badAfter = (await client.callTool({ name: 'voltbase_status', arguments: { id: 'OCM:900000', after: 'not-a-time' } })) as unknown as ToolText;
    expect(badAfter.isError).toBe(true);
    expect(parseJson<{ code: string }>(badAfter).code).toBe('INVALID_ARGUMENTS');
    await client.close();
  });

  it('rejects unknown arguments (strict-args belt-and-braces)', async () => {
    const client = await connectClient(deps());
    let rejected = false;
    try {
      const res = (await client.callTool({
        name: 'voltbase_site_detail',
        arguments: { id: 'OCM:900000', bogus: 1 },
      })) as unknown as ToolText;
      rejected = res.isError === true && parseJson<{ code: string }>(res).code === 'INVALID_ARGUMENTS';
    } catch {
      rejected = true; // SDK wire-level strictObject rejection also counts
    }
    expect(rejected).toBe(true);
    await client.close();
  });

  it('status after= is newer-only: future after ⇒ newer:false, past after ⇒ newer:true', async () => {
    const client = await connectClient(deps());
    const future = (await client.callTool({
      name: 'voltbase_status',
      arguments: { id: 'OCM:900000', after: '2030-01-01T00:00:00.000Z' },
    })) as unknown as ToolText;
    expect(future.isError).toBeUndefined();
    expect(parseJson<{ newer: boolean }>(future).newer).toBe(false);
    const past = (await client.callTool({
      name: 'voltbase_status',
      arguments: { id: 'OCM:900000', after: '2020-01-01T00:00:00.000Z' },
    })) as unknown as ToolText;
    expect(past.isError).toBeUndefined();
    const pastBody = parseJson<{ newer: boolean; data: { id: string } }>(past);
    expect(pastBody.newer).toBe(true);
    expect(pastBody.data.id).toBe('OCM:900000');
    await client.close();
  });
});

describe('schema contract locked (IS-07)', () => {
  it('exposes exactly the 4 locked tool names, identical local vs remote', async () => {
    const local = await connectClient(deps({ runtime: 'local' }));
    const remote = await connectClient(deps({ runtime: 'remote' }));
    const localNames = ((await local.listTools()).tools.map((t) => t.name) as string[]).sort();
    const remoteNames = ((await remote.listTools()).tools.map((t) => t.name) as string[]).sort();
    expect(localNames).toEqual([...TOOL_NAMES].sort());
    expect(remoteNames).toEqual(localNames);
    await Promise.all([local.close(), remote.close()]);
  });

  it('locks input schemas: type object, required ids, strict (no additional props)', async () => {
    const client = await connectClient(deps());
    const tools = (await client.listTools()).tools as unknown as Array<{
      name: string;
      inputSchema: { type: string; required?: string[]; additionalProperties?: boolean };
    }>;
    const byName = new Map(tools.map((t) => [t.name, t]));
    const expectedRequired: Record<string, string[]> = {
      voltbase_search_sites: [],
      voltbase_site_detail: ['id'],
      voltbase_status: ['id'],
      voltbase_reliability: ['id'],
    };
    for (const name of TOOL_NAMES) {
      const tool = byName.get(name);
      expect(tool, name).toBeDefined();
      expect(tool?.inputSchema.type, name).toBe('object');
      expect([...(tool?.inputSchema.required ?? [])].sort(), name).toEqual(expectedRequired[name]);
      expect(tool?.inputSchema.additionalProperties, name).toBe(false);
    }
    await client.close();
  });
});
