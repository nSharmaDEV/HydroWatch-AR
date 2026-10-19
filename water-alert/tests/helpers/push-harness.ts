// Local recording-only adapter. Never import this module from the shipped app.
import { PushStore, emptyDevices, type DeviceInput } from '../../server/push.js'
import { ObservationStore, emptyState } from '../../server/store.js'
import type { StateCell } from '../../server/postgres.js'
import { SOURCES, type Notice } from '../../src/domain.js'

export const rehearsalNotice: Notice = {
  id: 'ADH:rehearsal-baseline', placeId: 'ADH:rehearsal-supplier', agency: 'ADH', kind: 'boil',
  name: '[TEST ONLY] Fictional water supplier', county: 'Test only', area: 'Fictional test area',
  issued: '10/17/2026', lifted: null, reason: 'Synthetic rehearsal, not an official notice', url: SOURCES.ADH,
}

function memoryCell<T>(initial: T): StateCell<T> {
  let state = structuredClone(initial)
  return {
    async read() { return structuredClone(state) },
    async update(apply) {
      const next = structuredClone(state)
      const result = apply(next)
      state = next
      return result
    },
  }
}

interface RecordedPayload { title: string; body: string; tag: string; url: string; sourceUrl: string }
type Choices = Partial<Pick<DeviceInput, 'watches' | 'liftWatches' | 'language'>>

export function createLocalPushHarness() {
  let now = Date.parse('2026-10-17T12:00:00Z')
  const observations = new ObservationStore(memoryCell(emptyState()))
  const devices = memoryCell(emptyDevices())
  let pushes = new PushStore(devices, () => now)
  let token: string | undefined
  const payloads: RecordedPayload[] = []
  // Fixed public P-256 generator point: fixture data, not generated VAPID keys.
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/local-recording-only',
    keys: {
      p256dh: Buffer.from('046b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c2964fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5', 'hex').toString('base64url'),
      auth: Buffer.alloc(16, 2).toString('base64url'),
    },
  }
  return {
    payloads,
    advance(ms: number) { now += ms },
    async observe(records: Notice[]) { await observations.success('ADH', records, new Date(now).toISOString()) },
    async fail() { await observations.failure('ADH', 'Synthetic source failure', new Date(now).toISOString()) },
    async enroll(choices: Choices = {}) {
      const saved = await pushes.enroll({ subscription, watches: [rehearsalNotice.placeId], liftWatches: [rehearsalNotice.placeId], language: 'en', ...choices }, (await observations.read()).places, token)
      token = saved.token
    },
    async remove() { return token ? pushes.remove(token) : false },
    restart() { pushes = new PushStore(devices, () => now) },
    async drain() {
      await pushes.drain(await observations.read(), async (_subscription, raw) => {
        const value = JSON.parse(raw) as RecordedPayload
        payloads.push({ title: value.title, body: value.body, tag: value.tag, url: value.url, sourceUrl: value.sourceUrl })
      })
    },
  }
}
