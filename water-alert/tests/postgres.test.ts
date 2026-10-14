// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { PostgresCell, JobGate, type SqlPool } from '../server/postgres'
import { ObservationStore, emptyState } from '../server/store'
import { PushStore, emptyDevices } from '../server/push'
import { createECDH } from 'node:crypto'
import { SOURCES, type Notice } from '../src/domain'
import { createCloudApp } from '../server/cloud'

// WASM PostgreSQL cold-start competes with UI test workers in the full suite.
describe('shared PostgreSQL backend', { timeout: 20000 }, () => {
const databases: PGlite[] = []
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.close())) })
async function setup() {
  const db = new PGlite(); databases.push(db)
  await db.exec(await readFile(new URL('../server/migrations/001-cloud.sql', import.meta.url), 'utf8'))
  // PGlite is actual embedded PostgreSQL, with one connection. Serialize acquisition.
  let tail = Promise.resolve()
  const pool: SqlPool = { async connect() {
    const prior = tail; let release!: () => void
    tail = new Promise<void>(resolve => { release = resolve }); await prior
    return { query: async (sql, values) => { const result = await db.query(sql, values); return { rows: result.rows as Record<string, unknown>[] } }, release }
  } }
  return { db, pool }
}
it('persists atomic updates across separate instances and rolls back rejected changes', async () => {
  const { pool } = await setup()
  const first = new PostgresCell(pool, 'observations', () => ({ count: 0 }))
  const second = new PostgresCell(pool, 'observations', () => ({ count: 0 }))
  expect(await first.read()).toEqual({ count: 0 })
  await Promise.all(Array.from({ length: 10 }, (_, i) => (i % 2 ? first : second).update(state => { state.count++ })))
  expect(await second.read()).toEqual({ count: 10 })
  await expect(first.update(state => { state.count = 100; throw new Error('reject') })).rejects.toThrow('reject')
  expect(await second.read()).toEqual({ count: 10 })
})
it('shares cooldowns and leases, and an old worker cannot release a newer lease', async () => {
  const { pool } = await setup()
  let now = 1000000
  const a = new JobGate(pool, () => now); const b = new JobGate(pool, () => now)
  const token = await a.claim('sources', 60000, 30000)
  expect(token).toBeTruthy()
  expect(await b.claim('sources', 60000, 30000)).toBeNull()
  now += 60001
  const newer = await b.claim('sources', 60000, 30000)
  expect(newer).toBeTruthy()
  await a.release('sources', token!)
  expect(await a.claim('sources', 0, 30000)).toBeNull()
  await b.release('sources', newer!)
  expect(await a.claim('sources', 0, 30000)).toBeTruthy()
})
it('bounds rate counters across workers rather than trusting per-function memory', async () => {
  const { pool } = await setup()
  let now = 1000000
  const a = new JobGate(pool, () => now); const b = new JobGate(pool, () => now)
  expect(await a.allow('hashed-client', 2)).toBe(true)
  expect(await b.allow('hashed-client', 2)).toBe(true)
  expect(await a.allow('hashed-client', 2)).toBe(false)
  now += 60001
  expect(await b.allow('hashed-client', 2)).toBe(true)
})
it('uses shared observations and claims push attempts before sending across workers', async () => {
  const { pool } = await setup()
  let now = Date.parse('2026-10-13T12:00:00Z')
  const store = new ObservationStore(new PostgresCell(pool, 'observations', emptyState))
  const other = new ObservationStore(new PostgresCell(pool, 'observations', emptyState))
  const a = new PushStore(new PostgresCell(pool, 'devices', emptyDevices), () => now)
  const b = new PushStore(new PostgresCell(pool, 'devices', emptyDevices), () => now)
  const notice: Notice = { id: 'ADH:one', placeId: 'ADH:place', agency: 'ADH', kind: 'boil', name: 'Test', county: 'Benton', area: 'Published area', issued: '10/13/2026', lifted: null, reason: '', url: SOURCES.ADH }
  await store.success('ADH', [notice], new Date(now).toISOString())
  const curve = createECDH('prime256v1'); curve.generateKeys()
  const device = await a.enroll({ subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }, watches: [notice.placeId], liftWatches: [notice.placeId], language: 'en' }, (await other.read()).places)
  now += 300000
  await other.success('ADH', [{ ...notice, lifted: '10/13/2026' }], new Date(now).toISOString())
  let sends = 0
  const send = async () => { sends++; await b.remove(device.token) }
  const state = await store.read()
  await Promise.all([a.drain(state, send), b.drain(state, send)])
  expect(sends).toBe(1)
  expect(await a.remove(device.token)).toBe(false)
})
it('runs cloud checks without filesystem storage and shares scheduling across cold starts', async () => {
  const { pool, db } = await setup()
  let now = Date.parse('2026-10-13T12:00:00Z'); let fetches = 0
  const adh = await readFile(new URL('./fixtures/adh-recorded.html', import.meta.url), 'utf8')
  const adeq = await readFile(new URL('./fixtures/adeq-recorded.json', import.meta.url), 'utf8')
  const fetcher: typeof fetch = async url => { fetches++; return new Response(String(url) === SOURCES.ADH ? adh : adeq) }
  const config = { origin: 'https://water.example', databaseUrl: 'unused', cronSecret: 'a'.repeat(43), push: null }
  const servers = [createCloudApp(pool, config, fetcher, undefined, () => now).listen(0, '127.0.0.1'), createCloudApp(pool, config, fetcher, undefined, () => now).listen(0, '127.0.0.1')]
  try {
    for (const server of servers) await new Promise<void>(resolve => { if (server.listening) resolve(); else server.once('listening', resolve) })
    const bases = servers.map(s => `http://127.0.0.1:${(s.address() as { port: number }).port}`)
    expect((await fetch(`${bases[0]}/api/cron`)).status).toBe(401)
    expect(fetches).toBe(0)
    await Promise.all(bases.map(base => fetch(`${base}/api/cron`, { headers: { Authorization: `Bearer ${config.cronSecret}` } })))
    expect(fetches).toBe(2)
    const response = await fetch(`${bases[1]}/api/status`)
    const state = await response.json()
    expect(state.archive.length).toBeGreaterThan(0)
    expect(state.events).toEqual([])
    expect(state.sources.every((s: { error: unknown }) => s.error === null)).toBe(true)
    expect((await db.query('SELECT * FROM water_alert.captures')).rows).toHaveLength(2)
    now += 60001
    await fetch(`${bases[1]}/api/cron`, { headers: { Authorization: `Bearer ${config.cronSecret}` } })
    expect(fetches).toBe(2)
    now += 240000
    await fetch(`${bases[1]}/api/cron`, { headers: { Authorization: `Bearer ${config.cronSecret}` } })
    expect(fetches).toBe(4)
  } finally { await Promise.all(servers.map(s => new Promise<void>(resolve => s.close(() => resolve())))) }
})
})
