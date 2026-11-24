/**
 * @voltbase/sessions — OCPP session normalisers for the ChargeLens depot demo.
 */
export {
  MAX_PAIRING_SKEW_MS,
  SessionNormaliseError,
  dedupeKey,
  normaliseOcpp16Flow,
  normaliseOcpp201Flow,
  normaliseTrace,
  normalizeChargerRef,
  validateSession,
  type NormaliseSessionsResult,
  type Ocpp16Event,
  type Ocpp201Event,
  type RejectedEvent,
  type SessionValidationIssue,
  type SimTrace,
} from './session.ts';
export { DEPOT_TRACES } from './corpus.ts';
export {
  buildSessionIndex,
  depotFaults,
  faultCountsByCharger,
  filterSessions,
  findSessionById,
  isFaultRow,
  type BuildDepotResult,
  type ChargerFaultCount,
  type DepotIndex,
  type SessionQuery,
} from './depot.ts';
