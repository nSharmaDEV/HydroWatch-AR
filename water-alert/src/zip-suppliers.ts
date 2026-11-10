/** Geographic directory hints only. Never an advisory feed or household assignment. */
export interface ZipSupplier {
  pwsid: string
  placeId: string
  name: string
  boundarySource: 'system-sourced' | 'modeled' | 'unknown'
  providers: string[]
  sourceUrls?: string[]
  boundaryDates: string[]
  wholesale?: boolean
}
export interface ZipIndex {
  schemaVersion: 1
  zips: Record<string, string[]>
  systems: Record<string, ZipSupplier>
  provenance?: { checkedOn: string }
}
export type ZipState = 'not-zip' | 'incomplete' | 'invalid' | 'unavailable' | 'no-match' | 'matches'
export interface ZipLookup { state: ZipState; zip: string; candidates: ZipSupplier[] }

export function lookupZip(query: string, index: ZipIndex | null): ZipLookup {
  const zip = query.trim()
  const result = (state: ZipState, candidates: ZipSupplier[] = []): ZipLookup => ({ state, zip, candidates })
  if (!/^\d/.test(zip)) return result('not-zip')
  if (/^\d{1,4}$/.test(zip)) return result('incomplete')
  if (!/^\d{5}$/.test(zip)) return result('invalid')
  if (!index || index.schemaVersion !== 1 || !index.zips || !index.systems) return result('unavailable')
  const ids = index.zips[zip]
  if (ids === undefined) return result('no-match')
  if (!Array.isArray(ids) || ids.some(id => !index.systems[id]?.placeId)) return result('unavailable')
  if (!ids.length) return result('no-match')
  const candidates = [...new Set(ids)].map(id => index.systems[id])
    .sort((a, b) => a.name.localeCompare(b.name, 'en') || a.pwsid.localeCompare(b.pwsid))
  return result('matches', candidates)
}
