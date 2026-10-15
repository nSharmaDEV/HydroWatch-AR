// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ObservationStore, emptyState } from '../server/store'
import { SOURCES, type Notice } from '../src/domain'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
async function setup() { const dir = await mkdtemp(join(tmpdir(), 'water-checks-')); dirs.push(dir); return { dir, store: new ObservationStore(dir) } }
const notice: Notice = { id: 'ADH:one', placeId: 'ADH:one', name: 'One', agency: 'ADH', kind: 'boil', county: 'Benton', area: 'Published area', reason: 'Main break', issued: '10/14/2026', lifted: null, url: SOURCES.ADH }

it('retains every actual outcome and immutable successful evidence across restart, independent of notice archive', async () => {
  const { store, dir } = await setup()
  await store.success('ADH', [notice], '2026-10-14T12:00:00Z')
  await store.failure('ADH', 'Source retrieval failed', '2026-10-14T12:05:00Z')
  await store.success('ADH', [{ ...notice, lifted: '10/14/2026' }], '2026-10-14T12:10:00Z')
  const source = (await new ObservationStore(dir).read()).sources[0]
  expect(source.checks?.map(c => c.outcome)).toEqual(['success', 'failure', 'success'])
  const first = source.checks?.[0]
  expect(first?.outcome === 'success' ? first.records[0].lifted : undefined).toBeNull()
  expect(source.checks?.[1]).not.toHaveProperty('records')
  expect(source.lastSuccessfulCheck?.at).toBe('2026-10-14T12:10:00Z')
})

it('does not backfill successful no-match or check times from legacy archives or snapshots', async () => {
  const { dir } = await setup()
  const state = emptyState()
  state.archive = [notice]
  state.sources[0] = { agency: 'ADH', records: [notice], lastSuccessAt: '2026-10-14T12:00:00Z', retrievedAt: '2026-10-14T12:05:00Z', error: 'Timeout' }
  await writeFile(join(dir, 'observations.json'), JSON.stringify(state))
  const source = (await new ObservationStore(dir).read()).sources[0]
  expect(source.checks).toEqual([])
  expect(source.lastSuccessfulCheck).toBeNull()
})

it('bounds retained checks by count and age while keeping one genuine last successful result', async () => {
  const { store } = await setup()
  await store.success('ADH', [notice], '2026-09-01T12:00:00Z')
  for (let i = 0; i < 125; i++) await store.failure('ADH', 'Timeout', new Date(Date.parse('2026-10-14T12:00:00Z') + i * 300000).toISOString())
  const source = (await store.read()).sources[0]
  expect(source.checks).toHaveLength(64)
  expect(source.checks?.every(c => c.outcome === 'failure')).toBe(true)
  expect(source.lastSuccessfulCheck?.at).toBe('2026-09-01T12:00:00Z')
})

it('prunes older complete snapshots by byte budget without truncating the latest evidence', async () => {
  const { store } = await setup()
  const large = { ...notice, reason: 'x'.repeat(550000) }
  await store.success('ADH', [large], '2026-10-14T12:00:00Z')
  await store.success('ADH', [large], '2026-10-14T12:05:00Z')
  const source = (await store.read()).sources[0]
  expect(source.checks).toHaveLength(1)
  expect(source.lastSuccessfulCheck?.records[0].reason).toHaveLength(550000)
})

it('retains notice history independently of disappearance and failures, with a source-specific genuine start', async () => {
  const { store, dir } = await setup()
  await store.failure('ADH', 'Timeout', '2026-10-14T11:00:00Z')
  expect((await store.read()).sources[0].historyStartedAt).toBeUndefined()
  await store.success('ADEQ', [], '2026-10-14T11:30:00Z')
  await store.success('ADH', [notice], '2026-10-14T12:00:00Z')
  await store.success('ADH', [], '2026-10-14T12:05:00Z')
  await store.failure('ADH', 'Timeout', '2026-10-14T12:10:00Z')
  let state = await new ObservationStore(dir).read()
  expect(state.sources[0].historyStartedAt).toBe('2026-10-14T12:00:00Z')
  expect(state.archive).toEqual([expect.objectContaining({ ...notice, firstObservedAt: '2026-10-14T12:00:00Z', lastObservedAt: '2026-10-14T12:00:00Z' })])
  expect(state.events).toEqual([])
  await store.success('ADH', [{ ...notice, lifted: '10/14/2026' }], '2026-10-14T12:15:00Z')
  state = await store.read()
  expect(state.archive[0].lifted).toBe('10/14/2026')
  expect(state.sources[0].historyStartedAt).toBe('2026-10-14T12:00:00Z')
})

it('does not invent a source history start for legacy success timestamps', async () => {
  const { dir } = await setup()
  const state = emptyState()
  state.sources[0].lastSuccessAt = '2026-10-01T12:00:00Z'
  await writeFile(join(dir, 'observations.json'), JSON.stringify(state))
  const store = new ObservationStore(dir)
  await store.success('ADH', [], '2026-10-14T12:00:00Z')
  expect((await store.read()).sources[0].historyStartedAt).toBeUndefined()
})
