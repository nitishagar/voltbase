# Security Policy

## Supported versions

| version | supported |
|---|---|
| 0.1.x | yes |
| < 0.1.0 | no |

## Reporting a vulnerability

Please report privately via GitHub Security Advisories
(**Security → Report a vulnerability** on this repository) rather than a
public issue. Include the affected component (Worker API, MCP server, CLI,
docs site, release tooling), the route or file involved, and a minimal
reproduction.

## Scope notes

- The Worker is stateless and holds no secrets: third-party keys are
  caller-supplied per request by name (BYOK) and are never logged or stored.
- The docs site is a fully static artifact with zero `<script>` tags and no
  runtime fetches (build-thrown and gate-asserted).
- Outbound Worker fetches are restricted by an allowlist plus a
  private-origin (SSRF) guard enforced before any fetch.
