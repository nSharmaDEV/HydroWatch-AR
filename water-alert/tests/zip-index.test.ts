import { describe, expect, it } from 'vitest'
import { buildZipIndex } from '../scripts/zip-index-lib'
import { lookupZip } from '../src/zip-suppliers'

const polygon = (x: number, y: number, width = 1) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + width, y], [x + width, y + 1], [x, y + 1], [x, y]]] })
const systems = [{ pwsid: 'AR0000001', placeId: 'a', name: 'Alpha' }, { pwsid: 'AR0000002', placeId: 'b', name: 'Beta' }]
const boundary = (id = 'AR0000001', x = 0, source = 'System Sourced') => ({ type: 'Feature' as const, geometry: polygon(x, 0), properties: { PWSID: id, PWS_Name: id, Symbology_Field: source, Data_Source: 'https://gis.arkansas.gov/product/public-water-systems-polygon/', Original_Data_Provider: 'ADH', Original_Data_Created_Date: '2023-07-08' } })
const zctas = [{ type: 'Feature' as const, geometry: polygon(0, 0, 2), properties: { ZCTA5: '72001' } }]

describe('offline ZIP index', () => {
  it('keeps multiple identities, deduplicates geometry and preserves modeled provenance', () => {
    const result = buildZipIndex([boundary(), boundary(), boundary('AR0000002', 1, 'Modeled')], zctas, systems)
    expect(result.zips['72001']).toEqual(['AR0000001', 'AR0000002'])
    expect(result.systems['AR0000002'].boundarySource).toBe('modeled')
    expect(result.audit.duplicateBoundaryIds).toEqual(['AR0000001'])
  })
  it('retains unresolved identities and missing directory geometries in the audit', () => {
    const result = buildZipIndex([boundary('AR0000999')], zctas, systems)
    expect(result.audit.unmatchedBoundaryIds).toEqual(['AR0000999'])
    expect(result.audit.directoryWithoutBoundary).toEqual(['AR0000001', 'AR0000002'])
    expect(result.zips['72001']).toEqual([])
  })
  it('audits tribal-style Arkansas PWS IDs without silently losing the record', () => {
    expect(buildZipIndex([boundary('ART001101')], zctas, systems).audit.unmatchedBoundaryIds).toEqual(['ART001101'])
  })
  it('does not use centroids, bounding boxes, or boundary-only touches as coverage', () => {
    const result = buildZipIndex([boundary('AR0000001', 2)], zctas, systems)
    expect(result.zips['72001']).toEqual([])
  })
  it('respects polygon holes and separate islands', () => {
    const hole = { ...boundary(), geometry: { type: 'Polygon' as const, coordinates: [polygon(-1, -1, 4).coordinates[0].map(([x, y]) => [x, y * 4]), [[-0.1, -0.1], [2.1, -0.1], [2.1, 1.1], [-0.1, 1.1], [-0.1, -0.1]]] } }
    expect(buildZipIndex([hole], zctas, systems).zips['72001']).toEqual([])
    const islands = { ...boundary(), geometry: { type: 'MultiPolygon' as const, coordinates: [polygon(0, 0).coordinates, polygon(10, 0).coordinates] } }
    expect(buildZipIndex([islands], zctas, systems).zips['72001']).toEqual(['AR0000001'])
  })
  it('keeps positive sliver intersections and reports them rather than inventing a cutoff', () => {
    const result = buildZipIndex([boundary('AR0000001', 1.999999999)], zctas, systems)
    expect(result.zips['72001']).toEqual(['AR0000001'])
    expect(result.audit.smallIntersections.length).toBe(1)
  })
  it('fails closed on invalid geometry instead of publishing a partial index', () => {
    expect(() => buildZipIndex([{ ...boundary(), geometry: { type: 'Point', coordinates: [0, 0] } } as never], zctas, systems)).toThrow()
  })
  it('retains wholesale activity as a warning, not an unsupported wholesale-only exclusion', () => {
    const result = buildZipIndex([boundary()], zctas, systems, ['AR0000001'])
    expect(result.systems.AR0000001.wholesale).toBe(true)
    expect(result.zips['72001']).toEqual(['AR0000001'])
  })
  it('ships only lookup identity and source provenance, not duplicate contact data', () => {
    const result = buildZipIndex([boundary()], zctas, systems.map(s => ({ ...s, phone: 'not needed', email: 'not needed' })))
    expect(result.systems.AR0000001).not.toHaveProperty('phone')
    expect(result.systems.AR0000001.sourceUrls).toEqual(['https://gis.arkansas.gov/product/public-water-systems-polygon/'])
  })
})

describe('ZIP lookup', () => {
  const index = { ...buildZipIndex([boundary(), boundary('AR0000002', 1, 'Modeled')], zctas, systems), schemaVersion: 1 as const }
  it('distinguishes names, partial ZIPs, malformed numbers and unavailable data', () => {
    expect(lookupZip('Bella Vista', index).state).toBe('not-zip')
    expect(lookupZip('72', index).state).toBe('incomplete')
    expect(lookupZip('720001', index).state).toBe('invalid')
    expect(lookupZip('72001', null).state).toBe('unavailable')
  })
  it('returns every matching candidate in deterministic name order', () => {
    const result = lookupZip(' 72001 ', index)
    expect(result.state).toBe('matches')
    expect(result.candidates.map(s => s.pwsid)).toEqual(['AR0000001', 'AR0000002'])
    expect(result.candidates[1].boundarySource).toBe('modeled')
  })
  it('does not label missing ZIP geography as an invalid ZIP or no supplier', () => {
    expect(lookupZip('99999', index).state).toBe('no-match')
    expect(lookupZip('72001', { ...index, schemaVersion: 99 } as never).state).toBe('unavailable')
    expect(lookupZip('72001', { ...index, zips: { '72001': {} } } as never).state).toBe('unavailable')
  })
})
