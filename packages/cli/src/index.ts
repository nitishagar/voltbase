/**
 * `@voltbase/cli` (S4) — `voltbase mcp` stdio + minimal search/detail/status
 * passthroughs over the same `buildMcpServer` factory (IS-07).
 *
 * No KV/D1; no fetch in v0.1 (fixture index only); BYOK (`OCM_API_KEY`) is
 * read per invocation from the environment and never logged or echoed.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  buildMcpServer,
  filterSites,
  findServableById,
  resultAttribution,
  staleInfo,
  type McpDeps,
} from '@voltbase/mcp';

export const CLI_PACKAGE = '@voltbase/cli';

export const CLI_USAGE = `voltbase — open-core EV charging-data tooling.

Usage:
  voltbase <command> [flags]

Commands:
  mcp                  MCP server over stdio (same 4 tools as POST /mcp)
  search               Search servable sites (JSON to stdout)
  detail <id>          Site detail for one id (JSON to stdout)
  status <id>          Live status for one id (JSON to stdout)

Global flags:
  --help, -h           Usage for voltbase (exit 0)
`;

export const MCP_USAGE = `voltbase mcp — MCP server over stdio.

Usage:
  voltbase mcp [--help]

Starts the voltbase MCP server on stdio (same buildMcpServer factory as
POST /mcp: voltbase_search_sites, voltbase_site_detail, voltbase_status,
voltbase_reliability rollups). Stdout carries JSON-RPC frames only; the ready
note goes to stderr. Piped EOF / SIGINT stops the server.

Flags:
  --help, -h           Usage for voltbase mcp (exit 0)
`;

/** Local (stdio) composition: per-invocation BYOK from the environment. */
export const localMcpDeps = (env: NodeJS.ProcessEnv = process.env): McpDeps => ({
  now: Date.now,
  ocmKey: env['OCM_API_KEY'] === '' ? undefined : env['OCM_API_KEY'],
  runtime: 'local',
});

export interface CliIo {
  out: (text: string) => void;
  err: (text: string) => void;
}

const defaultIo = (): CliIo => ({
  out: (text: string): void => {
    process.stdout.write(text);
  },
  err: (text: string): void => {
    process.stderr.write(text);
  },
});

const parseFlag = (argv: readonly string[], name: string): string | undefined => {
  const prefixed = `--${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    if (arg.startsWith(prefixed)) return arg.slice(prefixed.length);
    if (arg === `--${name}`) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) return next;
      return '';
    }
  }
  return undefined;
};

const hasFlag = (argv: readonly string[], name: string): boolean => argv.includes(`--${name}`);

const runSearch = (argv: readonly string[], io: CliIo): number => {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.out('Usage: voltbase search [--bbox minLon,minLat,maxLon,maxLat] [--connector NAME] [--minPower KW] [--openOnly] [--limit N] [--offset N]\n');
    return 0;
  }
  const bboxRaw = parseFlag(argv, 'bbox');
  let bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number } | undefined;
  if (bboxRaw !== undefined && bboxRaw !== '') {
    const parts = bboxRaw.split(',').map((p) => Number(p.trim()));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      io.err('error: bbox must be four finite numbers: minLon,minLat,maxLon,maxLat\n');
      return 2;
    }
    const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
    if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90 || minLon > maxLon || minLat > maxLat) {
      io.err('error: bbox out of range (lon ±180, lat ±90) or min exceeds max\n');
      return 2;
    }
    bbox = { minLon, minLat, maxLon, maxLat };
  }
  const connector = parseFlag(argv, 'connector');
  const minPowerRaw = parseFlag(argv, 'minPower');
  let minPower: number | undefined;
  if (minPowerRaw !== undefined && minPowerRaw !== '') {
    minPower = Number(minPowerRaw);
    if (!Number.isFinite(minPower) || minPower < 0 || minPower > 2000) {
      io.err('error: minPower must be within 0..2000\n');
      return 2;
    }
  }
  const limitRaw = parseFlag(argv, 'limit');
  const offsetRaw = parseFlag(argv, 'offset');
  const limit = limitRaw === undefined || limitRaw === '' ? 20 : Number(limitRaw);
  const offset = offsetRaw === undefined || offsetRaw === '' ? 0 : Number(offsetRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    io.err('error: limit must be an integer between 1 and 100\n');
    return 2;
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 100_000) {
    io.err('error: offset must be an integer between 0 and 100000\n');
    return 2;
  }
  const filtered = filterSites({
    ...(bbox === undefined ? {} : { bbox }),
    ...(connector === undefined || connector === '' ? {} : { connector }),
    ...(minPower === undefined ? {} : { minPower }),
    openOnly: hasFlag(argv, 'openOnly'),
  });
  const data = filtered.slice(offset, offset + limit);
  io.out(`${JSON.stringify({ data, page: { limit, offset, total: filtered.length }, attribution: resultAttribution(data) })}\n`);
  return 0;
};

const runDetail = (argv: readonly string[], io: CliIo): number => {
  const id = argv[0];
  if (id === undefined || id === '--help' || id === '-h' || id === '') {
    io.out('Usage: voltbase detail <id>\n');
    return id === undefined ? 2 : 0;
  }
  const site = findServableById(id);
  if (site === undefined) {
    io.err('error: unknown site id\n');
    return 1;
  }
  io.out(`${JSON.stringify({ data: site })}\n`);
  return 0;
};

const runStatus = (argv: readonly string[], io: CliIo): number => {
  const id = argv[0];
  if (id === undefined || id === '--help' || id === '-h' || id === '') {
    io.out('Usage: voltbase status <id> [--after ISO-INSTANT]\n');
    return id === undefined ? 2 : 0;
  }
  const site = findServableById(id);
  if (site === undefined) {
    io.err('error: unknown site id\n');
    return 1;
  }
  const after = parseFlag(argv, 'after');
  if (after !== undefined && after !== '' && Number.isNaN(Date.parse(after))) {
    io.err('error: after must be an ISO-8601 instant\n');
    return 2;
  }
  const info = staleInfo(site.provenance.retrievedAt, Date.now());
  io.out(
    `${JSON.stringify({
      data: {
        id: site.id,
        status: site.status,
        retrievedAt: site.provenance.retrievedAt,
        source: site.source,
        stale: info.stale,
        ...(info.reason === undefined ? {} : { staleReason: info.reason }),
        attribution: site.attribution,
      },
    })}\n`,
  );
  return 0;
};

const runMcp = async (argv: readonly string[], io: CliIo): Promise<number> => {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.out(MCP_USAGE);
    return 0;
  }
  const server = buildMcpServer(localMcpDeps());
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdout carries JSON-RPC frames only; readiness goes to stderr.
  io.err('voltbase mcp: stdio transport ready\n');
  await new Promise<void>((resolve) => {
    transport.onclose = (): void => {
      resolve();
    };
  });
  await server.close().catch(() => {});
  return 0;
};

/**
 * CLI entry (exit-code contract): 0 ok, 1 not-found/upstream-typed, 2 usage.
 * The bin sets `process.exitCode` from this value and never calls
 * `process.exit()` on success paths, so stdout always flushes.
 */
export const run = async (argv: readonly string[], io: CliIo = defaultIo()): Promise<number> => {
  const [command, ...rest] = argv;
  if (command === undefined || command === '--help' || command === '-h') {
    io.out(CLI_USAGE);
    return 0;
  }
  if (command === 'mcp') return runMcp(rest, io);
  if (command === 'search') return runSearch(rest, io);
  if (command === 'detail' || command === 'site-detail') return runDetail(rest, io);
  if (command === 'status') return runStatus(rest, io);
  io.err(`error: unknown command "${command}" — run "voltbase --help" for usage.\n`);
  return 2;
};
