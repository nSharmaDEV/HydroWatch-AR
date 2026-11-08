import type { Place } from './domain.js'
import snapshot from './directory/epa-water-systems.json' with { type: 'json' }

/**
 * Statewide EPA SDWIS snapshot of active Arkansas community water systems.
 * DIRECTORY-ONLY: identity, county and contact fields. It is never an advisory
 * feed, never proves a household's supplier, and never changes advisory status.
 * Refresh with `npm run directory:epa` (prints a diff for review; --write saves).
 */
export interface DirectorySystem { pwsid: string; name: string; county: string; placeId: string; population?: number; email?: string; phone?: string }
export const DIRECTORY: { source: string; checkedOn: string; filter: string; systems: DirectorySystem[] } = snapshot
export const epaRecordUrl = (pwsid: string) => `https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/${pwsid}/JSON`

/**
 * Reviewed links from a directory system to an ADH boil-list name that differs
 * from the EPA name. Each entry needs a source row that names both. `adhPlaceId`
 * is the ADH parser hash of `adhName`. No fuzzy, city or county matching.
 */
export const REVIEWED_ADH_ALIASES: readonly { pwsid: string; adhName: string; adhPlaceId: string; url: string; reviewedOn: string }[] = []

const byPlace = new Map<string, DirectorySystem>()
const duplicateNames = new Set<string>()
for (const s of DIRECTORY.systems) {
  if (byPlace.has(s.placeId)) duplicateNames.add(s.placeId)
  byPlace.set(s.placeId, s)
}
// Two EPA systems with one published name cannot be told apart by ADH name.
for (const id of duplicateNames) byPlace.delete(id)

export function directorySystem(placeId: string): DirectorySystem | undefined { return byPlace.get(placeId) }

/** ADH place IDs that may carry this system's notices: exact name, plus reviewed aliases. */
export function adhPlaceIdsFor(placeId: string): string[] {
  const s = byPlace.get(placeId)
  if (!s) return [placeId]
  return [placeId, ...REVIEWED_ADH_ALIASES.filter(a => a.pwsid === s.pwsid).map(a => a.adhPlaceId)]
}

/** Read-only projection for search. Never enters observations, journals or notifications state. */
export function withDirectory(places: Place[]): Place[] {
  const merged = new Map(places.map(p => [p.id, p]))
  for (const s of byPlace.values()) {
    const existing = merged.get(s.placeId)
    merged.set(s.placeId, existing
      ? { ...existing, aliases: [...new Set([...(existing.aliases ?? []), s.pwsid])] }
      : { id: s.placeId, name: s.name, kind: 'system', county: s.county, aliases: [s.pwsid] })
  }
  return [...merged.values()]
}
