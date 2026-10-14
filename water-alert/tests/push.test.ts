// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createECDH } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PushStore } from '../server/push'
import { ObservationStore } from '../server/store'
import { SOURCES, type Notice } from '../src/domain'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
const n: Notice = { id: 'ADH:event', placeId: 'ADH:system', agency: 'ADH', kind: 'boil', name: 'Test system', county: 'Benton', area: 'Published area', issued: '10/13/2026', lifted: null, reason: '', url: SOURCES.ADH }
const curve = createECDH('prime256v1'); curve.generateKeys()
const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') } }
const input = { subscription, watches: [n.placeId], liftWatches: [n.placeId], language: 'en' as const }
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'water-push-test-')); dirs.push(dir)
  const observations = new ObservationStore(dir)
  let now = Date.parse('2026-10-13T12:00:00Z')
  const pushes = new PushStore(dir, () => now)
  await observations.success('ADH', [n], new Date(now).toISOString())
  return { dir, observations, pushes, clock: () => now, advance: (ms = 300_000) => { now += ms; return new Date(now).toISOString() } }
}
it('only sends future watched changes and remembers acceptance across restarts', async () => {
  const { dir, observations, pushes, advance, clock } = await setup()
  const device = await pushes.enroll(input, (await observations.read()).places)
  const payloads: string[] = []
  const send = async (_s: unknown, payload: string) => { payloads.push(payload) }
  await pushes.drain(await observations.read(), send)
  expect(payloads).toEqual([])
  await observations.success('ADH', [{ ...n, lifted: '10/13/2026' }], advance())
  await pushes.drain(await observations.read(), send)
  await new PushStore(dir, clock).drain(await observations.read(), send)
  expect(payloads).toHaveLength(1)
  expect(JSON.parse(payloads[0])).toMatchObject({ tag: `lifted:${n.id}`, sourceUrl: SOURCES.ADH })
  expect(JSON.parse(payloads[0]).body).toContain('10/13/2026')
  expect(await pushes.remove(device.token)).toBe(true)
  expect(await pushes.remove(device.token)).toBe(false)
})
it('accepts verified catalog watches before an advisory and matches future area-scoped events once', async () => {
  const { pushes, observations, advance } = await setup()
  const lake = 'ADEQ:catalog:beaver-lake'
  const area: Notice = { ...n, id: 'ADEQ:cove-event', placeId: 'ADEQ:cove-place', agency: 'ADEQ', kind: 'hab', name: 'Beaver Lake', area: 'Published cove only', url: SOURCES.ADEQ }
  await observations.success('ADEQ', [{ ...area, id: 'ADEQ:old-event', lifted: '10/12/2026' }], advance(1))
  await pushes.enroll({ ...input, watches: [lake, area.placeId], liftWatches: [lake] }, [...(await observations.read()).places, { id: area.placeId, name: area.name, county: area.county, kind: 'lake' }])
  await observations.success('ADEQ', [area], advance())
  const payloads: string[] = []
  await pushes.drain(await observations.read(), async (_s, p) => { payloads.push(p) })
  await pushes.drain(await observations.read(), async (_s, p) => { payloads.push(p) })
  expect(payloads).toHaveLength(1)
  expect(JSON.parse(payloads[0])).toMatchObject({ sourceUrl: SOURCES.ADEQ, url: `/?notice=${encodeURIComponent(area.id)}` })
  await observations.success('ADEQ', [{ ...area, lifted: '10/13/2026' }], advance())
  await pushes.drain(await observations.read(), async (_s, p) => { payloads.push(p) })
  expect(payloads).toHaveLength(2)
})
it('rejects arbitrary endpoints, sample/unknown watches and malformed keys', async () => {
  const { pushes, observations } = await setup(); const places = (await observations.read()).places
  for (const endpoint of ['https://127.0.0.1/push', 'http://fcm.googleapis.com/push', 'https://fcm.googleapis.com.evil.invalid/push', 'https://user@fcm.googleapis.com/push']) {
    await expect(pushes.enroll({ ...input, subscription: { ...subscription, endpoint } }, places)).rejects.toThrow()
  }
  await expect(pushes.enroll({ ...input, watches: ['ADH:sample'] }, places)).rejects.toThrow()
  await expect(pushes.enroll({ ...input, subscription: { ...subscription, keys: { auth: 'bad', p256dh: 'bad' } } }, places)).rejects.toThrow()
  await expect(pushes.enroll(input, places)).resolves.toHaveProperty('token')
})
it('requires the device bearer token to replace an existing endpoint', async () => {
  const { pushes, observations } = await setup(); const places = (await observations.read()).places
  const device = await pushes.enroll(input, places)
  await expect(pushes.enroll(input, places)).rejects.toThrow(/already/i)
  await expect(pushes.enroll(input, places, 'wrong')).rejects.toThrow()
  await expect(pushes.enroll(input, places, device.token)).resolves.toMatchObject({ token: device.token })
  expect(await pushes.remove('wrong')).toBe(false)
})
it('backs off temporary failures and removes expired browser subscriptions', async () => {
  const { pushes, observations, advance } = await setup()
  await pushes.enroll(input, (await observations.read()).places)
  await observations.success('ADH', [{ ...n, lifted: '10/13/2026' }], advance())
  let calls = 0
  const temporary = async () => { calls++; throw Object.assign(new Error('retry'), { statusCode: 503 }) }
  await pushes.drain(await observations.read(), temporary)
  await pushes.drain(await observations.read(), temporary)
  expect(calls).toBe(1)
  advance(61_000)
  await pushes.drain(await observations.read(), async () => { calls++; throw Object.assign(new Error('gone'), { statusCode: 410 }) })
  advance(61_000)
  await pushes.drain(await observations.read(), temporary)
  expect(calls).toBe(2)
})
it('suppresses stale, failed, unknown and superseded active events', async () => {
  const { pushes, observations, advance } = await setup()
  await pushes.enroll(input, (await observations.read()).places)
  const next = { ...n, id: 'ADH:next' }
  await observations.success('ADH', [n, next], advance())
  const payloads: string[] = []
  const send = async (_s: unknown, p: string) => { payloads.push(p) }
  await observations.failure('ADH', 'offline', advance(1))
  await pushes.drain(await observations.read(), send)
  expect(payloads).toEqual([])
  await observations.success('ADH', [n, { ...next, liftStatus: 'unknown' }], advance(1))
  await pushes.drain(await observations.read(), send)
  expect(payloads).toEqual([])
  await observations.success('ADH', [n, { ...next, lifted: '10/13/2026' }], advance(1))
  await pushes.drain(await observations.read(), send)
  expect(payloads).toEqual([]) // Unknown -> dated lift is not a confirmed transition.
})
it('expires pending alerts instead of delivering old changes after an outage', async () => {
  const { pushes, observations, advance } = await setup()
  await pushes.enroll(input, (await observations.read()).places)
  const next = { ...n, id: 'ADH:next' }
  await observations.success('ADH', [n, next], advance())
  await observations.success('ADH', [n, next], advance(3600_001))
  const payloads: string[] = []
  await pushes.drain(await observations.read(), async (_s, p) => { payloads.push(p) })
  expect(payloads).toEqual([])
})
it('rejects an invalid elliptic-curve point even if key lengths look plausible', async () => {
  const { pushes, observations } = await setup()
  await expect(pushes.enroll({ ...input, subscription: { ...subscription, keys: { ...subscription.keys, p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url') } } }, (await observations.read()).places)).rejects.toThrow()
})
it('removes expired personal subscription data without requiring an enabled sender', async () => {
  const { pushes, observations, advance, dir } = await setup()
  await pushes.enroll(input, (await observations.read()).places)
  advance(90 * 86400_000)
  await pushes.prune()
  expect(JSON.parse(await readFile(join(dir, 'devices.json'), 'utf8')).devices).toEqual([])
})
it('never replays existing journal changes when a device enrolls later or updates choices', async () => {
  const { pushes, observations, advance } = await setup()
  await observations.success('ADH', [{ ...n, lifted: '10/13/2026' }], advance())
  advance(1)
  const device = await pushes.enroll(input, (await observations.read()).places)
  const sent: string[] = []
  const send = async (_s: unknown, p: string) => { sent.push(p) }
  await pushes.drain(await observations.read(), send)
  await pushes.enroll({ ...input, language: 'es' }, (await observations.read()).places, device.token)
  await pushes.drain(await observations.read(), send)
  expect(sent).toEqual([])
})
it('persists claims before transport and respects a per-invocation send budget', async () => {
  const { pushes, observations, advance, dir } = await setup()
  await pushes.enroll(input, (await observations.read()).places)
  await observations.success('ADH', [{ ...n, lifted: '10/13/2026' }], advance())
  let calls = 0
  let claimed: unknown
  const send = async () => {
    calls++
    const devices = JSON.parse(await readFile(join(dir, 'devices.json'), 'utf8')).devices
    claimed = devices[0].attempts[`lifted:${n.id}`]
  }
  await pushes.drain(await observations.read(), send, 0)
  expect(calls).toBe(0)
  await pushes.drain(await observations.read(), send, 1)
  expect(calls).toBe(1)
  expect(claimed).toMatchObject({ tries: 1, accepted: false })
})
it('stops starting sends after the function wall-clock budget is exhausted', async () => {
  const { pushes, observations, advance, clock } = await setup()
  const places = (await observations.read()).places
  await pushes.enroll(input, places)
  await pushes.enroll({ ...input, subscription: { ...subscription, endpoint: `${subscription.endpoint}-second` } }, places)
  await observations.success('ADH', [{ ...n, lifted: '10/13/2026' }], advance())
  let sends = 0
  await pushes.drain(await observations.read(), async () => { sends++; advance(20000) }, 10, clock() + 10000)
  expect(sends).toBe(1)
})
