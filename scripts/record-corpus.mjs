// scripts/record-corpus.mjs — record the golden OCPP corpus through a real
// ocpp-ws-io client/server pair (strictMode validates every frame).
// Usage: node scripts/record-corpus.mjs --seed <n> --start <ISO-instant>
// Deterministic: fixed start instant + fixed offsets + fixed txid counter.
// Writes packages/sessions/corpus/{ocpp16-full,ocpp16-hostile,ocpp201-events}.json
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OCPPClient, OCPPServer } from 'ocpp-ws-io';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = join(root, 'packages', 'sessions', 'corpus');

const args = process.argv.slice(2);
const seed = Number(args[args.indexOf('--seed') + 1] ?? '1');
const startIso = args[args.indexOf('--start') + 1] ?? '';
if (!Number.isInteger(seed) || Number.isNaN(Date.parse(startIso))) {
  process.stderr.write('usage: node scripts/record-corpus.mjs --seed <n> --start <ISO-instant>\n');
  process.exit(2);
}
const at = (offsetSec) => new Date(Date.parse(startIso) + offsetSec * 1000).toISOString();

const server = new OCPPServer({ protocols: ['ocpp1.6', 'ocpp2.0.1'], logging: false });
let nextTx = 1000 + seed;
server.on('client', (client) => {
  client.handle('ocpp1.6', 'BootNotification', () => ({ status: 'Accepted', currentTime: at(0), interval: 300 }));
  client.handle('ocpp1.6', 'Authorize', () => ({ idTagInfo: { status: 'Accepted' } }));
  client.handle('ocpp1.6', 'StartTransaction', () => ({ transactionId: (nextTx += 1), idTagInfo: { status: 'Accepted' } }));
  client.handle('ocpp1.6', 'MeterValues', () => ({}));
  client.handle('ocpp1.6', 'StopTransaction', () => ({ idTagInfo: { status: 'Accepted' } }));
  client.handle('ocpp2.0.1', 'BootNotification', () => ({ status: 'Accepted', currentTime: at(0), interval: 300 }));
  client.handle('ocpp2.0.1', 'TransactionEvent', () => ({}));
});

const http = await server.listen(0, '127.0.0.1');
const addr = http.address();
const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
if (!port) {
  process.stderr.write('record-corpus: ephemeral port failed\n');
  process.exit(1);
}
const ep = `ws://127.0.0.1:${port}`;
const clients = [];
const files = [];

try {
  // Dialect 1: 1.6J full flow.
  const cp1 = new OCPPClient({ endpoint: ep, identity: 'CP-16A', protocols: ['ocpp1.6'], reconnect: false, strictMode: true });
  clients.push(cp1);
  await cp1.connect();
  await cp1.call('ocpp1.6', 'BootNotification', { chargePointVendor: 'chargelens', chargePointModel: 'sim' });
  await cp1.call('ocpp1.6', 'Authorize', { idTag: 'DRIVER-A' });
  const s1 = await cp1.call('ocpp1.6', 'StartTransaction', { connectorId: 1, idTag: 'DRIVER-A', meterStart: 1000, timestamp: at(0) });
  await cp1.call('ocpp1.6', 'MeterValues', {
    connectorId: 1,
    transactionId: s1.transactionId,
    meterValue: [{ timestamp: at(60), sampledValue: [{ value: '1500', measurand: 'Energy.Active.Import.Register', unit: 'Wh' }] }],
  });
  await cp1.call('ocpp1.6', 'StopTransaction', { transactionId: s1.transactionId, meterStop: 2500, timestamp: at(120) });
  const full = {
    charger: 'CP-16A',
    dialect: 'ocpp1.6',
    retrievedAt: startIso,
    licenceHint: 'CC0-1.0',
    events16: [
      { type: 'start', transactionId: s1.transactionId, connectorId: 1, idTag: 'DRIVER-A', meterStartWh: 1000, at: at(0) },
      { type: 'meter', connectorId: 1, transactionId: s1.transactionId, valueWh: 1500, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: at(60) },
      { type: 'stop', transactionId: s1.transactionId, meterStopWh: 2500, at: at(120) },
    ],
  };
  writeFileSync(join(corpusDir, 'ocpp16-full.json'), `${JSON.stringify(full, null, 2)}\n`);
  files.push('ocpp16-full.json');

  // Dialect 2: 1.6J hostile (id-less meter, replayed stop, rollover, orphan, stop-without-start).
  const cp2 = new OCPPClient({ endpoint: ep, identity: 'CP-16B', protocols: ['ocpp1.6'], reconnect: false, strictMode: true });
  clients.push(cp2);
  await cp2.connect();
  await cp2.call('ocpp1.6', 'BootNotification', { chargePointVendor: 'chargelens', chargePointModel: 'sim' });
  const h1 = await cp2.call('ocpp1.6', 'StartTransaction', { connectorId: 1, idTag: 'DRIVER-B', meterStart: 1000, timestamp: at(0) });
  await cp2.call('ocpp1.6', 'MeterValues', {
    connectorId: 1,
    meterValue: [{ timestamp: at(30), sampledValue: [{ value: '1500' }] }],
  });
  await cp2.call('ocpp1.6', 'MeterValues', {
    connectorId: 2,
    meterValue: [{ timestamp: at(40), sampledValue: [{ value: '100' }] }],
  });
  await cp2.call('ocpp1.6', 'StopTransaction', { transactionId: h1.transactionId, meterStop: 2500, timestamp: at(120) });
  await cp2.call('ocpp1.6', 'StopTransaction', { transactionId: h1.transactionId, meterStop: 2500, timestamp: at(120) });
  const h2 = await cp2.call('ocpp1.6', 'StartTransaction', { connectorId: 1, idTag: 'DRIVER-B', meterStart: 5000, timestamp: at(200) });
  await cp2.call('ocpp1.6', 'StopTransaction', { transactionId: h2.transactionId, meterStop: 4200, timestamp: at(260) });
  await cp2.call('ocpp1.6', 'StopTransaction', { transactionId: 9999, meterStop: 10, timestamp: at(300) });
  const hostile = {
    charger: 'CP-16B',
    dialect: 'ocpp1.6',
    retrievedAt: startIso,
    licenceHint: 'CC0-1.0',
    events16: [
      { type: 'start', transactionId: h1.transactionId, connectorId: 1, idTag: 'DRIVER-B', meterStartWh: 1000, at: at(0) },
      { type: 'meter', connectorId: 1, valueWh: 1500, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: at(30) },
      { type: 'meter', connectorId: 2, valueWh: 100, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: at(40) },
      { type: 'stop', transactionId: h1.transactionId, meterStopWh: 2500, at: at(120) },
      { type: 'stop', transactionId: h1.transactionId, meterStopWh: 2500, at: at(120) },
      { type: 'start', transactionId: h2.transactionId, connectorId: 1, idTag: 'DRIVER-B', meterStartWh: 5000, at: at(200) },
      { type: 'stop', transactionId: h2.transactionId, meterStopWh: 4200, at: at(260) },
      { type: 'stop', transactionId: 9999, meterStopWh: 10, at: at(300) },
    ],
  };
  writeFileSync(join(corpusDir, 'ocpp16-hostile.json'), `${JSON.stringify(hostile, null, 2)}\n`);
  files.push('ocpp16-hostile.json');

  // Dialect 3: 2.0.1 TransactionEvent flow.
  const cp3 = new OCPPClient({ endpoint: ep, identity: 'CP-201', protocols: ['ocpp2.0.1'], reconnect: false, strictMode: true });
  clients.push(cp3);
  await cp3.connect();
  await cp3.call('ocpp2.0.1', 'BootNotification', {
    reason: 'PowerUp',
    chargingStation: { model: 'sim', vendorName: 'chargelens' },
  });
  const txId = 'station-tx-1';
  const sampled = (value) => [{ value, measurand: 'Energy.Active.Import.Register', unitOfMeasure: { unit: 'Wh', multiplier: 0 } }];
  const mv = (seqNo, value, t) => ({
    eventType: seqNo === 0 ? 'Started' : 'Updated',
    timestamp: t,
    triggerReason: 'Authorized',
    seqNo,
    transactionInfo: { transactionId: txId },
    evse: { id: 1, connectorId: 1 },
    meterValue: [{ timestamp: t, sampledValue: sampled(value) }],
  });
  await cp3.call('ocpp2.0.1', 'TransactionEvent', mv(0, 1000, at(0)));
  await cp3.call('ocpp2.0.1', 'TransactionEvent', mv(1, 1800, at(60)));
  await cp3.call('ocpp2.0.1', 'TransactionEvent', {
    eventType: 'Ended',
    timestamp: at(120),
    triggerReason: 'EVCommunicationLost',
    seqNo: 2,
    transactionInfo: { transactionId: txId },
    evse: { id: 1, connectorId: 1 },
    meterValue: [{ timestamp: at(120), sampledValue: sampled(2500) }],
  });
  const events201 = {
    charger: 'CP-201',
    dialect: 'ocpp2.0.1',
    retrievedAt: startIso,
    licenceHint: 'CC0-1.0',
    events201: [
      { type: 'started', transactionId: txId, evseId: 1, connectorId: 1, seqNo: 0, meterWh: 1000, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: at(0) },
      { type: 'updated', transactionId: txId, seqNo: 1, meterWh: 1800, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: at(60) },
      { type: 'ended', transactionId: txId, seqNo: 2, meterWh: 2500, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: at(120) },
    ],
  };
  writeFileSync(join(corpusDir, 'ocpp201-events.json'), `${JSON.stringify(events201, null, 2)}\n`);
  files.push('ocpp201-events.json');
} finally {
  for (const c of clients) await c.close?.().catch(() => {});
  await server.close();
}

// TS mirror for the Worker/test import graph (JSON imports are off in
// tsconfig.base); corpus-sync.test.ts asserts TS<->JSON deep equality.
const traces = ['ocpp16-full.json', 'ocpp16-hostile.json', 'ocpp201-events.json'].map((f) =>
  JSON.parse(readFileSync(join(corpusDir, f), 'utf8')),
);
const header = `/** Generated by scripts/record-corpus.mjs --seed ${seed} --start ${startIso} — do not hand-edit. */\nimport type { SimTrace } from './session.ts';\nexport const DEPOT_TRACES: SimTrace[] = `;
writeFileSync(join(root, 'packages', 'sessions', 'src', 'corpus.ts'), `${header}${JSON.stringify(traces, null, 2)};\n`);

process.stdout.write(`record-corpus: OK seed=${seed} start=${startIso} files=${files.join(',')}\n`);
