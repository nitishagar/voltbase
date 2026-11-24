/**
 * @voltbase/sessions — OCPP session normalisers (ChargeLens).
 *
 * Pure, clock-free mappers from recorded OCPP wire traces to `SessionRow`.
 * Driver identifiers (idTag/idToken) are accepted in trace inputs and dropped
 * at this boundary — they never reach a row (I7).
 */
import {
  stableId,
  type Attribution,
  type Licence,
  type SessionDialect,
  type SessionQualityFlag,
  type SessionRow,
} from '@voltbase/core';
import { normaliseLicence } from '@voltbase/normalise';

/** 1.6J flow events in wire order (subset the depot demo records). */
export type Ocpp16Event =
  | { type: 'start'; transactionId: number; connectorId: number; idTag: string; meterStartWh: number; at: string }
  | {
      type: 'meter';
      connectorId: number;
      transactionId?: number;
      valueWh: number;
      measurand: string;
      unit: string;
      at: string;
    }
  | { type: 'stop'; transactionId: number; meterStopWh: number; at: string };

/** 2.0.1 TransactionEvent flow in seqNo order. */
export type Ocpp201Event =
  | {
      type: 'started';
      transactionId: string;
      evseId: number;
      connectorId: number;
      seqNo: number;
      meterWh: number;
      measurand: string;
      unit: string;
      at: string;
    }
  | { type: 'updated'; transactionId: string; seqNo: number; meterWh: number; measurand: string; unit: string; at: string }
  | { type: 'ended'; transactionId: string; seqNo: number; meterWh: number; measurand: string; unit: string; at: string };

/** One charger's recorded trace (checked-in golden corpus shape). */
export interface SimTrace {
  charger: string;
  dialect: SessionDialect;
  /** Fixed record instant (ISO-8601); becomes provenance.retrievedAt. */
  retrievedAt: string;
  /** Raw licence declaration for the trace; unrecognised ⇒ UNKNOWN ⇒ CLOSED. */
  licenceHint: string;
  events16?: readonly Ocpp16Event[];
  events201?: readonly Ocpp201Event[];
}

/** Rejected input: Stop-without-Start (counted, never a row). */
export interface RejectedEvent {
  reason: 'stop-without-start';
  charger: string;
  transactionId: string;
  at: string;
}

/** Typed adapter failure (malformed trace input — never silent, never a row). */
export class SessionNormaliseError extends Error {
  readonly code: 'NON_ENERGY_READING';
  constructor(code: 'NON_ENERGY_READING', message: string) {
    super(message);
    this.name = 'SessionNormaliseError';
    this.code = code;
  }
}

/**
 * Energy register identity: only lifetime import-energy in Wh feeds the
 * energy computation. Anything else is rejected loudly at the adapter.
 */
const isEnergyReading = (measurand: string, unit: string): boolean =>
  measurand === 'Energy.Active.Import.Register' && unit === 'Wh';

const assertEnergyReading = (measurand: string, unit: string, where: string): void => {
  if (!isEnergyReading(measurand, unit)) {
    throw new SessionNormaliseError('NON_ENERGY_READING', `${where}: measurand ${measurand} unit ${unit} is not lifetime import-energy in Wh`);
  }
};

/**
 * Id-less 1.6 pairing bound: depot charge sessions never span more than a
 * day without a Stop; older readings orphan instead of pairing.
 */
export const MAX_PAIRING_SKEW_MS = 24 * 60 * 60 * 1000;

export interface NormaliseSessionsResult {
  sessions: SessionRow[];
  rejected: RejectedEvent[];
}

/** Normalised charger identity (lowercase-trim namespace for both dialects). */
export function normalizeChargerRef(identity: string): string {
  return identity.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Composite dedupe key: charger + transaction + sequence position.
 * 1.6 numerics stringify in charger scope; 2.0.1 uses station strings + seqNo.
 */
export function dedupeKey(chargerRef: string, transactionId: string | number, seqNoOrAt: number | string): string {
  return `${chargerRef}|${String(transactionId)}|${String(seqNoOrAt)}`;
}

const SIM_ATTRIBUTION: Attribution = { text: 'voltbase simulated CC0 trace' };

function baseRow(
  trace: SimTrace,
  chargerRef: string,
  nativeKey: string,
  licence: Licence,
): Omit<SessionRow, 'connectorId' | 'startedAt' | 'endedAt' | 'openSession' | 'energyWh' | 'meterStartWh' | 'meterStopWh' | 'qualityFlags' | 'orphanCount' | 'lateCount' | 'replayCount'> {
  return {
    id: stableId('OCPP', `${nativeKey}`),
    featureType: 'ChargeSession',
    regionalCut: 'XX',
    source: 'OCPP',
    licence,
    providerCopyrighted: false,
    chargerRef,
    dialect: trace.dialect,
    attribution: SIM_ATTRIBUTION,
    provenance: { source: 'OCPP', retrievedAt: trace.retrievedAt, attribution: SIM_ATTRIBUTION },
  };
}

interface SessionAcc {
  row: SessionRow;
  txKey: string;
  seenStops: Set<string>;
  lastMeterWh: number | null;
}

function flag(row: SessionRow, f: SessionQualityFlag): void {
  if (!row.qualityFlags.includes(f)) row.qualityFlags.push(f);
}

/** Pair an id-less 1.6 meter to an open session, a late session, or orphan. */
function correlate16(accs: SessionAcc[], chargerRef: string, connectorId: number, at: string): SessionAcc | 'late' | null {
  const atMs = Date.parse(at);
  const inWindow = (startedAt: string): boolean => {
    const startMs = Date.parse(startedAt);
    return !Number.isNaN(atMs) && !Number.isNaN(startMs) && atMs >= startMs && atMs - startMs <= MAX_PAIRING_SKEW_MS;
  };
  const open = accs.find(
    (a) => a.row.chargerRef === chargerRef && a.row.connectorId === connectorId && a.row.openSession && inWindow(a.row.startedAt),
  );
  if (open !== undefined) return open;
  const late = accs.find(
    (a) => a.row.chargerRef === chargerRef && a.row.connectorId === connectorId && !a.row.openSession && inWindow(a.row.startedAt),
  );
  if (late !== undefined) return 'late';
  return null;
}

/** Normalise one 1.6J charger trace (single serial pass, no I/O). */
export function normaliseOcpp16Flow(trace: SimTrace): NormaliseSessionsResult {
  const chargerRef = normalizeChargerRef(trace.charger);
  const licence = normaliseLicence(trace.licenceHint);
  const accs: SessionAcc[] = [];
  const rejected: RejectedEvent[] = [];
  const byTx = new Map<string, SessionAcc>();
  let orphans = 0;

  for (const event of trace.events16 ?? []) {
    if (event.type === 'start') {
      const txKey = String(event.transactionId);
      const row: SessionRow = {
        ...baseRow(trace, chargerRef, `${chargerRef}:${txKey}`, licence),
        connectorId: event.connectorId,
        startedAt: event.at,
        endedAt: null,
        openSession: true,
        energyWh: null,
        meterStartWh: event.meterStartWh,
        meterStopWh: null,
        qualityFlags: [],
        orphanCount: 0,
        lateCount: 0,
        replayCount: 0,
      };
      const acc: SessionAcc = { row, txKey, seenStops: new Set(), lastMeterWh: event.meterStartWh };
      accs.push(acc);
      // 1.6 CSMS assigns the numeric id at Start conf time; record-corpus
      // captures the conf value into the start event.
      byTx.set(txKey, acc);
    } else if (event.type === 'meter') {
      assertEnergyReading(event.measurand, event.unit, `ocpp1.6 meter @${event.at}`);
      const keyed = event.transactionId !== undefined ? byTx.get(String(event.transactionId)) : undefined;
      const target = keyed ?? correlate16(accs, chargerRef, event.connectorId, event.at);
      if (target === null) {
        orphans += 1;
      } else if (target === 'late') {
        const late = accs.find(
          (a) => a.row.chargerRef === chargerRef && a.row.connectorId === event.connectorId && !a.row.openSession,
        );
        if (late !== undefined) {
          late.row.lateCount += 1;
          flag(late.row, 'lateReading');
        }
      } else {
        target.lastMeterWh = event.valueWh;
      }
    } else {
      const acc = byTx.get(String(event.transactionId));
      if (acc === undefined) {
        rejected.push({ reason: 'stop-without-start', charger: chargerRef, transactionId: String(event.transactionId), at: event.at });
        continue;
      }
      const stopKey = dedupeKey(chargerRef, event.transactionId, event.at);
      if (acc.seenStops.has(stopKey) || !acc.row.openSession) {
        acc.row.replayCount += 1;
        flag(acc.row, 'replayedStop');
        continue;
      }
      acc.seenStops.add(stopKey);
      acc.row.openSession = false;
      acc.row.endedAt = event.at;
      acc.row.meterStopWh = event.meterStopWh;
      const start = acc.row.meterStartWh;
      if (start === null || event.meterStopWh < start) {
        acc.row.energyWh = null;
        flag(acc.row, 'energyUnknown');
      } else {
        acc.row.energyWh = event.meterStopWh - start;
      }
    }
  }

  const sessions = accs.map((a) => {
    if (a.row.openSession) flag(a.row, 'openSession');
    return a.row;
  });
  // Orphans belong to no session; surface the count on every open session of
  // the charger so the demo can show it, and on the first row otherwise.
  if (orphans > 0) {
    const host = sessions.find((s) => s.openSession) ?? sessions[0];
    if (host !== undefined) {
      host.orphanCount += orphans;
      flag(host, 'orphanReading');
    }
  }
  return { sessions, rejected };
}

/** Normalise one 2.0.1 charger trace (seqNo-ordered single pass). */
export function normaliseOcpp201Flow(trace: SimTrace): NormaliseSessionsResult {
  const chargerRef = normalizeChargerRef(trace.charger);
  const licence = normaliseLicence(trace.licenceHint);
  const accs: SessionAcc[] = [];
  const rejected: RejectedEvent[] = [];
  const byTx = new Map<string, SessionAcc>();

  const ordered = [...(trace.events201 ?? [])].sort((a, b) => a.seqNo - b.seqNo);
  for (const event of ordered) {
    assertEnergyReading(event.measurand, event.unit, `ocpp2.0.1 ${event.type} seqNo ${String(event.seqNo)}`);
    if (event.type === 'started') {
      const row: SessionRow = {
        ...baseRow(trace, chargerRef, `${chargerRef}:${event.transactionId}`, licence),
        connectorId: event.connectorId,
        startedAt: event.at,
        endedAt: null,
        openSession: true,
        energyWh: null,
        meterStartWh: event.meterWh,
        meterStopWh: null,
        qualityFlags: [],
        orphanCount: 0,
        lateCount: 0,
        replayCount: 0,
      };
      const acc: SessionAcc = { row, txKey: event.transactionId, seenStops: new Set(), lastMeterWh: event.meterWh };
      accs.push(acc);
      byTx.set(event.transactionId, acc);
    } else if (event.type === 'updated') {
      const acc = byTx.get(event.transactionId);
      if (acc === undefined || !acc.row.openSession) {
        const host = acc ?? accs[0];
        if (host !== undefined) {
          host.row.lateCount += acc === undefined ? 0 : 1;
          if (acc !== undefined) flag(host.row, 'lateReading');
          else {
            host.row.orphanCount += 1;
            flag(host.row, 'orphanReading');
          }
        }
        continue;
      }
      acc.lastMeterWh = event.meterWh;
    } else {
      const acc = byTx.get(event.transactionId);
      if (acc === undefined) {
        rejected.push({ reason: 'stop-without-start', charger: chargerRef, transactionId: event.transactionId, at: event.at });
        continue;
      }
      const stopKey = dedupeKey(chargerRef, event.transactionId, event.seqNo);
      if (acc.seenStops.has(stopKey) || !acc.row.openSession) {
        acc.row.replayCount += 1;
        flag(acc.row, 'replayedStop');
        continue;
      }
      acc.seenStops.add(stopKey);
      acc.row.openSession = false;
      acc.row.endedAt = event.at;
      acc.row.meterStopWh = event.meterWh;
      const start = acc.row.meterStartWh;
      if (start === null || event.meterWh < start) {
        acc.row.energyWh = null;
        flag(acc.row, 'energyUnknown');
      } else {
        acc.row.energyWh = event.meterWh - start;
      }
    }
  }

  return {
    sessions: accs.map((a) => {
      if (a.row.openSession) flag(a.row, 'openSession');
      return a.row;
    }),
    rejected,
  };
}

/** Dispatch by dialect (same input ⇒ same output; no clock, no I/O). */
export function normaliseTrace(trace: SimTrace): NormaliseSessionsResult {
  return trace.dialect === 'ocpp2.0.1' ? normaliseOcpp201Flow(trace) : normaliseOcpp16Flow(trace);
}

export interface SessionValidationIssue {
  field: string;
  code: string;
  message: string;
}

/** Semantic checks on a built session row. Empty ⇒ well-formed. */
export function validateSession(row: SessionRow): SessionValidationIssue[] {
  const issues: SessionValidationIssue[] = [];
  if (row.id.trim() === '') issues.push({ field: 'id', code: 'EMPTY_ID', message: 'id must be non-empty' });
  if (!/^[A-Z]{2}$/.test(row.regionalCut)) {
    issues.push({ field: 'regionalCut', code: 'BAD_REGIONAL_CUT', message: 'regionalCut must be a 2-letter uppercase country code' });
  }
  if (!Number.isInteger(row.connectorId) || row.connectorId <= 0) {
    issues.push({ field: 'connectorId', code: 'BAD_CONNECTOR', message: 'connectorId must be a positive integer' });
  }
  if (Number.isNaN(Date.parse(row.startedAt))) {
    issues.push({ field: 'startedAt', code: 'BAD_START', message: 'startedAt must be an ISO-8601 instant' });
  }
  if (row.endedAt !== null && Number.isNaN(Date.parse(row.endedAt))) {
    issues.push({ field: 'endedAt', code: 'BAD_END', message: 'endedAt must be an ISO-8601 instant or null' });
  }
  if (row.endedAt !== null && row.endedAt < row.startedAt) {
    issues.push({ field: 'endedAt', code: 'END_BEFORE_START', message: 'endedAt must not precede startedAt' });
  }
  if (row.energyWh !== null && (!Number.isInteger(row.energyWh) || row.energyWh < 0)) {
    issues.push({ field: 'energyWh', code: 'BAD_ENERGY', message: 'energyWh must be a non-negative integer or null' });
  }
  for (const [field, value] of [
    ['meterStartWh', row.meterStartWh],
    ['meterStopWh', row.meterStopWh],
  ] as const) {
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      issues.push({ field, code: 'BAD_METER', message: `${field} must be a non-negative integer or null` });
    }
  }
  if (Number.isNaN(Date.parse(row.provenance.retrievedAt))) {
    issues.push({ field: 'provenance.retrievedAt', code: 'BAD_RETRIEVED_AT', message: 'retrievedAt must be an ISO-8601 instant' });
  }
  if (row.attribution.text.trim() === '') {
    issues.push({ field: 'attribution.text', code: 'EMPTY_ATTRIBUTION', message: 'attribution text must be non-empty' });
  }
  return issues;
}
