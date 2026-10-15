import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { changes, EMPTY_SOURCES, SOURCES, type Agency, type Notice, type Place, type SourceSnapshot, type SourceCheck } from '../src/domain'
import type { StateCell } from './postgres'

export interface StoredEvent { id: string; type: 'new' | 'lifted'; notice: Notice; observedAt: string }
export interface StoredState { version: 1; sources: SourceSnapshot[]; archive: Notice[]; places: Place[]; coverageStart: string | null; events: StoredEvent[] }
export const emptyState = (): StoredState => ({ version: 1, sources: structuredClone(EMPTY_SOURCES), archive: [], places: [], coverageStart: null, events: [] })
export type CaptureWriter = (agency: Agency, body: string, metadata: Record<string, unknown>) => Promise<void>
// Additive JSON/JSONB migration: archives and visit/event times are not check evidence.
function normalizeChecks(state: StoredState) {
  for (const source of state.sources) {
    source.checks ??= []
    source.lastSuccessfulCheck ??= null
    if (!Array.isArray(source.checks)) throw new Error('Invalid source check journal')
  }
  return state
}
function retainCheck(source: SourceSnapshot, check: SourceCheck) {
  source.checks = [...(source.checks ?? []), check].filter(c => Date.parse(check.at) - Date.parse(c.at) < 30 * 86400_000).slice(-64)
  // Bound full-feed history payloads without ever truncating an individual result.
  const sizes = source.checks.map(c => Buffer.byteLength(JSON.stringify(c), 'utf8'))
  let bytes = sizes.reduce((sum, size) => sum + size, 0)
  while (source.checks.length > 1 && bytes > 1_000_000) { source.checks.shift(); bytes -= sizes.shift()! }
  if (check.outcome === 'success') source.lastSuccessfulCheck = check
}
export class ObservationStore {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(public directory: string | StateCell<StoredState>, private captureWriter?: CaptureWriter) {}
  async capture(agency: Agency, body: string, metadata: Record<string, unknown>): Promise<void> {
    if (this.captureWriter) { await this.captureWriter(agency, body, metadata); return }
    if (typeof this.directory !== 'string') throw new Error('Shared capture writer required')
    const directory = join(this.directory, 'captures'); await mkdir(directory, { recursive: true })
    await writeFile(join(directory, agency === 'ADH' ? 'ADH.html' : 'ADEQ.json'), body, { mode: 0o600 })
    await writeFile(join(directory, `${agency}.metadata.json`), JSON.stringify(metadata, null, 2), { mode: 0o600 })
  }
  async read(): Promise<StoredState> {
    try {
      const state = typeof this.directory === 'string' ? JSON.parse(await readFile(join(this.directory, 'observations.json'), 'utf8')) : await this.directory.read()
      if (state.version !== 1 || !Array.isArray(state.sources) || state.sources.length !== 2 || !Array.isArray(state.archive) || !Array.isArray(state.places)) throw new Error('Invalid observation store; preserve it for inspection')
      state.events ??= [] // Existing archives migrate without replaying historical records.
      if (!Array.isArray(state.events)) throw new Error('Invalid event journal')
      return normalizeChecks(state)
    } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return emptyState(); throw e }
  }
  private update<T>(apply: (state: StoredState) => T): Promise<T> {
    if (typeof this.directory !== 'string') return this.directory.update(state => apply(normalizeChecks(state)))
    const directory = this.directory
    const work = this.queue.then(async () => {
      const state = await this.read(); const result = apply(state)
      await mkdir(directory, { recursive: true })
      const temporary = join(directory, 'observations.json.tmp')
      await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 })
      await rename(temporary, join(directory, 'observations.json'))
      return result
    })
    this.queue = work.catch(() => {})
    return work
  }
  async success(agency: Agency, records: Notice[], at: string) {
    if (records.some(n => /sample/i.test(n.id) || /sample/i.test(n.placeId))) throw new Error('Sample records cannot enter the live archive')
    if (records.some(n => n.agency !== agency || n.url !== SOURCES[agency])) throw new Error('Source provenance mismatch')
    return this.update(state => {
      const previous = state.archive.filter(n => n.agency === agency)
      const events = changes(previous, records)
      if (state.sources.find(s => s.agency === agency)?.lastSuccessAt) {
        const known = new Set(state.events.map(e => e.id))
        for (const event of events) {
          const id = `${event.type}:${event.notice.id}`
          if (!known.has(id)) state.events.push({ ...event, id, observedAt: at })
        }
      }
      state.events = state.events.filter(e => Date.parse(at) - Date.parse(e.observedAt) < 30 * 86400_000)
      const index = new Map(state.archive.map(n => [n.id, n]))
      const observed = records.map(n => ({ ...n, firstObservedAt: index.get(n.id)?.firstObservedAt ?? at, lastObservedAt: at }))
      observed.forEach(n => index.set(n.id, n)); state.archive = [...index.values()]
      state.sources = state.sources.map(s => {
        if (s.agency !== agency) return s
        // Legacy last-success times do not establish when source coverage began.
        const source = { ...s, ...(!s.lastSuccessAt && !s.historyStartedAt ? { historyStartedAt: at } : {}), records: observed, retrievedAt: at, lastSuccessAt: at, error: null }
        retainCheck(source, { at, outcome: 'success', records: structuredClone(observed) })
        return source
      })
      const places = new Map(state.places.map(p => [p.id, p]))
      observed.forEach(n => places.set(n.placeId, { id: n.placeId, name: n.name, county: n.county, kind: n.kind === 'boil' ? 'system' : 'lake' }))
      state.places = [...places.values()]; state.coverageStart ??= at
      return events
    })
  }
  async failure(agency: Agency, error: string, at: string): Promise<void> {
    await this.update(state => { state.sources = state.sources.map(s => {
      if (s.agency !== agency) return s
      const source = { ...s, error, retrievedAt: at }
      retainCheck(source, { at, outcome: 'failure', error })
      return source
    }) })
  }
}
