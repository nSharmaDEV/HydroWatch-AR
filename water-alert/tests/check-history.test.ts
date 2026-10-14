import { expect, it } from 'vitest'
import { checkedChanges, readCheckCursor, saveCheckCursor } from '../src/check-history'
import { EMPTY_SOURCES, SOURCES, type Notice } from '../src/domain'
const at = '2026-10-13T18:00:00Z'
const notice: Notice = { id: 'ADH:new', placeId: 'ADH:place', agency: 'ADH', kind: 'boil', name: 'Water', area: 'Published area', county: 'Benton', issued: '10/13/2026', lifted: null, reason: '', url: SOURCES.ADH }
const snapshot = { sources: EMPTY_SOURCES.map(s => s.agency === 'ADH' ? { ...s, records: [notice], lastSuccessAt: at, error: null } : s), events: [{ id: 'new:ADH:new', type: 'new' as const, notice, observedAt: at }] }
it('uses the first successful view as baseline rather than flooding historical events', () => {
  expect(checkedChanges(snapshot, {}, Date.parse(at))).toEqual([])
  expect(checkedChanges(snapshot, { ADH: '2026-10-13T17:55:00Z' }, Date.parse(at))).toHaveLength(1)
})
it('does not show failed, stale, unknown, vanished or now-lifted notices as new', () => {
  const cursor = { ADH: '2026-10-13T17:55:00Z' }
  expect(checkedChanges(snapshot, cursor, Date.parse(at) + 900000)).toEqual([])
  for (const records of [[], [{ ...notice, liftStatus: 'unknown' as const }], [{ ...notice, lifted: '10/13/2026' }]]) expect(checkedChanges({ ...snapshot, sources: [{ ...snapshot.sources[0], records }] }, cursor, Date.parse(at))).toEqual([])
  expect(checkedChanges({ ...snapshot, sources: [{ ...snapshot.sources[0], error: 'offline' }] }, cursor, Date.parse(at))).toEqual([])
})
it('advances only healthy agency cursors and keeps check history separate from sample data', () => {
  saveCheckCursor(snapshot.sources, Date.parse(at))
  expect(readCheckCursor()).toEqual({ ADH: at })
  saveCheckCursor([{ ...snapshot.sources[0], lastSuccessAt: '2026-10-13T18:05:00Z', error: 'offline' }], Date.parse(at))
  expect(readCheckCursor()).toEqual({ ADH: at })
  expect(localStorage.getItem('water-alert:sample:v1')).toBeNull()
})
