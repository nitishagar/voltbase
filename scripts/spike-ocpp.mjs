// scripts/spike-ocpp.mjs — Q2 lib spike: prove ocpp-ws-io drives scripted
// 1.6J + 2.0.1 charger flows (incl. faults + replay) with zero hand-rolled
// frames. Exit 0 + echo line on success; non-zero on any failure.
import { OCPPClient, OCPPServer } from 'ocpp-ws-io';

const T0 = '2026-11-24T10:00:00.000Z';
const results = [];
const check = (name, cond) => {
  results.push([name, cond]);
  if (!cond) process.stdout.write(`spike-ocpp: FAIL ${name}\n`);
};

const server = new OCPPServer({ protocols: ['ocpp1.6', 'ocpp2.0.1'], logging: false });
let nextTx = 1000;
server.on('client', (client) => {
  client.handle('ocpp1.6', 'BootNotification', () => ({ status: 'Accepted', currentTime: T0, interval: 300 }));
  client.handle('ocpp1.6', 'Authorize', () => ({ idTagInfo: { status: 'Accepted' } }));
  client.handle('ocpp1.6', 'StartTransaction', () => ({ transactionId: (nextTx += 1), idTagInfo: { status: 'Accepted' } }));
  client.handle('ocpp1.6', 'MeterValues', () => ({}));
  client.handle('ocpp1.6', 'StopTransaction', () => ({ idTagInfo: { status: 'Accepted' } }));
  client.handle('ocpp2.0.1', 'BootNotification', () => ({ status: 'Accepted', currentTime: T0, interval: 300 }));
  client.handle('ocpp2.0.1', 'TransactionEvent', () => ({}));
});

const http = await server.listen(0, '127.0.0.1');
const addr = http.address();
const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
if (!port) {
  process.stdout.write('spike-ocpp: FAIL ephemeral port\n');
  process.exit(1);
}
const ep = `ws://127.0.0.1:${port}`;
const clients = [];

try {
  // Dialect 1: 1.6J full flow.
  const cp1 = new OCPPClient({ endpoint: ep, identity: 'SPIKE16', protocols: ['ocpp1.6'], reconnect: false });
  clients.push(cp1);
  await cp1.connect();
  const boot = await cp1.call('ocpp1.6', 'BootNotification', { chargePointVendor: 'spike', chargePointModel: 'v1' });
  check('1.6-boot', boot.status === 'Accepted');
  const auth = await cp1.call('ocpp1.6', 'Authorize', { idTag: 'TAG1' });
  check('1.6-auth', auth.idTagInfo.status === 'Accepted');
  const start = await cp1.call('ocpp1.6', 'StartTransaction', { connectorId: 1, idTag: 'TAG1', meterStart: 1000, timestamp: T0 });
  check('1.6-start-numeric-txid', typeof start.transactionId === 'number');
  const mv = await cp1.call('ocpp1.6', 'MeterValues', {
    connectorId: 1,
    transactionId: start.transactionId,
    meterValue: [{ timestamp: T0, sampledValue: [{ value: '1500', measurand: 'Energy.Active.Import.Register', unit: 'Wh' }] }],
  });
  check('1.6-meter', typeof mv === 'object');
  const stop = await cp1.call('ocpp1.6', 'StopTransaction', { transactionId: start.transactionId, meterStop: 2500, timestamp: T0 });
  check('1.6-stop', stop.idTagInfo.status === 'Accepted');
  // Hostile: id-less MeterValues + replayed Stop.
  const mvNoTx = await cp1.call('ocpp1.6', 'MeterValues', {
    connectorId: 1,
    meterValue: [{ timestamp: T0, sampledValue: [{ value: '1500' }] }],
  });
  check('1.6-meter-no-txid', typeof mvNoTx === 'object');
  const replay = await cp1.call('ocpp1.6', 'StopTransaction', { transactionId: start.transactionId, meterStop: 2500, timestamp: T0 });
  check('1.6-stop-replay', replay.idTagInfo.status === 'Accepted');

  // Dialect 2: 2.0.1 TransactionEvent flow.
  const cp2 = new OCPPClient({ endpoint: ep, identity: 'SPIKE201', protocols: ['ocpp2.0.1'], reconnect: false });
  clients.push(cp2);
  await cp2.connect();
  const boot2 = await cp2.call('ocpp2.0.1', 'BootNotification', {
    reason: 'PowerUp',
    chargingStation: { model: 'v1', vendorName: 'spike' },
  });
  check('2.0.1-boot', boot2.status === 'Accepted');
  const txId = 'station-tx-1';
  const started = await cp2.call('ocpp2.0.1', 'TransactionEvent', {
    eventType: 'Started',
    timestamp: T0,
    triggerReason: 'Authorized',
    seqNo: 0,
    transactionInfo: { transactionId: txId },
    evse: { id: 1, connectorId: 1 },
    meterValue: [{ timestamp: T0, sampledValue: [{ value: 1000, measurand: 'Energy.Active.Import.Register', unit: 'Wh' }] }],
  });
  check('2.0.1-started', typeof started === 'object');
  const ended = await cp2.call('ocpp2.0.1', 'TransactionEvent', {
    eventType: 'Ended',
    timestamp: T0,
    triggerReason: 'EVCommunicationLost',
    seqNo: 1,
    transactionInfo: { transactionId: txId },
    evse: { id: 1, connectorId: 1 },
    meterValue: [{ timestamp: T0, sampledValue: [{ value: 2500, measurand: 'Energy.Active.Import.Register', unit: 'Wh' }] }],
  });
  check('2.0.1-ended', typeof ended === 'object');
} finally {
  for (const c of clients) await c.close?.().catch(() => {});
  await server.close();
}

const failed = results.filter(([, ok]) => !ok);
if (failed.length > 0) process.exit(1);
process.stdout.write(`spike-ocpp: OK 1.6-full + 1.6-hostile + 2.0.1 flows, zero hand-rolled frames (${results.length} checks)\n`);
