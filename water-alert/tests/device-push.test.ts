import { afterEach, expect, it, vi } from 'vitest'
import { enablePush, disablePush, pushDevice, pushSignature } from '../src/push'
import { defaults } from '../src/storage'
const prefs = { ...defaults(), watches: ['ADH:test'], liftWatches: ['ADH:test'] }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
function browser(permission: NotificationPermission = 'granted') {
  const unsubscribe = vi.fn(async () => true)
  const subscription = { toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/push', keys: { auth: 'auth', p256dh: 'key' } }), unsubscribe }
  const subscribe = vi.fn(async () => subscription)
  const registration = { pushManager: { getSubscription: vi.fn(async () => null), subscribe } }
  vi.stubGlobal('isSecureContext', true); vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn(async () => permission) })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn(async () => registration), ready: Promise.resolve(registration), getRegistration: vi.fn(async () => registration) } })
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ token: 'a'.repeat(43) }), { status: 201 }))
  vi.stubGlobal('fetch', fetcher)
  return { fetcher, subscribe, unsubscribe }
}
it('does not collect a sample subscription or enroll before permission is granted', async () => {
  const { fetcher, subscribe } = browser('denied')
  await expect(enablePush('sample', prefs, 'AQ')).rejects.toThrow()
  await expect(enablePush('live', prefs, 'AQ')).rejects.toThrow()
  expect(fetcher).not.toHaveBeenCalled(); expect(subscribe).not.toHaveBeenCalled()
})
it('stores a device credential only after server acceptance and recognizes changed choices', async () => {
  const { fetcher } = browser()
  await enablePush('live', prefs, 'AQ')
  expect(pushDevice()?.signature).toBe(pushSignature(prefs))
  expect(pushDevice()?.signature).not.toBe(pushSignature({ ...prefs, watches: ['ADH:other'] }))
  expect(fetcher.mock.calls[0][0]).toBe('/api/push/device')
  expect(JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ watches: ['ADH:test'], language: 'en' })
})
it('cleans up a rejected new browser subscription instead of claiming enrollment', async () => {
  const { fetcher, unsubscribe } = browser()
  fetcher.mockImplementation(async () => new Response('{}', { status: 503 }))
  await expect(enablePush('live', prefs, 'AQ')).rejects.toThrow()
  expect(pushDevice()).toBeNull(); expect(unsubscribe).toHaveBeenCalledOnce()
})
it('identifies service-worker setup failures separately', async () => {
  browser()
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn(async () => { throw new Error('registration failed') }), ready: Promise.resolve({}) } })
  await expect(enablePush('live', prefs, 'AQ')).rejects.toMatchObject({ name: 'PushSetupError', stage: 'worker' })
})
it('identifies browser subscription failures separately', async () => {
  browser()
  const registration = { pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn(async () => { throw new Error('subscription failed') }) } }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn(async () => registration), ready: Promise.resolve(registration) } })
  await expect(enablePush('live', prefs, 'AQ')).rejects.toMatchObject({ name: 'PushSetupError', stage: 'subscription' })
})
it('identifies server enrollment failures separately', async () => {
  const { fetcher } = browser()
  fetcher.mockImplementation(async () => new Response('{}', { status: 503 }))
  await expect(enablePush('live', prefs, 'AQ')).rejects.toMatchObject({ name: 'PushSetupError', stage: 'server' })
})
it('unsubscribes locally, deletes the server device, and retains credentials on server failure for retry', async () => {
  const { fetcher, unsubscribe } = browser()
  await enablePush('live', prefs, 'AQ')
  const registration = await navigator.serviceWorker.ready
  vi.mocked(registration.pushManager.getSubscription).mockResolvedValue({ unsubscribe } as unknown as PushSubscription)
  fetcher.mockImplementation(async () => new Response('{}', { status: 503 }))
  await expect(disablePush()).rejects.toThrow()
  expect(unsubscribe).toHaveBeenCalledOnce(); expect(pushDevice()).not.toBeNull()
  fetcher.mockImplementation(async () => new Response(null, { status: 204 }))
  await disablePush()
  expect(pushDevice()).toBeNull()
  expect((fetcher.mock.calls.at(-1) as unknown as [string, RequestInit])[1]).toMatchObject({ method: 'DELETE', headers: { Authorization: `Bearer ${'a'.repeat(43)}` } })
})
