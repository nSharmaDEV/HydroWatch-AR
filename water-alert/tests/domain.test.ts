import { describe, it, expect } from 'vitest'
import { statusFor, resolvePlaces, changes, type Notice, type SourceSnapshot } from '../src/domain'
import { loadPreferences, savePreferences } from '../src/storage'

const notice: Notice = { id: 'one', placeId: 'ADH:Test', name: 'Test', agency: 'ADH', kind: 'boil', area: 'Published area', county: 'Benton', issued: '10/01/2026', lifted: null, reason: 'Repair', url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx' }
const snapshot: SourceSnapshot = { agency: 'ADH', records: [notice], retrievedAt: '2026-10-13T12:00:00Z', lastSuccessAt: '2026-10-13T12:00:00Z', error: null }
const now = Date.parse('2026-10-13T12:01:00Z')
describe('honest status', () => {
  it('keeps blank lifted dates active', () => expect(statusFor(notice.placeId, snapshot, now).state).toBe('active'))
  it('says no-active only on a fresh successful source', () => expect(statusFor('ADH:Other', snapshot, now).state).toBe('none'))
  it('retains prior records as unverified on failure', () => {
    const result = statusFor(notice.placeId, { ...snapshot, error: 'Timeout' }, now)
    expect(result.state).toBe('unavailable'); expect(result.records).toEqual([notice])
  })
  it('expires stale retrievals', () => expect(statusFor(notice.placeId, snapshot, now + 900_000).state).toBe('unavailable'))
  it('does not mistake a future timestamp for fresh evidence', () => expect(statusFor(notice.placeId, snapshot, now - 300_000).state).toBe('unavailable'))
  it('does not infer lift from disappearance', () => expect(changes([notice], [])).toEqual([]))
  it('emits lift only when agency explicitly supplies it', () => expect(changes([notice], [{ ...notice, lifted: '10/13/2026' }])).toEqual([{ type: 'lifted', notice: { ...notice, lifted: '10/13/2026' } }]))
  it('does not announce a historical lifted record as new', () => expect(changes([], [{ ...notice, lifted: '10/12/2026' }])).toEqual([]))
})
describe('explicit resolver and isolation', () => {
  const places = [
    { id: 'ADH:A', name: 'Town A Water', kind: 'system' as const, county: 'Benton', aliases: ['Town'] },
    { id: 'ADH:B', name: 'Town B Water', kind: 'system' as const, county: 'Benton', aliases: ['Town'] },
  ]
  it('returns all ambiguous candidates without choosing a supplier', () => expect(resolvePlaces('town', places).map(p => p.id)).toEqual(['ADH:A', 'ADH:B']))
  it('does not infer a supplier for unknown towns', () => expect(resolvePlaces('Imaginary', places)).toEqual([]))
  it('physically isolates live and sample preferences', () => {
    savePreferences('sample', { watches: ['ADH:A'], language: 'es', liftWatches: [], checkOnOpen: true })
    expect(loadPreferences('live').watches).toEqual([])
    expect(loadPreferences('sample').watches).toEqual(['ADH:A'])
  })
  it('recovers from corrupt stored preferences', () => { localStorage.setItem('water-alert:live:v1', '{'); expect(loadPreferences('live').watches).toEqual([]) })
})
