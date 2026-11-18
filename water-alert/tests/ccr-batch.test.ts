// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseBatchArgs, politeFetch, runBatch, coverageAudit, type Checkpoint } from '../scripts/ccr-batch-lib'
import type { SyncResult, Target } from '../scripts/ccr-sync-lib'

const target: Target = { id: 'ADH:a', name: 'A Water', county: 'A', reason: 'missing' }
const unavailable: SyncResult = { report: { year: 2025, state: 'unavailable' }, log: { ...target, outcome: 'unavailable' } }

it('defaults to staged rules-only output, requiring explicit paid-AI and import flags', () => {
  expect(parseBatchArgs([])).toEqual({ dryRun: false, write: false, ai: false, retryFailed: false, validation: false, only: undefined, cache: undefined })
  expect(parseBatchArgs(['--ai', '--validation', '--cache=/external/cache', '--retry-failed'])).toMatchObject({ ai: true, validation: true, cache: '/external/cache', retryFailed: true })
  expect(() => parseBatchArgs(['--dry-run', '--write'])).toThrow('cannot combine')
  expect(() => parseBatchArgs(['--validation', '--only=ADH:a'])).toThrow('cannot combine')
  expect(() => parseBatchArgs(['--al'])).toThrow('Unknown')
})

describe('bounded source-friendly fetch', () => {
  it('paces requests and retries only transient failures with a fixed limit', async () => {
    const waits: number[] = []
    let now = 0, calls = 0
    const fetcher = politeFetch({ delayMs: 1000, retries: 2, now: () => now, sleep: async ms => { waits.push(ms); now += ms }, fetch: async () => { calls++; return new Response('', { status: calls < 3 ? 503 : 200 }) } })
    expect((await fetcher('https://example.test')).status).toBe(200)
    expect(calls).toBe(3)
    expect(waits).toEqual([1000, 2000])
    await fetcher('https://example.test')
    expect(waits.at(-1)).toBe(1000)
  })
  it('does not retry permanent errors and stops after the retry budget', async () => {
    let calls = 0
    const fetcher = politeFetch({ delayMs: 0, retries: 2, sleep: async () => {}, fetch: async () => { calls++; return new Response('', { status: 404 }) } })
    expect((await fetcher('https://example.test')).status).toBe(404)
    expect(calls).toBe(1)
    const down = politeFetch({ delayMs: 0, retries: 1, sleep: async () => {}, fetch: async () => { calls++; throw new Error('offline') } })
    await expect(down('https://example.test')).rejects.toThrow('offline')
    expect(calls).toBe(3)
  })
  it('honors Retry-After and fails rather than hammering a source asking for a long pause', async () => {
    const waits: number[] = []
    let now = 0, calls = 0
    const fetcher = politeFetch({ delayMs: 1000, retries: 1, now: () => now, sleep: async ms => { waits.push(ms); now += ms }, fetch: async () => { calls++; return new Response('', { status: 429, headers: { 'retry-after': '10' } }) } })
    expect((await fetcher('https://example.test')).status).toBe(429)
    expect(waits).toEqual([10000])
    expect(calls).toBe(2)
  })
  it('makes no further requests during a long source cooldown', async () => {
    let calls = 0
    const fetcher = politeFetch({ delayMs: 1000, retries: 1, now: () => 0, sleep: async () => {}, fetch: async () => { calls++; return new Response('', { status: 429, headers: { 'retry-after': '120' } }) } })
    await expect(fetcher('https://example.test')).rejects.toThrow('cooldown')
    await expect(fetcher('https://example.test')).rejects.toThrow('cooldown')
    expect(calls).toBe(1)
  })
})

describe('checkpointed collection', () => {
  it('halts after three consecutive retrieval failures instead of hitting every supplier during an outage', async () => {
    const checkpoint: Checkpoint = {}
    const targets = Array.from({ length: 10 }, (_, i) => ({ ...target, id: `ADH:${i}` }))
    let calls = 0, saved = 0
    const result = await runBatch(targets, checkpoint, { today: '2026-11-18', mode: 'rules', run: async t => { calls++; return { log: { ...t, outcome: 'skipped', failure: 'retrievalFailed' } } }, persist: async () => { saved++ } })
    expect(calls).toBe(3)
    expect(saved).toBe(3)
    expect(result.halted).toBe(true)
    expect(Object.keys(checkpoint)).toHaveLength(3)
  })

  it('persists each completed supplier before starting the next, then resumes without repeating it', async () => {
    const checkpoint: Checkpoint = {}
    const events: string[] = []
    const targets = [target, { ...target, id: 'ADH:b' }]
    await expect(runBatch(targets, checkpoint, { today: '2026-11-18', mode: 'rules', run: async t => {
      events.push(`run ${t.id}`)
      if (t.id === 'ADH:b') throw new Error('interrupted')
      return unavailable
    }, persist: async (state, result) => { expect(result).toBe(unavailable); events.push(`save ${Object.keys(state).length}`) } })).rejects.toThrow('interrupted')
    expect(events).toEqual(['run ADH:a', 'save 1', 'run ADH:b'])
    const resumed: string[] = []
    await runBatch(targets, checkpoint, { today: '2026-11-18', mode: 'rules', run: async t => { resumed.push(t.id); return { ...unavailable, log: { ...unavailable.log, id: t.id } } }, persist: async () => {} })
    expect(resumed).toEqual(['ADH:b'])
  })
  it('rechecks changed identities, dates or modes; retries failed outcomes only when requested', async () => {
    const checkpoint: Checkpoint = {}
    let calls = 0
    const options = { today: '2026-11-18', mode: 'rules', run: async () => { calls++; return { log: { ...target, outcome: 'skipped' as const, failure: 'retrievalFailed' as const } } }, persist: async () => {} }
    await runBatch([target], checkpoint, options)
    await runBatch([target], checkpoint, options)
    expect(calls).toBe(1)
    await runBatch([target], checkpoint, { ...options, retryFailed: true })
    await runBatch([{ ...target, county: 'B' }], checkpoint, options)
    await runBatch([target], checkpoint, { ...options, mode: 'ai' })
    await runBatch([target], checkpoint, { ...options, today: '2026-11-19' })
    expect(calls).toBe(5)
  })
})

it('audits every directory ID while keeping unattempted, failed, ambiguous and reviewed outcomes separate', () => {
  const systems = ['a', 'b', 'c', 'd', 'e', 'f'].map(x => ({ placeId: `ADH:${x}`, pwsid: `AR:${x}`, name: x }))
  const checkpoint: Checkpoint = {
    'ADH:b': { fingerprint: '', checkedOn: '2026-11-18', elapsedMs: 1, log: { ...target, id: 'ADH:b', outcome: 'skipped', failure: 'retrievalFailed' } },
    'ADH:c': { fingerprint: '', checkedOn: '2026-11-18', elapsedMs: 1, log: { ...target, id: 'ADH:c', outcome: 'skipped', failure: 'ambiguous' } },
    'ADH:d': { fingerprint: '', checkedOn: '2026-11-18', elapsedMs: 1, ...unavailable },
  }
  const rows = coverageAudit(systems, { 'ADH:a': [{ year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: 'u', issues: [] }], 'ADH:f': [{ year: 2025, state: 'unavailable' }] }, checkpoint)
  expect(rows.map(r => r.outcome)).toEqual(['humanReviewed', 'retrievalFailed', 'ambiguous', 'notFound', 'notAttempted', 'previouslyUnavailable'])
  expect(rows[0].checkedOn).toBe('2026-10-19')
  expect(rows[5].checkedOn).toBeUndefined()
})
