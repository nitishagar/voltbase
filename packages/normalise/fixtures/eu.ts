/**
 * S2 EU fixtures — 30 deterministic raw inputs (no network, no clock).
 *
 * Mix: 8× NL OCPI (CC0) + 6× LU Chargy KML via DATEX2 (CC0) + 6× FR IRVE
 * via DATEX2 (Etalab-2.0) + 5× OCM open (CC-BY-4.0) + 2× OSM (ODbL-1.0) = 27
 * servable, plus 3 closed rows proving the filter:
 *   - OCM provider-copyright (© provider terms),
 *   - LU second multi-operator DATEX II set ("Not Specified", ADR-002),
 *   - DATEX II row with an unrecognised licence string.
 *
 * Partition discipline (ADR-003): served OSM rows sit in cuts (BE, AT) with
 * no served non-OSM rows, and vice versa — asserted in fixtures.test.ts.
 */
import type { NormaliseInput } from '../src/index.ts';

function nl(i: number, city: string, lat: number, lon: number): NormaliseInput {
  return {
    kind: 'ocpi',
    record: {
      uid: `NL-NDW-${String(i + 1).padStart(3, '0')}`,
      countryCode: 'NL',
      city,
      operatorName: i % 2 === 0 ? 'Allego' : 'Vattenfall',
      coordinates: { latitude: lat, longitude: lon },
      retrievedAt: '2026-09-14T06:00:00.000Z',
      evses: [
        {
          evseId: `NL*ALG*E${String(1000 + i)}`,
          status: i % 3 === 2 ? 'OCCUPIED' : 'AVAILABLE',
          connectors: [
            { standard: 'IEC_62196_T2', maxElectricPower: 22 },
            { standard: 'IEC_62196_T2_COMBO', maxElectricPower: 150 },
          ],
        },
      ],
    },
  };
}

function luKml(i: number, name: string, lat: number, lon: number): NormaliseInput {
  return {
    kind: 'datex2',
    record: {
      stationId: `CHARGY-${String(i + 1).padStart(3, '0')}`,
      countryCode: 'LU',
      name,
      lat,
      lon,
      operatorName: 'Chargy',
      publisher: 'Chargy',
      datasetUrl: 'https://data.public.lu/en/datasets/bornes-de-chargement-publiques-pour-voitures-electriques/',
      datasetLicence: 'CC0-1.0',
      retrievedAt: '2026-09-14T06:05:00.000Z',
      status: 'AVAILABLE',
      connectors: [{ type: 'Type 2', powerKw: 22 }],
    },
  };
}

function frIrve(i: number, name: string, lat: number, lon: number): NormaliseInput {
  return {
    kind: 'datex2',
    record: {
      stationId: `FR-IRVE-${String(i + 1).padStart(3, '0')}`,
      countryCode: 'FR',
      name,
      lat,
      lon,
      operatorName: i % 2 === 0 ? 'Izivia' : 'TotalEnergies',
      publisher: 'IRVE',
      datasetUrl:
        'https://transport.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques',
      datasetLicence: 'Etalab-2.0',
      retrievedAt: '2026-09-14T06:10:00.000Z',
      status: i % 4 === 3 ? 'OUT_OF_SERVICE' : 'AVAILABLE',
      connectors: [{ type: 'Type 2', powerKw: 22 + (i % 3) * 11 }],
    },
  };
}

function ocmOpen(i: number, title: string, country: string, lat: number, lon: number): NormaliseInput {
  return {
    kind: 'ocm',
    record: {
      id: 900000 + i,
      lat,
      lon,
      title,
      countryCode: country,
      isOpenData: true,
      dataProviderTitle: 'Open Charge Map contributors',
      operatorTitle: title.split(' - ')[0] ?? title,
      licenceHint: 'CC-BY-4.0',
      retrievedAt: '2026-09-14T06:15:00.000Z',
      status: 'AVAILABLE',
      connections: [{ powerKw: 50 + (i % 3) * 25, connectorType: 'CCS2' }],
    },
  };
}

function osm(i: number, id: string, country: string, name: string, lat: number, lon: number): NormaliseInput {
  return {
    kind: 'osm',
    record: {
      id,
      lat,
      lon,
      countryCode: country,
      retrievedAt: '2026-09-14T06:20:00.000Z',
      tags: { amenity: 'charging', name, socket: 'type2', capacity: String(11 + (i % 2) * 11) },
    },
  };
}

export const EU_FIXTURES: readonly NormaliseInput[] = [
  nl(0, 'Amsterdam', 52.3702, 4.8952),
  nl(1, 'Rotterdam', 51.9244, 4.4777),
  nl(2, 'Utrecht', 52.0907, 5.1214),
  nl(3, 'Eindhoven', 51.4416, 5.4697),
  nl(4, 'Groningen', 53.2194, 6.5665),
  nl(5, 'Maastricht', 50.8514, 5.691),
  nl(6, 'Zwolle', 52.5168, 6.083),
  nl(7, 'Breda', 51.5719, 4.7683),
  luKml(0, 'Luxembourg Gare', 49.6, 6.1333),
  luKml(1, 'Esch-sur-Alzette Centre', 49.4958, 5.9806),
  luKml(2, 'Differdange Place', 49.5242, 5.8902),
  luKml(3, 'Ettelbruck Nord', 49.8469, 6.0997),
  luKml(4, 'Diekirch Sauer', 49.8671, 6.159),
  luKml(5, 'Wiltz Grand-Rue', 49.9664, 5.9326),
  frIrve(0, 'Paris Porte des Lilas', 48.8799, 2.4084),
  frIrve(1, 'Lyon Part-Dieu', 45.7604, 4.8597),
  frIrve(2, 'Marseille Prado', 43.27, 5.3935),
  frIrve(3, 'Bordeaux Mérignac', 44.8322, -0.7157),
  frIrve(4, 'Lille Euralille', 50.639, 3.075),
  frIrve(5, 'Nantes Commerce', 47.2144, -1.556),
  ocmOpen(0, 'EnBW - Berlin Mitte', 'DE', 52.52, 13.405),
  ocmOpen(1, 'Iberdrola - Madrid Sol', 'ES', 40.4168, -3.7038),
  ocmOpen(2, 'Enel X - Roma Termini', 'IT', 41.9028, 12.4964),
  ocmOpen(3, 'EDP - Lisboa Oriente', 'PT', 38.7681, -9.0956),
  ocmOpen(4, 'PRE - Praha Florenc', 'CZ', 50.0905, 14.4395),
  osm(0, 'node/11490001', 'BE', 'Bruxelles Midi', 50.8371, 4.3365),
  osm(1, 'node/11490002', 'AT', 'Wien Hauptbahnhof', 48.185, 16.377),
  // Closed row 1: OCM provider-copyright (provider terms, not CC BY).
  {
    kind: 'ocm',
    record: {
      id: 910001,
      lat: 52.51,
      lon: 13.41,
      title: 'Proprietary Netz - Berlin Ost',
      countryCode: 'DE',
      isOpenData: true,
      providerCopyrighted: true,
      dataProviderTitle: 'Proprietary Netz GmbH',
      operatorTitle: 'Proprietary Netz GmbH',
      licenceHint: 'CC-BY-4.0',
      retrievedAt: '2026-09-14T06:15:00.000Z',
      status: 'AVAILABLE',
      connections: [{ powerKw: 100, connectorType: 'CCS2' }],
    },
  },
  // Closed row 2: LU second multi-operator DATEX II set, licence Not Specified.
  {
    kind: 'datex2',
    record: {
      stationId: 'LU-2ND-001',
      countryCode: 'LU',
      name: 'Luxembourg Cloche d’Or (2nd set)',
      lat: 49.5833,
      lon: 6.1156,
      operatorName: 'Multi-Operator Pool',
      publisher: 'LU multi-operator (2nd set)',
      datasetUrl: 'https://data.public.lu/en/datasets/',
      datasetLicence: 'Not Specified',
      retrievedAt: '2026-09-14T06:05:00.000Z',
      status: 'AVAILABLE',
      connectors: [{ type: 'CCS2', powerKw: 150 }],
    },
  },
  // Closed row 3: DATEX II row with an unrecognised licence string.
  {
    kind: 'datex2',
    record: {
      stationId: 'FR-UNK-001',
      countryCode: 'FR',
      name: 'Paris Bastille (licence TBD)',
      lat: 48.8533,
      lon: 2.3692,
      operatorName: 'Unknown Operator',
      publisher: 'IRVE',
      datasetUrl:
        'https://transport.data.gouv.fr/datasets/base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques',
      datasetLicence: 'licence to be determined ???',
      retrievedAt: '2026-09-14T06:10:00.000Z',
      status: 'AVAILABLE',
      connectors: [{ type: 'Type 2', powerKw: 22 }],
    },
  },
];
