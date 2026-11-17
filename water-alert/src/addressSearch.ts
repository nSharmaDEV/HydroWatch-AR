/**
 * Address lookup behind one module. Components call only `searchAddresses` and
 * `reverseGeocode` and receive the normalized `AddressResult`, so changing
 * provider means editing this file only.
 *
 * Prototype provider: Photon (https://photon.komoot.io), no key needed. It is a
 * shared public demo server: rate-limited and not meant for production traffic.
 * To switch to Google Places or Mapbox, replace `search`/`reverse` below and
 * read the key from `VITE_ADDRESS_API_KEY` (a browser-visible key, so restrict it
 * by domain, or proxy through the API server instead).
 */
export interface AddressResult { id: string; label: string; lat: number; lng: number; components: Record<string, string> }

/** minLon, minLat, maxLon, maxLat roughly covering Arkansas. */
const ARKANSAS_BBOX = [-94.62, 33.0, -89.64, 36.5] as const
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
const PHOTON = ENV.VITE_ADDRESS_API_URL ?? 'https://photon.komoot.io'
export const ADDRESS_API_KEY = ENV.VITE_ADDRESS_API_KEY
export const MIN_ADDRESS_QUERY = 4
export const MAX_SUGGESTIONS = 5
const MAX_LABEL = 200

interface PhotonFeature { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }

const text = (v: unknown) => typeof v === 'string' ? v.trim() : ''
const inArkansas = (lat: number, lng: number) => lng >= ARKANSAS_BBOX[0] && lat >= ARKANSAS_BBOX[1] && lng <= ARKANSAS_BBOX[2] && lat <= ARKANSAS_BBOX[3]

/** Normalize one Photon GeoJSON feature; returns null for anything outside Arkansas or without a usable point/label. */
export function normalizePhotonFeature(feature: PhotonFeature): AddressResult | null {
  const p = feature.properties ?? {}, c = feature.geometry?.coordinates
  if (feature.geometry?.type !== 'Point' || !Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') return null
  const [lng, lat] = c as [number, number]
  const state = text(p.state), country = text(p.countrycode).toUpperCase()
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || country && country !== 'US' || state && state !== 'Arkansas' && state !== 'AR' || !inArkansas(lat, lng)) return null
  const street = [text(p.housenumber), text(p.street)].filter(Boolean).join(' ')
  const first = street || text(p.name)
  if (!first) return null
  const place = text(p.city) || text(p.town) || text(p.village) || text(p.district) || text(p.county)
  const label = [first, place, [state ? 'AR' : '', text(p.postcode)].filter(Boolean).join(' ')].filter(Boolean).join(', ').slice(0, MAX_LABEL)
  if (!label) return null
  const components: Record<string, string> = {}
  for (const key of ['name', 'housenumber', 'street', 'city', 'district', 'county', 'state', 'postcode', 'country'] as const) { const v = text(p[key]); if (v) components[key] = v.slice(0, 100) }
  const id = `${text(p.osm_type)}${p.osm_id ?? ''}` || `${lat},${lng}`
  return { id: `${id}:${label}`, label, lat, lng, components }
}

export function normalizePhotonResponse(body: unknown): AddressResult[] {
  const features = (body as { features?: unknown } | null)?.features
  if (!Array.isArray(features)) return []
  const seen = new Set<string>()
  return features.flatMap(f => { const r = normalizePhotonFeature(f as PhotonFeature); return r && !seen.has(r.label) && seen.add(r.label) ? [r] : [] }).slice(0, MAX_SUGGESTIONS)
}

async function getJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Address lookup failed (${response.status})`)
  return response.json() as Promise<unknown>
}

const DIRECTIONALS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'])
const titleWord = (w: string) => DIRECTIONALS.has(w.toUpperCase()) ? w.toUpperCase() : /^\d/.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
const titleCase = (s: string) => s.split(/\s+/).map(titleWord).join(' ')

/** Normalize the API server's Census matches (US Census geocoder, which has house-number data). */
export function normalizeCensusResponse(body: unknown): AddressResult[] {
  const matches = (body as { matches?: unknown } | null)?.matches
  if (!Array.isArray(matches)) return []
  return matches.flatMap(m => {
    const r = m as { label?: unknown; lat?: unknown; lng?: unknown; city?: unknown; zip?: unknown }
    if (typeof r.label !== 'string' || typeof r.lat !== 'number' || typeof r.lng !== 'number' || !inArkansas(r.lat, r.lng)) return []
    const [street = '', city = ''] = r.label.split(',').map(s => s.trim())
    const zip = typeof r.zip === 'string' ? r.zip : ''
    const label = [titleCase(street), titleCase(city), ['AR', zip].filter(Boolean).join(' ')].filter(Boolean).join(', ').slice(0, MAX_LABEL)
    const components: Record<string, string> = { street: titleCase(street), city: titleCase(city), state: 'Arkansas', ...(zip ? { postcode: zip } : {}) }
    const num = street.match(/^\d+\S*/)?.[0]
    if (num) components.housenumber = num
    return [{ id: `census:${label}`, label, lat: r.lat, lng: r.lng, components }]
  }).slice(0, MAX_SUGGESTIONS)
}

/** House-number matches from the Census geocoder via our API server. Returns [] when the API is unavailable (e.g. UI-only dev). */
async function searchCensus(q: string, signal?: AbortSignal): Promise<AddressResult[]> {
  if (!/^\d+\S*\s+\S/.test(q) || q.length < 8) return []
  try {
    const response = await fetch('/api/geocode-address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: q }), signal })
    if (!response.ok) return []
    return normalizeCensusResponse(await response.json())
  } catch (e) { if ((e as Error).name === 'AbortError') throw e; return [] }
}

/** Suggestions for typed text, biased and limited to Arkansas. Throws on network failure; abort throws AbortError.
 *  When the text starts with a house number, Census matches (exact house number) are listed first. */
export async function searchAddresses(query: string, signal?: AbortSignal): Promise<AddressResult[]> {
  const q = query.trim()
  // A bare number ("1908") makes the map service guess unrelated places; wait for the street name.
  if (q.length < MIN_ADDRESS_QUERY || /^\d+$/.test(q)) return []
  const params = new URLSearchParams({ q, limit: '10', bbox: ARKANSAS_BBOX.join(','), lat: '35.2', lon: '-92.4' })
  const [census, photon] = await Promise.allSettled([searchCensus(q, signal), getJson(`${PHOTON}/api/?${params}`, signal)])
  if (census.status === 'rejected') throw census.reason
  const exact = census.value
  if (photon.status === 'rejected') { if (exact.length) return exact; throw photon.reason }
  const seen = new Set(exact.map(r => r.label.toLowerCase()))
  const rest = normalizePhotonResponse(photon.value).filter(r => !seen.has(r.label.toLowerCase()))
  return [...exact, ...rest].slice(0, MAX_SUGGESTIONS)
}

/** First result that is an actual street address; a bare city or county polygon is not an address. */
export function pickStreetAddress(results: AddressResult[]): AddressResult | null {
  return results.find(r => r.components.street) ?? null
}
/** Nearest Arkansas street address for a point, or null when there is none. */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<AddressResult | null> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: '10' })
  const all = (await getJson(`${PHOTON}/reverse?${params}`, signal) as { features?: PhotonFeature[] }).features ?? []
  // Normalize without the five-result cap so a street address behind a city polygon is still found.
  return pickStreetAddress(all.flatMap(f => { const r = normalizePhotonFeature(f); return r ? [r] : [] }))
}

/** Runtime check for a stored selection (draft persistence, server validation). */
export function isAddressResult(v: unknown): v is AddressResult {
  const r = v as AddressResult | null
  return !!r && typeof r === 'object' && typeof r.id === 'string' && typeof r.label === 'string' && !!r.label.trim() && r.label.length <= MAX_LABEL
    && Number.isFinite(r.lat) && Number.isFinite(r.lng) && Math.abs(r.lat) <= 90 && Math.abs(r.lng) <= 180
    && !!r.components && typeof r.components === 'object' && Object.entries(r.components).length <= 20 && Object.values(r.components).every(x => typeof x === 'string' && x.length <= 100)
}
