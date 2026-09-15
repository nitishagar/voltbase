/**
 * voltbase Worker (S1 scaffold): the thin remote surface.
 * - `GET /` — static landing fragment (contains "voltbase").
 * - `GET /healthz` — `{"ok":true,"stage":1}` with STAGE from src/lib/stage.ts.
 * Stateless edge (IS-06): no KV/D1/DO/R2 bindings, no sessions. Abuse
 * controls + API routes land in S3; MCP parity + CLI land in S4.
 */
import { Hono } from 'hono';
import { STAGE } from '../../../src/lib/stage.ts';

const app = new Hono();

app.get('/', (c) =>
  c.html(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>voltbase</title></head>' +
      '<body><h1>voltbase</h1><p>open-core EV charging-data tooling (stage 1 scaffold)</p></body></html>',
  ),
);

app.get('/healthz', (c) => c.json({ ok: true, stage: STAGE }));

export { app };
export default app;
