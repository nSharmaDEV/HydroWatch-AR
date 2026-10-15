// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ObservationStore } from '../server/store'
import { SourceRunner } from '../server/sources'
import { EMPTY_SOURCES, SOURCES, type Notice } from '../src/domain'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
async function store() { const dir = await mkdtemp(join(tmpdir(), 'water-alert-test-')); dirs.push(dir); return { dir, db: new ObservationStore(dir) } }
const n: Notice = { id: 'ADH:test-event', placeId: 'ADH:test-system', agency: 'ADH', kind: 'boil', name: 'Test system', county: 'Benton', area: 'Test area', issued: '10/01/2026', lifted: null, reason: 'Test reason', url: SOURCES.ADH }
describe('local observations', () => {
  it('persists future change events but suppresses each agency initial archive', async () => {
    const { db, dir } = await store()
    await db.success('ADH', [n], '2026-10-01T12:00:00Z')
    expect((await db.read()).events).toEqual([])
    await db.success('ADH', [n, { ...n, id: 'ADH:second' }], '2026-10-01T12:05:00Z')
    await db.success('ADH', [{ ...n, lifted: '10/02/2026' }], '2026-10-02T12:00:00Z')
    await db.success('ADH', [{ ...n, lifted: '10/02/2026' }], '2026-10-02T12:05:00Z')
    const state = await new ObservationStore(dir).read()
    expect(state.events.map(e => e.type)).toEqual(['new', 'lifted'])
    expect(state.events[0].observedAt).toBe('2026-10-01T12:05:00Z')
    expect(new Set(state.events.map(e => e.id)).size).toBe(2)
  })
  it('persists observations across restarts and counts one notice across repeat checks', async () => {
    const { db, dir } = await store()
    await db.success('ADH', [n], '2026-10-01T12:00:00Z')
    await db.success('ADH', [n], '2026-10-01T12:05:00Z')
    const state = await new ObservationStore(dir).read()
    expect(state.archive).toHaveLength(1)
    expect(state.archive[0].firstObservedAt).toBe('2026-10-01T12:00:00Z')
    expect(state.archive[0].lastObservedAt).toBe('2026-10-01T12:05:00Z')
    expect(state.coverageStart).toBe('2026-10-01T12:00:00Z')
    expect(state.places[0].name).toBe('Test system')
  })
  it('retains prior records after a failed check without claiming fresh success', async () => {
    const { db } = await store(); await db.success('ADH', [n], '2026-10-01T12:00:00Z')
    await db.failure('ADH', 'Timeout', '2026-10-01T12:05:00Z')
    const s = (await db.read()).sources.find(s => s.agency === 'ADH')!
    expect(s.records).toHaveLength(1); expect(s.error).toBe('Timeout')
    expect(s.lastSuccessAt).toBe('2026-10-01T12:00:00Z')
  })
  it('never turns a vanished row into a lift and deduplicates reappearing events', async () => {
    const { db } = await store()
    expect((await db.success('ADH', [n], '2026-10-01T12:00:00Z')).map(e => e.type)).toEqual(['new'])
    expect(await db.success('ADH', [], '2026-10-01T12:05:00Z')).toEqual([])
    expect((await db.read()).archive[0].lifted).toBeNull()
    expect(await db.success('ADH', [n], '2026-10-01T12:10:00Z')).toEqual([])
    expect((await db.success('ADH', [{ ...n, lifted: '10/02/2026' }], '2026-10-02T12:00:00Z')).map(e => e.type)).toEqual(['lifted'])
    expect(await db.success('ADH', [{ ...n, lifted: '10/02/2026' }], '2026-10-02T12:05:00Z')).toEqual([])
  })
  it('rejects sample records from the live archive', async () => {
    const { db } = await store()
    await expect(db.success('ADH', [{ ...n, id: 'sample-boil' }], '2026-10-01T12:00:00Z')).rejects.toThrow(/sample/i)
    expect((await db.read()).archive).toEqual([])
  })
})
describe('bounded approved-source retrieval', () => {
  it('records just one failed outcome if validated capture persistence fails', async () => {
    const { dir } = await store()
    const db = new ObservationStore(dir, async (_agency, _body, metadata) => { if (metadata.schemaValidated) throw new Error('Capture write failed') })
    const html = await readFile(new URL('./fixtures/adh-recorded.html', import.meta.url), 'utf8')
    const json = await readFile(new URL('./fixtures/adeq-recorded.json', import.meta.url), 'utf8')
    await new SourceRunner(db, async input => new Response(String(input) === SOURCES.ADH ? html : json)).check()
    const state = await db.read()
    expect(state.sources.map(s => s.checks?.map(c => c.outcome))).toEqual([['failure'], ['failure']])
    expect(state.sources.every(s => s.lastSuccessfulCheck === null)).toBe(true)
    expect(state.archive).toEqual([])
  })
  it('fetches only approved URLs and never interprets unknown formats as emptiness', async () => {
    const { db, dir } = await store(); const urls: string[] = []
    const runner = new SourceRunner(db, async input => { urls.push(String(input)); return new Response('<html>unknown</html>') }, () => Date.parse('2026-10-13T12:00:00Z'))
    await runner.check()
    expect(urls.sort()).toEqual(Object.values(SOURCES).sort())
    const state = await db.read()
    expect(state.sources.every(s => s.error?.includes('format'))).toBe(true)
    expect(state.sources.every(s => s.lastSuccessAt === null)).toBe(true)
    expect(state.archive).toEqual([])
    expect(await readFile(join(dir, 'captures', 'ADH.html'), 'utf8')).toContain('unknown')
  })
  it('parses recorded agency responses into durable live observations', async () => {
    const { db, dir } = await store()
    const html = await readFile(new URL('./fixtures/adh-recorded.html', import.meta.url), 'utf8')
    const json = await readFile(new URL('./fixtures/adeq-recorded.json', import.meta.url), 'utf8')
    const runner = new SourceRunner(db, async input => new Response(String(input) === SOURCES.ADH ? html : json), () => Date.parse('2026-10-13T12:00:00Z'))
    await runner.check()
    const state = await new ObservationStore(dir).read()
    expect(state.sources.every(s => s.error === null && s.lastSuccessAt === '2026-10-13T12:00:00.000Z')).toBe(true)
    expect(state.archive.some(n => n.name === 'BANKS WATERWORKS' && !n.lifted)).toBe(true)
    expect(state.archive.filter(n => n.name === 'CROSS COUNTY RURAL WATER SYS')).toHaveLength(1)
    expect(state.places.length).toBeGreaterThan(10)
    expect(JSON.parse(await readFile(join(dir, 'captures', 'ADH.metadata.json'), 'utf8')).schemaValidated).toBe(true)
  })
  it('retains the prior snapshot when a later response is malformed or unexpectedly empty', async () => {
    const { db } = await store()
    await db.success('ADH', [n], '2026-10-01T12:00:00Z')
    const runner = new SourceRunner(db, async input => new Response(String(input) === SOURCES.ADH ? '<html>Error</html>' : '{"updated":"October 13, 2026","advisories":[]}'), () => Date.parse('2026-10-13T12:00:00Z'))
    await runner.check()
    const state = await db.read()
    const source = state.sources.find(s => s.agency === 'ADH')!
    expect(source.error).toContain('format')
    expect(source.records).toHaveLength(1)
    expect(source.lastSuccessAt).toBe('2026-10-01T12:00:00Z')
    expect(state.archive[0].lifted).toBeNull()
  })
  it('retains source state on network errors and rate-limits duplicate checks', async () => {
    const { db } = await store(); let calls = 0
    const runner = new SourceRunner(db, async () => { calls++; throw new Error('network offline') }, () => Date.parse('2026-10-13T12:00:00Z'))
    await Promise.all([runner.check(), runner.check()]); await runner.check()
    expect(calls).toBe(2)
    expect((await db.read()).sources.every(s => s.error === 'Source retrieval failed')).toBe(true)
  })
  it('rejects redirects rather than fetching an unapproved destination', async () => {
    const { db } = await store()
    const runner = new SourceRunner(db, async () => new Response('', { status: 302, headers: { Location: 'https://unapproved.invalid' } }))
    await runner.check()
    expect((await db.read()).sources.every(s => s.error?.includes('HTTP 302'))).toBe(true)
  })
})
