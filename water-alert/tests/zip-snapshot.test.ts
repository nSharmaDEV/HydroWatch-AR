import { expect, it } from 'vitest'
import snapshot from '../src/directory/zip-suppliers.json'
import { DIRECTORY, withDirectory } from '../src/water-system-directory'
import { lookupZip, type ZipIndex } from '../src/zip-suppliers'

it('keeps every shipped ZIP candidate tied to the existing directory identity', () => {
  const places = withDirectory([])
  const index = snapshot as ZipIndex
  for (const [zip, ids] of Object.entries(index.zips)) {
    expect(zip).toMatch(/^\d{5}$/)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      const system = DIRECTORY.systems.find(s => s.pwsid === id)!
      expect(system).toBeDefined()
      expect(index.systems[id].placeId).toBe(system.placeId)
      expect(places.some(p => p.id === system.placeId)).toBe(true)
    }
  }
})
it('preserves the three modeled boundaries in this pinned EPA snapshot', () => {
  expect(Object.values(snapshot.systems).filter(s => s.boundarySource === 'modeled').map(s => s.pwsid).sort()).toEqual(['AR0000503', 'AR0000883', 'AR0001240'])
})
it('distinguishes urban, rural, overlapping and missing ZIP records without changing status', () => {
  const index = snapshot as ZipIndex
  expect(lookupZip('72201', index).candidates.map(s => s.pwsid)).toContain('AR0000465')
  expect(lookupZip('72025', index).candidates.length).toBeGreaterThan(1)
  expect(lookupZip('72712', index).candidates.length).toBeGreaterThan(3)
  expect(lookupZip('99999', index).state).toBe('no-match')
  expect(snapshot.provenance.hashes.boundaries).toMatch(/^[a-f0-9]{64}$/)
})
