import { SOURCES, type Agency } from '../src/domain'
import type { ObservationStore } from './store'
import { parseADH, parseADEQ } from './parsers'

// Parse only the verified source structures; failures retain prior observations.
export class SourceRunner {
  private active: Promise<void> | null = null
  private lastAttempt = -Infinity
  constructor(private store: ObservationStore, private fetcher: typeof fetch = fetch, private clock = Date.now) {}
  check(): Promise<void> {
    if (this.active) return this.active
    if (this.clock() - this.lastAttempt < 60_000) return Promise.resolve()
    this.lastAttempt = this.clock()
    this.active = Promise.all((Object.keys(SOURCES) as Agency[]).map(a => this.retrieve(a))).then(() => {}).finally(() => { this.active = null })
    return this.active
  }
  private async retrieve(agency: Agency) {
    const at = new Date(this.clock()).toISOString()
    let error = 'Source retrieval failed'
    try {
      const response = await this.fetcher(SOURCES[agency], { redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: { Accept: agency === 'ADH' ? 'text/html' : 'application/json' } })
      if (response.status !== 200) { error = `Source HTTP ${response.status}`; throw new Error(error) }
      const declared = Number(response.headers.get('content-length'))
      if (declared > 2_000_000) throw new Error('Oversized source')
      const bytes = await response.arrayBuffer()
      if (bytes.byteLength > 2_000_000) throw new Error('Oversized source')
      const metadata = { url: SOURCES[agency], retrievedAt: at, contentType: response.headers.get('content-type'), schemaValidated: false }
      const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      await this.store.capture(agency, body, metadata)
      error = 'Source format unavailable (schema or empty-feed validation failed)'
      const records = agency === 'ADH' ? parseADH(body) : parseADEQ(body)
      await this.store.capture(agency, body, { ...metadata, schemaValidated: true })
      await this.store.success(agency, records, at)
      return
    } catch { /* Never replace prior records with a fabricated empty snapshot. */ }
    await this.store.failure(agency, error, at)
  }
}
