/**
 * Normalise S2 gates: mapper happy paths, licence rejects, idempotency,
 * boundary inputs, attribution survival.
 */
import { describe, expect, it } from 'vitest';
import { isServable, type ChargePoint } from '@voltbase/core';
import {
  closeUnknownLicence,
  licenceFilter,
  mapDatex2Station,
  mapOcmPoi,
  mapOsmNode,
  mapOcpiLocation,
  normaliseLicence,
  NormaliseError,
  renormalise,
  validateChargePoint,
  type Datex2StationInput,
  type NormaliseInput,
  type OcmPoiInput,
  type OcpiLocationInput,
  type OsmNodeInput,
} from './index.ts';

const OCM_OPEN: OcmPoiInput = {
  id: 800001,
  lat: 52.52,
  lon: 13.405,
  title: 'EnBW - Berlin Mitte',
  countryCode: 'DE',
  isOpenData: true,
  dataProviderTitle: 'Open Charge Map contributors',
  operatorTitle: 'EnBW',
  licenceHint: 'CC-BY-4.0',
  retrievedAt: '2026-09-14T06:15:00.000Z',
  status: 'AVAILABLE',
  connections: [{ powerKw: 150, connectorType: 'CCS2' }],
};

const OSM_NODE: OsmNodeInput = {
  id: 'node/11490001',
  lat: 50.8371,
  lon: 4.3365,
  countryCode: 'BE',
  retrievedAt: '2026-09-14T06:20:00.000Z',
  tags: { amenity: 'charging', name: 'Bruxelles Midi', socket: 'type2', capacity: '22' },
};

const OCPI_NL: OcpiLocationInput = {
  uid: 'NL-NDW-001',
  countryCode: 'NL',
  city: 'Amsterdam',
  operatorName: 'Allego',
  coordinates: { latitude: 52.3702, longitude: 4.8952 },
  retrievedAt: '2026-09-14T06:00:00.000Z',
  evses: [
    {
      evseId: 'NL*ALG*E1000',
      status: 'AVAILABLE',
      connectors: [{ standard: 'IEC_62196_T2_COMBO', maxElectricPower: 150 }],
    },
  ],
};

const DATEX_FR: Datex2StationInput = {
  stationId: 'FR-IRVE-001',
  countryCode: 'FR',
  name: 'Paris Porte des Lilas',
  lat: 48.8799,
  lon: 2.4084,
  operatorName: 'Izivia',
  publisher: 'IRVE',
  datasetUrl: 'https://transport.data.gouv.fr/datasets/irve',
  datasetLicence: 'Etalab-2.0',
  retrievedAt: '2026-09-14T06:10:00.000Z',
  status: 'AVAILABLE',
  connectors: [{ type: 'Type 2', powerKw: 22 }],
};

describe('mapper happy paths', () => {
  it('maps OCM open rows to CC-BY-4.0 servable rows', () => {
    const site = mapOcmPoi(OCM_OPEN);
    expect(site.id).toBe('OCM:800001');
    expect(site.licence).toBe('CC-BY-4.0');
    expect(site.regionalCut).toBe('DE');
    expect(isServable(site)).toBe(true);
    expect(validateChargePoint(site)).toEqual([]);
  });

  it('maps OSM extract nodes to ODbL-1.0 rows', () => {
    const site = mapOsmNode(OSM_NODE);
    expect(site.id).toBe('OSM:node/11490001');
    expect(site.licence).toBe('ODbL-1.0');
    expect(site.connectors).toEqual([{ standard: 'type2', powerKw: 22 }]);
    expect(isServable(site)).toBe(true);
  });

  it('maps NL OCPI 2.2.1 locations to CC0-1.0 rows with flattened connectors', () => {
    const site = mapOcpiLocation(OCPI_NL);
    expect(site.id).toBe('OCPI:NL-NDW-001');
    expect(site.licence).toBe('CC0-1.0');
    expect(site.regionalCut).toBe('NL');
    expect(site.connectors).toEqual([{ standard: 'IEC_62196_T2_COMBO', powerKw: 150 }]);
    expect(site.status).toBe('AVAILABLE');
    expect(isServable(site)).toBe(true);
  });

  it('maps DATEX II FR IRVE rows to Etalab-2.0 rows', () => {
    const site = mapDatex2Station(DATEX_FR);
    expect(site.id).toBe('DATEX2:FR-IRVE-001');
    expect(site.licence).toBe('Etalab-2.0');
    expect(isServable(site)).toBe(true);
    expect(validateChargePoint(site)).toEqual([]);
  });
});

describe('licence rejects (closed, never served)', () => {
  it('closes OCM provider-copyright rows', () => {
    const site = mapOcmPoi({ ...OCM_OPEN, providerCopyrighted: true });
    expect(site.licence).toBe('CLOSED');
    expect(isServable(site)).toBe(false);
  });

  it('closes OCM rows outside the opendata=true filter', () => {
    const site = mapOcmPoi({ ...OCM_OPEN, isOpenData: false });
    expect(site.licence).toBe('CLOSED');
    expect(isServable(site)).toBe(false);
  });

  it('marks unrecognised licences UNKNOWN and the filter closes them', () => {
    expect(normaliseLicence('Not Specified')).toBe('UNKNOWN');
    expect(normaliseLicence('licence TBD ???')).toBe('UNKNOWN');
    expect(normaliseLicence('')).toBe('UNKNOWN');
    const site = mapDatex2Station({ ...DATEX_FR, datasetLicence: 'Not Specified' });
    expect(site.licence).toBe('UNKNOWN');
    expect(isServable(site)).toBe(false);
    expect(closeUnknownLicence(site).licence).toBe('CLOSED');
    const split = licenceFilter([site]);
    expect(split.servable).toEqual([]);
    expect(split.closed).toHaveLength(1);
  });

  it('keeps explicit CLOSED rows closed through the filter', () => {
    const site: ChargePoint = { ...mapOcmPoi(OCM_OPEN), licence: 'CLOSED' };
    expect(licenceFilter([site]).servable).toEqual([]);
  });
});

describe('deterministic re-normalise', () => {
  it('yields identical output (incl. ids) across runs', () => {
    const batch: NormaliseInput[] = [
      { kind: 'ocm', record: OCM_OPEN },
      { kind: 'osm', record: OSM_NODE },
      { kind: 'ocpi', record: OCPI_NL },
      { kind: 'datex2', record: DATEX_FR },
    ];
    const first = renormalise(batch);
    const second = renormalise(batch);
    expect(second).toEqual(first);
    expect(first.map((s) => s.id)).toEqual(['OCM:800001', 'OSM:node/11490001', 'OCPI:NL-NDW-001', 'DATEX2:FR-IRVE-001']);
  });
});

describe('boundary inputs', () => {
  it('rejects empty / malformed records with a typed error', () => {
    expect(() => mapOcmPoi({} as OcmPoiInput)).toThrow(NormaliseError);
    expect(() => mapOsmNode(null as unknown as OsmNodeInput)).toThrow(NormaliseError);
    expect(() => mapOcpiLocation({ uid: 'x', countryCode: 'NL' } as OcpiLocationInput)).toThrow(NormaliseError);
    expect(() => mapDatex2Station({ stationId: '', countryCode: 'FR' } as Datex2StationInput)).toThrow(
      NormaliseError,
    );
    try {
      mapOcmPoi({} as OcmPoiInput);
      expect.unreachable();
    } catch (error) {
      expect((error as NormaliseError).code).toBe('MALFORMED');
    }
  });

  it('flags out-of-range coordinates, oversize sites and negative kW', () => {
    const badCoords: ChargePoint = { ...mapOcmPoi(OCM_OPEN), lat: 999, lon: 4 };
    expect(validateChargePoint(badCoords).map((i) => i.code)).toContain('BAD_COORDINATES');
    const huge: ChargePoint = {
      ...mapOcmPoi(OCM_OPEN),
      connectors: Array.from({ length: 17 }, (_, i) => ({ standard: `T${String(i)}`, powerKw: 22 })),
    };
    expect(validateChargePoint(huge).map((i) => i.code)).toContain('TOO_MANY_CONNECTORS');
    const negative: ChargePoint = { ...mapOcmPoi(OCM_OPEN), connectors: [{ standard: 'CCS2', powerKw: -50 }] };
    expect(validateChargePoint(negative).map((i) => i.code)).toContain('BAD_POWER_KW');
  });

  it('preserves unicode names byte-identically', () => {
    const name = 'Zürich Hauptbahnhof ⚡ चार्जिंग 充電站';
    const site = mapOsmNode({ ...OSM_NODE, name, tags: { amenity: 'charging', name } });
    expect(site.name).toBe(name);
    expect(validateChargePoint(site)).toEqual([]);
  });
});

describe('attribution survival (IS-03/IS-04)', () => {
  it('keeps OCM, OSM and NAP credit strings end-to-end', () => {
    expect(mapOcmPoi(OCM_OPEN).attribution.text).toContain('Open Charge Map');
    expect(mapOsmNode(OSM_NODE).attribution.text).toContain('OpenStreetMap');
    expect(mapOsmNode(OSM_NODE).provenance.attribution.text).toContain('OpenStreetMap');
    const ocpi = mapOcpiLocation(OCPI_NL);
    expect(ocpi.attribution.text).toContain('opendata.ndw.nu');
    const datex = mapDatex2Station(DATEX_FR);
    expect(datex.attribution.text).toContain('IRVE');
    expect(datex.attribution.url).toContain('transport.data.gouv.fr');
  });
});
