// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import { createApp } from '../server/app'
import { ObservationStore } from '../server/store'
import { SourceRunner } from '../server/sources'
import { PushStore } from '../server/push'
const servers: Server[] = []; const dirs: string[] = []
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise<void>(resolve => s.close(() => resolve())))); await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
async function setup(enabled = false, options: { cron?: { secret: string; run: () => Promise<void> }; limiter?: () => Promise<boolean>; geocodeFetch?: typeof fetch } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'water-api-test-')); dirs.push(dir)
  const store = new ObservationStore(dir); const pushes = new PushStore(dir)
  const runner = new SourceRunner(store, async () => { throw new Error('offline') })
  const app = createApp({ store, runner, pushes, origin: 'http://localhost:5178', publicKey: enabled ? 'test-key' : null, drain: async () => {}, ...options })
  const server = app.listen(0, '127.0.0.1'); servers.push(server)
  await new Promise<void>(resolve => server.once('listening', resolve))
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}
it('reports disabled push without collecting subscriptions or exposing secrets', async () => {
  const base = await setup()
  const config = await fetch(`${base}/api/push/config`)
  expect(await config.json()).toEqual({ enabled: false, publicKey: null })
  expect(config.headers.get('cache-control')).toBe('no-store')
  const enroll = await fetch(`${base}/api/push/device`, { method: 'POST', headers: { Origin: 'http://localhost:5178', 'Content-Type': 'application/json' }, body: '{}' })
  expect(enroll.status).toBe(503)
})
it('returns only Arkansas address matches from the Census geocoder', async () => {
  let called = ''
  const base = await setup(false, { geocodeFetch: async input => {
    called = String(input)
    return Response.json({ result: { addressMatches: [
      { matchedAddress: '123 MAIN ST, LITTLE ROCK, AR, 72201', addressComponents: { state: 'AR' } },
      { matchedAddress: '123 MAIN ST, MEMPHIS, TN, 38103', addressComponents: { state: 'TN' } },
    ] } })
  } })
  const response = await fetch(`${base}/api/geocode-address`, { method: 'POST', headers: { Origin: 'http://localhost:5178', 'Content-Type': 'application/json' }, body: JSON.stringify({ address: '123 Main St, Little Rock' }) })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ addresses: ['123 MAIN ST, LITTLE ROCK, AR, 72201'] })
  const upstream = new URL(called)
  expect(upstream.hostname).toBe('geocoding.geo.census.gov')
  expect(upstream.searchParams.get('address')).toBe('123 Main St, Little Rock, Arkansas')
})
it('rejects short and oversized address lookups without calling the Census service', async () => {
  let calls = 0
  const base = await setup(false, { geocodeFetch: async () => { calls++; return Response.json({ result: { addressMatches: [] } }) } })
  const post = (address: string) => fetch(`${base}/api/geocode-address`, { method: 'POST', headers: { Origin: 'http://localhost:5178', 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) })
  expect((await post('Main')).status).toBe(400)
  expect((await post('x'.repeat(201))).status).toBe(400)
  expect(calls).toBe(0)
})
it('exposes verified catalog places before any source observation without inventing records or checks', async () => {
  const base = await setup()
  const state = await (await fetch(`${base}/api/status`)).json()
  expect(state.places.map((p: { name: string }) => p.name)).toEqual(expect.arrayContaining(['Beaver Lake', 'Buffalo National River', 'FAYETTEVILLE WATERWORKS', 'SPRINGDALE WATER UTILITIES', 'ROGERS WATER UTILITIES', 'BENTONVILLE WATER UTILITIES']))
  expect(state.archive).toEqual([])
  expect(state.events).toEqual([])
  expect(state.coverageStart).toBeNull()
  expect(state.sources.every((s: { lastSuccessAt: string | null }) => s.lastSuccessAt === null)).toBe(true)
})
it('authenticates scheduled jobs before any checking or delivery', async () => {
  let runs = 0
  const secret = 'a'.repeat(43)
  const base = await setup(false, { cron: { secret, run: async () => { runs++ } } })
  for (const authorization of ['', 'Bearer wrong', `Bearer ${secret}x`]) {
    expect((await fetch(`${base}/api/cron`, { headers: { Authorization: authorization } })).status).toBe(401)
  }
  expect(runs).toBe(0)
  const response = await fetch(`${base}/api/cron`, { headers: { Authorization: `Bearer ${secret}` } })
  expect(response.status).toBe(200)
  expect(runs).toBe(1)
})
it('enforces the injected shared mutation limit', async () => {
  const base = await setup(false, { limiter: async () => false })
  const response = await fetch(`${base}/api/check`, { method: 'POST', headers: { Origin: 'http://localhost:5178' } })
  expect(response.status).toBe(429)
  expect(response.headers.get('retry-after')).toBe('60')
})
it('requires exact origin and validates opt-in inputs without leaking store errors', async () => {
  const base = await setup(true)
  for (const origin of ['https://evil.invalid', 'null', 'http://localhost:5178.evil.invalid', '']) {
    const response = await fetch(`${base}/api/push/device`, { method: 'POST', headers: { ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' }, body: '{}' })
    expect(response.status).toBe(403)
  }
  const response = await fetch(`${base}/api/push/device`, { method: 'POST', headers: { Origin: 'http://localhost:5178', 'Content-Type': 'application/json' }, body: '{}' })
  expect(response.status).toBe(400)
  expect(JSON.stringify(await response.json())).not.toContain('devices.json')
  expect((await fetch(`${base}/api/push/device`, { method: 'DELETE', headers: { Origin: 'http://localhost:5178' } })).status).toBe(401)
})
it('bounds JSON bodies and keeps unavailable source checks honest', async () => {
  const base = await setup(true)
  const large = await fetch(`${base}/api/push/device`, { method: 'POST', headers: { Origin: 'http://localhost:5178', 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(20000) }) })
  expect(large.status).toBe(413)
  const check = await fetch(`${base}/api/check`, { method: 'POST', headers: { Origin: 'http://localhost:5178' } })
  const checked = await check.json()
  expect(checked.sources.every((s: { error: string }) => s.error)).toBe(true)
  expect(checked.sources.every((s: { checks: { outcome: string }[] }) => s.checks.length === 1 && s.checks[0].outcome === 'failure')).toBe(true)
  const saved = await (await fetch(`${base}/api/status`)).json()
  expect(saved.sources).toEqual(checked.sources)
})
