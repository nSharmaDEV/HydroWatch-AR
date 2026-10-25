import type { Mode } from './domain'
import type { Preferences } from './storage'
const KEY = 'water-alert:push-device:v1'
export type PushSetupStage = 'worker' | 'subscription' | 'server'
export class PushSetupError extends Error {
  constructor(readonly stage: PushSetupStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Push setup failed', { cause })
    this.name = 'PushSetupError'
  }
}
export function pushSignature(prefs: Preferences): string { return JSON.stringify({ watches: [...prefs.watches].sort(), liftWatches: [...prefs.liftWatches].filter(id => prefs.watches.includes(id)).sort(), language: prefs.language }) }
export function pushDevice(): { token: string; signature: string } | null {
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return value && /^[A-Za-z0-9_-]{43}$/.test(value.token) && typeof value.signature === 'string' ? value : null } catch { return null }
}
export function supportsPush(): boolean { return typeof window !== 'undefined' && globalThis.isSecureContext === true && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window }
export async function preparePushWorker(): Promise<void> { if ('serviceWorker' in navigator && globalThis.isSecureContext) await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }) }
async function readyWorker(): Promise<ServiceWorkerRegistration> {
  await preparePushWorker()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Worker not ready')), 10_000)
    navigator.serviceWorker.ready.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
}
export async function enablePush(mode: Mode, prefs: Preferences, publicKey: string): Promise<void> {
  if (mode !== 'live' || !prefs.watches.length || !publicKey || !supportsPush()) throw new Error('Push unavailable')
  // Called by a button: request permission before any awaited work to preserve the user gesture.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission not granted')
  localStorage.setItem(KEY + ':probe', '1'); localStorage.removeItem(KEY + ':probe') // Fail before enrollment if durable device deletion credentials cannot be saved.
  let registration: ServiceWorkerRegistration
  try { registration = await readyWorker() }
  catch (error) { throw new PushSetupError('worker', error) }
  let subscription: PushSubscription | null
  try { subscription = await registration.pushManager.getSubscription() }
  catch (error) { throw new PushSetupError('subscription', error) }
  const existing = !!subscription
  if (!subscription) {
    try {
      const decoded = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'))
      const key = new Uint8Array(decoded.length); for (let i = 0; i < decoded.length; i++) key[i] = decoded.charCodeAt(i)
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    } catch (error) { throw new PushSetupError('subscription', error) }
  }
  const device = pushDevice()
  let acceptedToken: string | null = null
  try {
    const response = await fetch('/api/push/device', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(device ? { Authorization: `Bearer ${device.token}` } : {}) }, body: JSON.stringify({ subscription: subscription.toJSON(), watches: prefs.watches, liftWatches: prefs.liftWatches.filter(id => prefs.watches.includes(id)), language: prefs.language }), signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('Subscription not accepted')
    const saved = await response.json()
    if (!/^[A-Za-z0-9_-]{43}$/.test(saved.token)) throw new Error('Invalid device response')
    acceptedToken = saved.token
    localStorage.setItem(KEY, JSON.stringify({ token: saved.token, signature: pushSignature(prefs) }))
  } catch (error) {
    if (!existing) await subscription.unsubscribe().catch(() => {})
    if (acceptedToken) await fetch('/api/push/device', { method: 'DELETE', headers: { Authorization: `Bearer ${acceptedToken}` }, signal: AbortSignal.timeout(15_000) }).catch(() => {})
    throw new PushSetupError('server', error)
  }
}
export async function disablePush(): Promise<void> {
  const device = pushDevice()
  // Revoke browser delivery first. Keep credentials if server deletion fails so the user can retry.
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription && !await subscription.unsubscribe()) throw new Error('Browser unsubscribe failed')
  }
  if (device) {
    const response = await fetch('/api/push/device', { method: 'DELETE', headers: { Authorization: `Bearer ${device.token}` }, signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('Server device deletion failed; retry')
  }
  localStorage.removeItem(KEY)
}
