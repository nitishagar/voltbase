import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/** S4 CLI gates (plain node): `voltbase mcp --help`/stdio + search/detail/status passthroughs. */
describe('CLI mcp help + passthroughs', () => {
  it('voltbase mcp --help exits 0 and mentions stdio', () => {
    const res = spawnSync('node', ['packages/cli/bin/voltbase.js', 'mcp', '--help'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(`${res.stdout ?? ''}`.toLowerCase()).toContain('stdio');
  });

  it('voltbase search prints JSON rows + attribution', () => {
    const res = spawnSync('node', ['packages/cli/bin/voltbase.js', 'search', '--limit', '2'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    const body = JSON.parse(res.stdout);
    expect(body.data).toHaveLength(2);
    expect(body.attribution.length).toBeGreaterThan(0);
  });

  it('voltbase detail/status serve OCM:900000; closed ids exit 1', () => {
    const detail = spawnSync('node', ['packages/cli/bin/voltbase.js', 'detail', 'OCM:900000'], { encoding: 'utf8' });
    expect(detail.status).toBe(0);
    expect(JSON.parse(detail.stdout).data.id).toBe('OCM:900000');
    const status = spawnSync('node', ['packages/cli/bin/voltbase.js', 'status', 'OCM:900000'], { encoding: 'utf8' });
    expect(status.status).toBe(0);
    expect(JSON.parse(status.stdout).data.id).toBe('OCM:900000');
    const closed = spawnSync('node', ['packages/cli/bin/voltbase.js', 'detail', 'OCM:910001'], { encoding: 'utf8' });
    expect(closed.status).toBe(1);
  });
});

describe('CLI stdio MCP parity', () => {
  it('stdio tools/list exposes the same 4 locked tools as POST /mcp', async () => {
    const transport = new StdioClientTransport({ command: 'node', args: ['packages/cli/bin/voltbase.js', 'mcp'] });
    const client = new Client({ name: 'cli-smoke', version: '0.0.0' });
    await client.connect(transport);
    try {
      const names = (await client.listTools()).tools.map((t) => t.name).sort();
      expect(names).toEqual(
        ['voltbase_reliability', 'voltbase_search_sites', 'voltbase_site_detail', 'voltbase_status'].sort(),
      );
    } finally {
      await client.close();
    }
  }, 15000);
});
