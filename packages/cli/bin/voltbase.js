#!/usr/bin/env node
/**
 * `voltbase` bin (S1 shell). Plain node, no build step: `--help`/`-h` (and a
 * bare invocation) print usage to stdout and exit 0. Full commands land in S4.
 */
const args = process.argv.slice(2);

const USAGE = `voltbase — open-core EV charging-data tooling.

Usage:
  voltbase <command> [flags]

Commands:
  mcp                  MCP server over stdio (lands in S4)

Global flags:
  --help, -h           Usage for voltbase (exit 0)
`;

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  process.stdout.write(`${USAGE}\n`);
  process.exitCode = 0;
} else {
  process.stderr.write(`error: unknown command "${args[0]}" — run "voltbase --help" for usage.\n`);
  process.exitCode = 2;
}
