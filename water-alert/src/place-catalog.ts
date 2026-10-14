import type { Notice, Place } from './domain'

// Manually verified on 2026-10-13. These pages establish place identity, not
// current conditions, monitoring completeness, or a household's service area.
// Supplier IDs use the existing ADH parser's hash of the exact published name.
export const PLACE_CATALOG: { place: Place; url: string; verifiedOn: string; noticeNames?: string[] }[] = [
  { place: { id: 'ADEQ:catalog:beaver-lake', name: 'Beaver Lake', kind: 'lake', county: 'Benton, Washington, Carroll, Madison' }, url: 'https://www.swl.usace.army.mil/Missions/Recreation/Lakes/Beaver-Lake/Dam-and-Lake-Information/', verifiedOn: '2026-10-13', noticeNames: ['Beaver Lake'] },
  { place: { id: 'ADEQ:catalog:buffalo-national-river', name: 'Buffalo National River', kind: 'lake', county: 'Northern Arkansas', aliases: ['Buffalo River'] }, url: 'https://www.nps.gov/buff/learn/nature/waterquality.htm', verifiedOn: '2026-10-13', noticeNames: ['Buffalo National River', 'Buffalo River'] },
  { place: { id: 'ADH:d0d0e4d6d963087023a220d1e53cce5144fba15898034786ef95734647f08275', name: 'FAYETTEVILLE WATERWORKS', kind: 'system', county: 'Washington' }, url: 'https://health.arkansas.gov/Eng/WS.aspx?ID=569', verifiedOn: '2026-10-13' },
  { place: { id: 'ADH:053f9d9a4da2a01c88521af3b90956c809eb8a96e3df0304ab4cfa8956163140', name: 'SPRINGDALE WATER UTILITIES', kind: 'system', county: 'Washington' }, url: 'https://health.arkansas.gov/Eng/WS.aspx?ID=575', verifiedOn: '2026-10-13' },
  { place: { id: 'ADH:ee7fdb65f65842e938d8b03b2ad2316ae23a827ee37db5e36728540a52bf09b7', name: 'ROGERS WATER UTILITIES', kind: 'system', county: 'Benton' }, url: 'https://health.arkansas.gov/Eng/WS.aspx?ID=055', verifiedOn: '2026-10-13' },
  { place: { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', kind: 'system', county: 'Benton' }, url: 'https://health.arkansas.gov/Eng/WS.aspx?ID=041', verifiedOn: '2026-10-13' },
]

export function catalogEntry(placeId: string) { return PLACE_CATALOG.find(entry => entry.place.id === placeId) }

export function withPlaceCatalog(observed: Place[]): Place[] {
  // Read-only projection: preserve observed names/counties and existing IDs.
  // Directory entries never enter the observation archive or event journal.
  const places = new Map(observed.map(p => [p.id, p]))
  for (const { place } of PLACE_CATALOG) {
    const existing = places.get(place.id)
    places.set(place.id, existing ? { ...place, ...existing, aliases: [...new Set([...(place.aliases ?? []), ...(existing.aliases ?? [])])] } : { ...place })
  }
  return [...places.values()]
}

const nameKey = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().replace(/\s*\*$/, '').toLowerCase()
export function noticeMatchesPlace(placeId: string, notice: Notice): boolean {
  if (placeId === notice.placeId) return true
  const entry = catalogEntry(placeId)
  // Exact verified waterbody names in ADEQ HAB records only. No fuzzy matches,
  // source-water/supplier inference, changed record IDs, or inferred lifts.
  return entry?.place.kind === 'lake' && notice.agency === 'ADEQ' && notice.kind === 'hab'
    ? !!entry.noticeNames?.some(name => nameKey(name) === nameKey(notice.name)) : false
}
