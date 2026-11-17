import { expect, test } from 'vitest'
import { isAddressResult, normalizeCensusResponse, normalizePhotonFeature, normalizePhotonResponse, pickStreetAddress, searchAddresses } from '../src/addressSearch'
import { afterEach, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

test('Census matches keep the typed house number, in readable case, and outside Arkansas is dropped', () => {
  const [r, ...rest] = normalizeCensusResponse({ matches: [
    { label: '1908 SW HUNTWICK AVE, BENTONVILLE, AR, 72712', lat: 36.36, lng: -94.2, city: 'BENTONVILLE', zip: '72712' },
    { label: '1 MAIN ST, JOPLIN, MO, 64801', lat: 37.08, lng: -94.5, city: 'JOPLIN', zip: '64801' },
  ] })
  expect(r).toMatchObject({ label: '1908 SW Huntwick Ave, Bentonville, AR 72712', components: { housenumber: '1908' } })
  expect(isAddressResult(r)).toBe(true)
  expect(rest).toEqual([])
})
test('a house-number search lists the Census house-number match first and survives Census being unavailable', async () => {
  const photon = { features: [feature({ street: 'Southwest Huntwick Avenue', city: 'Bentonville', postcode: '72712', osm_type: 'W', osm_id: 1 })] }
  const calls: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(String(url))
    if (String(url).startsWith('/api/geocode-address')) return Response.json({ matches: [{ label: '1908 SW HUNTWICK AVE, BENTONVILLE, AR, 72712', lat: 36.36, lng: -94.2, city: 'BENTONVILLE', zip: '72712' }] })
    return Response.json(photon)
  })
  const found = await searchAddresses('1908 SW Huntwick Ave')
  expect(found.map(r => r.label)).toEqual(['1908 SW Huntwick Ave, Bentonville, AR 72712', 'Southwest Huntwick Avenue, Bentonville, AR 72712'])
  vi.stubGlobal('fetch', async (url: string) => String(url).startsWith('/api/geocode-address') ? new Response('nope', { status: 404 }) : Response.json(photon))
  expect((await searchAddresses('1908 SW Huntwick Ave')).map(r => r.label)).toEqual(['Southwest Huntwick Avenue, Bentonville, AR 72712'])
  calls.length = 0
  vi.stubGlobal('fetch', async (url: string) => { calls.push(String(url)); return Response.json(photon) })
  await searchAddresses('Huntwick Avenue')
  expect(calls.some(c => c.includes('geocode-address'))).toBe(false)
})
import { addressError, selectAddress, typeAddress } from '../src/AddressField'
import { hasAddress, blankRequest } from '../src/help-requests'
import { samplePlaces } from '../src/sample'

const feature = (props: Record<string, unknown>, coordinates: [number, number] = [-94.13, 36.36]) => ({ geometry: { type: 'Point', coordinates }, properties: { countrycode: 'US', state: 'Arkansas', ...props } })

test('Photon features normalize to a labelled point with components', () => {
  const r = normalizePhotonFeature(feature({ housenumber: '1908', street: 'SW Huntwick Ave', city: 'Bentonville', postcode: '72712', osm_type: 'W', osm_id: 7 }))!
  expect(r).toMatchObject({ label: '1908 SW Huntwick Ave, Bentonville, AR 72712', lat: 36.36, lng: -94.13, components: { housenumber: '1908', street: 'SW Huntwick Ave', city: 'Bentonville' } })
  expect(isAddressResult(r)).toBe(true)
})
test('results outside Arkansas, without a point, or without a label are dropped', () => {
  expect(normalizePhotonFeature(feature({ street: 'Main St', city: 'Joplin', state: 'Missouri' }))).toBeNull()
  expect(normalizePhotonFeature(feature({ street: 'Main St', city: 'Dallas' }, [-96.8, 32.8]))).toBeNull()
  expect(normalizePhotonFeature({ geometry: { type: 'LineString', coordinates: [] }, properties: {} })).toBeNull()
  expect(normalizePhotonFeature(feature({}))).toBeNull()
})
test('responses are de-duplicated and limited to five suggestions', () => {
  const features = Array.from({ length: 8 }, (_, i) => feature({ housenumber: String(i), street: 'Oak St', city: 'Rogers' }))
  expect(normalizePhotonResponse({ features })).toHaveLength(5)
  expect(normalizePhotonResponse({ features: [features[0], features[0]] })).toHaveLength(1)
  expect(normalizePhotonResponse(null)).toEqual([])
})
test('picking stores the selection; editing the text clears it; manual stays manual', () => {
  const r = normalizePhotonFeature(feature({ housenumber: '5', street: 'Elm St', city: 'Rogers' }))!
  const picked = selectAddress(r)
  expect(picked).toEqual({ label: r.label, selection: r, manual: false })
  expect(addressError(picked, false)).toBe('')
  const edited = typeAddress(picked, r.label + 'x')
  expect(edited.selection).toBeUndefined()
  expect(addressError(edited, false)).toBe('Choose an address from the list, or enter it manually.')
  expect(typeAddress({ label: 'a', manual: true }, 'rural route 4')).toEqual({ label: 'rural route 4', manual: true })
  expect(addressError({ label: 'rural route 4', manual: true }, false)).toBe('')
  expect(addressError({ label: '', manual: true }, false)).toBe('Enter the address.')
  expect(addressError({ label: '' }, false, true)).toMatch(/Choose an address from the list, or enter it manually/)
})
test('a draft has a usable address only after a pick or manual entry', () => {
  const d = { ...blankRequest(samplePlaces[0]), locations: ['12 Rural Rd'] }
  expect(hasAddress(d)).toBe(false)
  expect(hasAddress({ ...d, addressManual: true })).toBe(true)
  const r = normalizePhotonFeature(feature({ housenumber: '5', street: 'Elm St', city: 'Rogers' }))!
  expect(hasAddress({ ...d, locations: [r.label], addressSelection: r })).toBe(true)
  expect(hasAddress({ ...d, locations: ['changed'], addressSelection: r })).toBe(false)
})
test('reverse geocoding skips a city polygon and returns the street address', () => {
  const city = normalizePhotonFeature(feature({ name: 'Bentonville', state: 'Arkansas' }))!
  const house = normalizePhotonFeature(feature({ housenumber: '113', street: 'North Main Street', city: 'Bentonville', state: 'AR', postcode: '72712' }))!
  expect(city.label).toBe('Bentonville, AR')
  expect(pickStreetAddress([city, house])).toBe(house)
  expect(pickStreetAddress([city])).toBeNull()
})
