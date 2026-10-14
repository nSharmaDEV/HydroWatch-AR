import { SOURCES, type Notice, type Place, type SourceSnapshot } from './domain'

// Entirely fictional places and events. Never submitted to the live store.
export const SAMPLE_NOW = Date.parse('2026-10-13T12:05:00Z')
export const samplePlaces: Place[] = [
  { id: 'ADH:sample-creek', name: 'Sample Creek Water', county: 'Benton', kind: 'system', aliases: ['Sample Creek'] },
  { id: 'ADH:sample-rural', name: 'Sample Creek Rural Water', county: 'Benton', kind: 'system', aliases: ['Sample Creek'] },
  { id: 'ADH:sample-ridge', name: 'Sample Ridge Water', county: 'Washington', kind: 'system' },
  { id: 'ADEQ:sample-cove', name: 'Sample Cove Lake', county: 'Carroll', kind: 'lake' },
  { id: 'ADEQ:sample-meadow', name: 'Sample Meadow Lake', county: 'Madison', kind: 'lake' },
]
export const sampleNotices: Notice[] = [
  { id: 'sample-boil', placeId: 'ADH:sample-creek', name: 'Sample Creek Water', agency: 'ADH', kind: 'boil', county: 'Benton', area: 'Sample: customers on Creek Road between First Street and the north bridge', issued: '10/12/2026', lifted: null, reason: 'Sample: water-main repair', url: SOURCES.ADH, firstObservedAt: '2026-10-12T12:00:00Z', lastObservedAt: '2026-10-13T12:00:00Z' },
  { id: 'sample-hab', placeId: 'ADEQ:sample-cove', name: 'Sample Cove Lake', agency: 'ADEQ', kind: 'hab', county: 'Carroll', area: 'Sample: north cove near the boat ramp', issued: '10/10/2026', lifted: null, reason: 'Sample: published harmful-algal-bloom advisory', url: SOURCES.ADEQ, firstObservedAt: '2026-10-10T12:00:00Z', lastObservedAt: '2026-10-12T12:00:00Z' },
]
export const sampleArchive: Notice[] = [...sampleNotices,
  { ...sampleNotices[0], id: 'sample-past', issued: '10/03/2026', lifted: '10/05/2026', firstObservedAt: '2026-10-03T12:00:00Z', lastObservedAt: '2026-10-05T12:00:00Z' },
]
export function sampleSources(habAvailable = false): SourceSnapshot[] {
  return [
    { agency: 'ADH', records: [sampleNotices[0]], retrievedAt: '2026-10-13T12:00:00Z', lastSuccessAt: '2026-10-13T12:00:00Z', error: null },
    { agency: 'ADEQ', records: [sampleNotices[1]], retrievedAt: '2026-10-13T12:00:00Z', lastSuccessAt: habAvailable ? '2026-10-13T12:00:00Z' : '2026-10-12T12:00:00Z', error: habAvailable ? null : 'Sample: source retrieval failed' },
  ]
}
