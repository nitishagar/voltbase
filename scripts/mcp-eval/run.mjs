// scripts/mcp-eval/run.mjs — graded MCP query eval over the depot corpus.
// Drives the real buildMcpServer over InMemoryTransport (no network) and
// grades scripted queries against golden answers. Exit 0 + graded-pass line
// on success; exit 1 naming the first miss.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildMcpServer } from '../../packages/mcp/src/server.ts';

const deps = { now: () => Date.parse('2026-12-01T00:00:00.000Z'), runtime: 'local' };
const server = buildMcpServer(deps);
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: 'mcp-eval', version: '0.0.0' });
await client.connect(clientTransport);

const text = (res) => JSON.parse(res.content[0]?.text ?? '{}');
const grades = [];
const grade = (name, cond, detail) => {
  grades.push([name, cond]);
  process.stdout.write(`mcp-eval: ${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ` — ${detail}`}\n`);
};

try {
  const sessions = text(await client.callTool({ name: 'voltbase_depot_sessions', arguments: {} }));
  grade('sessions-total-4', sessions.page?.total === 4, JSON.stringify(sessions.page));
  grade(
    'sessions-ids',
    JSON.stringify(sessions.data?.map((r) => r.id).sort()) ===
      JSON.stringify(['OCPP:cp-16a:1008', 'OCPP:cp-16b:1009', 'OCPP:cp-16b:1010', 'OCPP:cp-201:station-tx-1'].sort()),
    JSON.stringify(sessions.data?.map((r) => r.id)),
  );

  const faults = text(await client.callTool({ name: 'voltbase_depot_faults', arguments: {} }));
  grade('faults-total-2', faults.page?.total === 2, JSON.stringify(faults.page));
  grade(
    'faults-top-charger',
    JSON.stringify(faults.counts) === JSON.stringify([{ chargerRef: 'cp-16b', faults: 2 }]),
    JSON.stringify(faults.counts),
  );

  const dialect = text(
    await client.callTool({ name: 'voltbase_depot_sessions', arguments: { dialect: 'ocpp2.0.1' } }),
  );
  grade(
    'dialect-filter-201',
    dialect.page?.total === 1 && dialect.data?.[0]?.id === 'OCPP:cp-201:station-tx-1',
    JSON.stringify(dialect.data?.map((r) => r.id)),
  );

  const energy = text(
    await client.callTool({ name: 'voltbase_depot_sessions', arguments: { chargerRef: 'cp-16b' } }),
  );
  const energies = Object.fromEntries((energy.data ?? []).map((r) => [r.id, r.energyWh]));
  grade(
    'energy-values',
    JSON.stringify(energies) === JSON.stringify({ 'OCPP:cp-16b:1009': 1500, 'OCPP:cp-16b:1010': null }),
    JSON.stringify(energies),
  );
} finally {
  await client.close();
  await server.close().catch(() => {});
}

const failed = grades.filter(([, ok]) => !ok);
if (failed.length > 0) process.exit(1);
process.stdout.write(`mcp-eval: OK all ${grades.length} queries graded pass\n`);
