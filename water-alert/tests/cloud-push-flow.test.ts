// @vitest-environment node
// Recording-only cloud-path rehearsal: no credentials, hosted database or push sends.
import { expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { createECDH } from 'node:crypto'
import type { Server } from 'node:http'
import webpush from 'web-push'
import { createCloudApp } from '../server/cloud'
import type { SqlPool } from '../server/postgres'
import { SOURCES } from '../src/domain'

it('records future new/lift alerts through cron, parsing, PostgreSQL, enrollment and cold-start drains without real transport', async () => {
  const forbidden = vi.spyOn(webpush, 'sendNotification').mockImplementation(async () => { throw new Error('Real transport forbidden in rehearsal') })
  const db = new PGlite()
  const servers: Server[] = []
  try {
    await db.exec(await readFile(new URL('../server/migrations/001-cloud.sql', import.meta.url), 'utf8'))
    let tail = Promise.resolve()
    const pool: SqlPool = { async connect() {
      const prior = tail; let release!: () => void
      tail = new Promise<void>(resolve => { release = resolve }); await prior
      return { query: async (sql, values) => ({ rows: (await db.query(sql, values)).rows as Record<string, unknown>[] }), release }
    } }
    let now = Date.parse('2026-10-17T12:00:00Z')
    let phase = 0
    let failed = false
    const name = '[TEST ONLY] Fictional cloud rehearsal supplier'
    const fetcher: typeof fetch = async url => {
      if (String(url) === SOURCES.ADEQ) return new Response(JSON.stringify({ updated: 'October 17, 2026', advisories: [{ waterbody: '[TEST ONLY] Fictional lake', county: 'Test', area: 'Fictional', date: 'October 16, 2026', lifted: '' }] }))
      if (String(url) !== SOURCES.ADH) throw new Error('Unexpected source in rehearsal')
      if (failed) return new Response('Synthetic failure', { status: 503 })
      const issued = phase === 0 ? '10/16/2026' : `10/${phase < 3 ? 17 : phase + 15}/2026`
      const cells = [issued, phase === 0 ? '10/16/2026' : phase === 2 ? '10/17/2026' : '', name, 'Fictional test area', 'Synthetic rehearsal only', 'Test']
      return new Response(`<table id="GridView1"><tr>${['Date Issued', 'Date Lifted', 'System', 'Area Impacted', 'Reason', 'County'].map(h => `<th>${h}</th>`).join('')}</tr><tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr></table>`)
    }
    const config = { origin: 'https://rehearsal.invalid', databaseUrl: 'unused', cronSecret: 'r'.repeat(43), push: { publicKey: 'recording-only', privateKey: 'unused', subject: 'https://rehearsal.invalid' } }
    const recorded: { title: string; body: string; tag: string; sourceUrl: string; url: string }[] = []
    async function worker() {
      const server = createCloudApp(pool, config, fetcher, async (_subscription, payload) => { recorded.push(JSON.parse(payload)) }, () => now).listen(0, '127.0.0.1')
      servers.push(server)
      await new Promise<void>(resolve => { if (server.listening) resolve(); else server.once('listening', resolve) })
      return `http://127.0.0.1:${(server.address() as { port: number }).port}`
    }
    async function check(base: string) {
      expect((await fetch(`${base}/api/cron`, { headers: { Authorization: `Bearer ${config.cronSecret}` } })).status).toBe(200)
    }
    const first = await worker()
    await check(first)
    const baseline = await (await fetch(`${first}/api/status`)).json()
    expect(baseline.events).toEqual([])
    expect(recorded).toHaveLength(0)
    const place = baseline.places.find((p: { name: string }) => p.name === name)
    expect(place).toBeDefined()
    const curve = createECDH('prime256v1'); curve.generateKeys()
    const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/recording-only', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 3).toString('base64url') } }
    const enrollment = await fetch(`${first}/api/push/device`, { method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription, watches: [place.id], liftWatches: [place.id], language: 'en' }) })
    expect(enrollment.status).toBe(201)
    const { token } = await enrollment.json()
    const headers = { Origin: config.origin, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    async function choices(watch: string, language: 'en' | 'es') {
      expect((await fetch(`${second}/api/push/device`, { method: 'POST', headers, body: JSON.stringify({ subscription, watches: [watch], liftWatches: [watch], language }) })).status).toBe(201)
    }
    // Independent app instance uses persisted observations, choices and claims.
    const second = await worker()
    phase = 1; now += 300001
    await check(second)
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({ title: name, sourceUrl: SOURCES.ADH })
    expect(recorded[0].body).toContain('New published notice')
    expect(recorded[0].url).toMatch(/^\/\?notice=ADH/)
    now += 300001; await check(first)
    expect(recorded).toHaveLength(1)
    await choices(place.id, 'es')
    phase = 2; now += 300001
    await check(first)
    expect(recorded).toHaveLength(2)
    expect(recorded[1].body).toContain('La agencia publicó el levantamiento')
    expect(recorded[1].tag).not.toBe(recorded[0].tag)
    now += 300001; await check(second)
    expect(recorded).toHaveLength(2)
    const final = await (await fetch(`${second}/api/status`)).json()
    expect(final.events.map((event: { type: string }) => event.type).sort()).toEqual(['lifted', 'new'])
    // Removed watches suppress future events; saving choices does not replay history.
    const other = baseline.places.find((p: { name: string }) => p.name === '[TEST ONLY] Fictional lake')
    await choices(other.id, 'es')
    phase = 3; now += 300001; await check(second)
    expect(recorded).toHaveLength(2)
    now++; await choices(place.id, 'en')
    now += 300001; await check(first)
    expect(recorded).toHaveLength(2)
    // Failed retrieval preserves evidence and creates no fabricated event/lift.
    const beforeFailure = await (await fetch(`${first}/api/status`)).json()
    failed = true; phase = 4; now += 300001; await check(second)
    const unavailable = await (await fetch(`${first}/api/status`)).json()
    const priorADH = beforeFailure.sources.find((s: { agency: string }) => s.agency === 'ADH')
    const failedADH = unavailable.sources.find((s: { agency: string }) => s.agency === 'ADH')
    expect(failedADH.error).toBeTruthy()
    expect(failedADH.records).toEqual(priorADH.records)
    expect(failedADH.lastSuccessAt).toBe(priorADH.lastSuccessAt)
    expect(unavailable.events).toEqual(beforeFailure.events)
    expect(recorded).toHaveLength(2)
    failed = false; now += 300001; await check(first)
    expect(recorded).toHaveLength(3)
    expect(recorded[2].body).toContain('New published notice')
    // Removal is durable across workers and idempotent, even with a future event.
    for (const base of [second, first]) expect((await fetch(`${base}/api/push/device`, { method: 'DELETE', headers })).status).toBe(204)
    phase = 5; now += 300001; await check(second)
    expect(recorded).toHaveLength(3)
    const saved = await db.query<{ value: { devices: unknown[] } }>("SELECT value FROM water_alert.state WHERE key = 'devices'")
    expect(saved.rows[0].value.devices).toEqual([])
    expect(forbidden).not.toHaveBeenCalled()
  } finally {
    await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve()))))
    await db.close()
    forbidden.mockRestore()
  }
}, 20000)
