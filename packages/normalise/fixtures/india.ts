/**
 * S2 India fixtures — 10 deterministic static rows (data-only, IS-10).
 *
 * Mix: 8× OSM extract rows (ODbL-1.0, servable) + 2× OCM closed rows proving
 * the filter (one provider-copyright, one outside the `opendata=true`
 * filter). The served `(ChargePoint, IN)` partition is all-OSM by
 * construction (ADR-003); the OCM rows exist only as closed audit rows.
 */
import type { NormaliseInput } from '../src/index.ts';

function inOsm(
  id: string,
  name: string,
  lat: number,
  lon: number,
  socket: string,
  capacityKw: number,
): NormaliseInput {
  return {
    kind: 'osm',
    record: {
      id,
      lat,
      lon,
      countryCode: 'IN',
      retrievedAt: '2026-09-14T07:00:00.000Z',
      tags: { amenity: 'charging', name, socket, capacity: String(capacityKw) },
    },
  };
}

export const INDIA_FIXTURES: readonly NormaliseInput[] = [
  inOsm('node/22000101', 'Connaught Place EV', 28.6315, 77.2167, 'type2', 22),
  inOsm('node/22000102', 'Bandra Kurla Complex', 19.0657, 72.8781, 'ccs2', 60),
  inOsm('node/22000103', 'Whitefield Forum', 12.9698, 77.7499, 'type2', 11),
  inOsm('node/22000104', 'Guindy Industrial Estate', 13.0067, 80.2206, 'chademo', 50),
  inOsm('node/22000105', 'Hitech City Madhapur', 17.4435, 78.3772, 'ccs2', 120),
  inOsm('node/22000106', 'Koregaon Park Lane', 18.5362, 73.8935, 'type2', 22),
  inOsm('node/22000107', 'Salt Lake Sector V', 22.5726, 88.4332, 'type2', 11),
  inOsm('node/22000108', 'SG Highway Iscon', 23.0339, 72.5111, 'ccs2', 60),
  // Closed row 1: OCM provider-copyright (Delhi operator, provider terms).
  {
    kind: 'ocm',
    record: {
      id: 920001,
      lat: 28.6139,
      lon: 77.209,
      title: 'Delhi Discom - Karol Bagh',
      countryCode: 'IN',
      isOpenData: true,
      providerCopyrighted: true,
      dataProviderTitle: 'Delhi Discom Ltd',
      operatorTitle: 'Delhi Discom Ltd',
      licenceHint: 'CC-BY-4.0',
      retrievedAt: '2026-09-14T07:05:00.000Z',
      status: 'AVAILABLE',
      connections: [{ powerKw: 30, connectorType: 'Type 2' }],
    },
  },
  // Closed row 2: OCM row outside the opendata=true filter (Mumbai).
  {
    kind: 'ocm',
    record: {
      id: 920002,
      lat: 19.076,
      lon: 72.8777,
      title: 'Mumbai Fleet Hub - Andheri',
      countryCode: 'IN',
      isOpenData: false,
      dataProviderTitle: 'Fleet Operator Pvt Ltd',
      operatorTitle: 'Fleet Operator Pvt Ltd',
      retrievedAt: '2026-09-14T07:05:00.000Z',
      status: 'AVAILABLE',
      connections: [{ powerKw: 25, connectorType: 'Type 2' }],
    },
  },
];
