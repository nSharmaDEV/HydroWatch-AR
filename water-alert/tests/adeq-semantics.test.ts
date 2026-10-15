// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { parseADEQ } from '../server/parsers'
import { ObservationStore } from '../server/store'
import { changes, statusFor, type Notice } from '../src/domain'

const issued = 'June 21, 2019', updated = 'September 28, 2026', at = '2026-10-14T12:21:00Z'
const parse = (lifted: string) => parseADEQ(JSON.stringify({ updated, advisories: [{ waterbody: 'Synthetic Lake *', county: 'Crittenden County', area: 'Synthetic area', date: issued, lifted }] }))[0]

it('keeps blank, unknown and dated ADEQ lifts distinct without changing identity', () => {
  const blank = parse(''), unknown = parse('N/A'), dated = parse('September 29, 2026')
  expect(new Set([blank.id, unknown.id, dated.id]).size).toBe(1)
  expect(blank).toMatchObject({ lifted: null, issued, sourceUpdatedAt: updated, reason: '' })
  expect(blank.liftStatus).toBeUndefined()
  expect(unknown).toMatchObject({ lifted: null, liftStatus: 'unknown' })
  expect(dated).toMatchObject({ lifted: 'September 29, 2026' })
  expect(dated.liftStatus).toBeUndefined()
  const state = (notice: Notice) => statusFor(notice.placeId, { agency: 'ADEQ', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }, Date.parse(at)).state
  expect(state(blank)).toBe('active')
  expect(state(unknown)).toBe('unavailable')
  expect(state(dated)).toBe('none')
})
it('never produces new/lifted events for unknown records or their apparent lift', () => {
  const unknown = parse('N/A'), blank = parse(''), dated = parse('September 29, 2026')
  expect(changes([], [unknown])).toEqual([])
  expect(changes([blank], [unknown])).toEqual([])
  expect(changes([unknown], [dated])).toEqual([])
  expect(changes([unknown], [blank])).toEqual([])
  expect(changes([], [blank]).map(e => e.type)).toEqual(['new'])
  expect(changes([blank], [dated]).map(e => e.type)).toEqual(['lifted'])
})
it('persists agency facts separately from app retrievals without unknown notification events', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'adeq-semantics-'))
  try {
    const store = new ObservationStore(directory), unknown = parse('N/A')
    await store.success('ADEQ', [parse('September 29, 2026')], '2026-10-13T12:00:00Z')
    expect(await store.success('ADEQ', [unknown], at)).toEqual([])
    const state = await new ObservationStore(directory).read()
    expect(state.archive[0]).toMatchObject({ issued, sourceUpdatedAt: updated, firstObservedAt: '2026-10-13T12:00:00Z', lastObservedAt: at, liftStatus: 'unknown' })
    expect(state.sources.find(s => s.agency === 'ADEQ')).toMatchObject({ retrievedAt: at, lastSuccessAt: at })
    expect(state.events).toEqual([])
    expect(await store.success('ADEQ', [parse('September 29, 2026')], '2026-10-14T12:26:00Z')).toEqual([])
    expect((await store.read()).events).toEqual([])
  } finally { await rm(directory, { recursive: true, force: true }) }
})
it('retains the empty-feed guard despite the agency frontend empty-state branch', () => {
  expect(() => parseADEQ(JSON.stringify({ updated, advisories: [] }))).toThrow('empty-feed semantics not verified')
})
