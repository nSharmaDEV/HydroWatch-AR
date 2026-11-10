// Build-time geometry only; never imported by the browser.
import { intersect } from '@turf/intersect'
import { area } from '@turf/area'
import type { Feature, Polygon, MultiPolygon, GeoJsonProperties } from 'geojson'
import type { ZipIndex, ZipSupplier } from '../src/zip-suppliers.js'

type Shape = Feature<Polygon | MultiPolygon, GeoJsonProperties>
type Identity = { pwsid: string; placeId: string; name: string }
function bounds(feature: Shape): number[] {
  if (!feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) throw new Error('Expected polygon geometry')
  const rings = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat()
  const points = rings.flat()
  if (!points.length || rings.some(r => r.length < 4 || r[0][0] !== r.at(-1)![0] || r[0][1] !== r.at(-1)![1]) || points.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) throw new Error('Invalid polygon coordinates')
  return points.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity])
}

export function buildZipIndex(boundaries: Shape[], zctas: Shape[], directory: Identity[], wholesaleIds: string[] = []) {
  const audit = {
    unmatchedBoundaryIds: [] as string[], directoryWithoutBoundary: [] as string[],
    duplicateBoundaryIds: [] as string[], smallIntersections: [] as { zip: string; pwsid: string; squareMeters: number }[],
  }
  const identities = new Map(directory.map(s => [s.pwsid, s]))
  if (identities.size !== directory.length || new Set(directory.map(s => s.placeId)).size !== directory.length) throw new Error('Ambiguous directory identity')
  const systems: Record<string, ZipSupplier> = {}, zips: Record<string, string[]> = {}
  const seen = new Set<string>()
  const shapes = boundaries.map(f => {
    const id = String(f.properties?.PWSID ?? '')
    if (!/^AR[A-Z0-9]{7}$/.test(id)) throw new Error(`Invalid Arkansas PWSID ${id}`)
    if (seen.has(id)) audit.duplicateBoundaryIds.push(id)
    seen.add(id)
    const bbox = bounds(f), identity = identities.get(id)
    if (!identity) audit.unmatchedBoundaryIds.push(id)
    else {
      // In EPA's schema Data_Source is a URL, not the modeled/system-sourced flag.
      const source = String(f.properties?.Symbology_Field ?? '').toLowerCase()
      const boundarySource = source === 'system sourced' ? 'system-sourced' : source === 'modeled' ? 'modeled' : 'unknown'
      const record = systems[id] ??= { pwsid: identity.pwsid, placeId: identity.placeId, name: identity.name, boundarySource, providers: [], sourceUrls: [], boundaryDates: [], wholesale: wholesaleIds.includes(id) }
      if (record.boundarySource !== boundarySource) record.boundarySource = 'unknown'
      const provider = f.properties?.Original_Data_Provider, date = f.properties?.Original_Data_Created_Date
      if (provider && !record.providers.includes(String(provider))) record.providers.push(String(provider))
      const url = String(f.properties?.Data_Source ?? '')
      if (/^https:\/\//.test(url) && !record.sourceUrls!.includes(url)) record.sourceUrls!.push(url)
      if (date && !record.boundaryDates.includes(String(date))) record.boundaryDates.push(String(date))
    }
    return { f, id, bbox, matched: !!identity }
  })
  for (const zcta of zctas) {
    const zip = String(zcta.properties?.ZCTA5 ?? '')
    if (!/^\d{5}$/.test(zip)) throw new Error(`Invalid ZCTA ${zip}`)
    const b = bounds(zcta), candidates = new Set(zips[zip] ?? [])
    for (const { f, id, bbox: a, matched } of shapes) {
      if (!matched || a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]) continue
      // Bounding boxes only prune work. Full polygon intersection includes holes and islands.
      // Line/point-only contact is not positive coverage. No arbitrary sliver cutoff.
      const overlap = intersect({ type: 'FeatureCollection', features: [f, zcta] })
      const squareMeters = overlap ? area(overlap) : 0
      if (squareMeters > 0) {
        candidates.add(id)
        if (squareMeters < 100) audit.smallIntersections.push({ zip, pwsid: id, squareMeters })
      }
    }
    zips[zip] = [...candidates].sort()
  }
  audit.unmatchedBoundaryIds = [...new Set(audit.unmatchedBoundaryIds)].sort()
  audit.duplicateBoundaryIds = [...new Set(audit.duplicateBoundaryIds)].sort()
  audit.directoryWithoutBoundary = directory.filter(s => !seen.has(s.pwsid)).map(s => s.pwsid).sort()
  const result: ZipIndex = { schemaVersion: 1, zips, systems }
  return { ...result, audit }
}
