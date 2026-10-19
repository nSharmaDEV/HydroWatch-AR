import { createHash, randomBytes, randomUUID, ECDH } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { statusFor, type Place } from '../src/domain.js'
import type { StoredState } from './store.js'
import type { StateCell } from './postgres.js'
import { noticeMatchesPlace, withPlaceCatalog } from '../src/place-catalog.js'
export interface DeviceInput { subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; watches: string[]; liftWatches: string[]; language: 'en' | 'es' }
export type PushSender = (subscription: DeviceInput['subscription'], payload: string) => Promise<unknown>
interface Attempt { tries: number; nextAt: number; accepted: boolean; claimId?: string }
interface Device extends DeviceInput { tokenHash: string; enrolledAt: number; expiresAt: number; attempts: Record<string, Attempt> }
export interface DeviceState { version: 1; devices: Device[] }
export const emptyDevices = (): DeviceState => ({ version: 1, devices: [] })
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const DAY = 86400_000
function validate(input: DeviceInput, places: Place[]): DeviceInput {
  const url = new URL(input?.subscription?.endpoint)
  const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' || url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com') || url.hostname === 'wns.windows.com' || url.hostname.endsWith('.notify.windows.com')
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.href.length > 2048) throw new Error('Unsupported push endpoint')
  const keys = input.subscription.keys
  if (!keys || !/^[A-Za-z0-9_-]+={0,2}$/.test(keys.p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(keys.auth) || Buffer.from(keys.p256dh, 'base64url').length !== 65 || Buffer.from(keys.p256dh, 'base64url')[0] !== 4 || Buffer.from(keys.auth, 'base64url').length !== 16) throw new Error('Invalid subscription keys')
  ECDH.convertKey(Buffer.from(keys.p256dh, 'base64url'), 'prime256v1')
  const known = new Set(withPlaceCatalog(places).map(p => p.id))
  if (!Array.isArray(input.watches) || !input.watches.length || input.watches.length > 50 || input.watches.some(id => typeof id !== 'string' || /sample/i.test(id) || !known.has(id))) throw new Error('Select known live places')
  if (!Array.isArray(input.liftWatches) || input.liftWatches.some(id => !input.watches.includes(id)) || !['en', 'es'].includes(input.language)) throw new Error('Invalid alert preferences')
  return { subscription: { endpoint: url.href, keys: { p256dh: keys.p256dh, auth: keys.auth } }, watches: [...new Set(input.watches)], liftWatches: [...new Set(input.liftWatches)], language: input.language }
}
export class PushStore {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(public directory: string | StateCell<DeviceState>, private clock = Date.now) {}
  private update<T>(apply: (state: DeviceState) => T): Promise<T> {
    const checked = (state: DeviceState) => {
      if (state.version !== 1 || !Array.isArray(state.devices)) throw new Error('Invalid device store; preserve for inspection')
      state.devices = state.devices.filter(d => d.expiresAt > this.clock())
      return apply(state)
    }
    if (typeof this.directory !== 'string') return this.directory.update(checked)
    const directory = this.directory
    const work = this.queue.then(async () => {
      let state: DeviceState
      try { state = JSON.parse(await readFile(join(directory, 'devices.json'), 'utf8')) }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; state = { version: 1, devices: [] } }
      const result = checked(state)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'devices.json.tmp'), JSON.stringify(state), { mode: 0o600 })
      await rename(join(directory, 'devices.json.tmp'), join(directory, 'devices.json'))
      return result
    })
    this.queue = work.catch(() => {})
    return work
  }
  async enroll(input: DeviceInput, places: Place[], token?: string): Promise<{ token: string }> {
    const clean = validate(input, places)
    return this.update(state => {
      const owned = token ? state.devices.find(d => d.tokenHash === hash(token)) : undefined
      if (token && !owned) throw new Error('Invalid device token')
      const existing = state.devices.find(d => d.subscription.endpoint === clean.subscription.endpoint)
      if (existing && existing !== owned) throw new Error('Endpoint already enrolled')
      if (!owned && state.devices.length >= 1000) throw new Error('Device capacity reached')
      const bearer = token ?? randomBytes(32).toString('base64url')
      const device: Device = { ...clean, tokenHash: hash(bearer), enrolledAt: this.clock(), expiresAt: this.clock() + 90 * DAY, attempts: {} }
      state.devices = state.devices.filter(d => d !== owned); state.devices.push(device)
      return { token: bearer }
    })
  }
  async remove(token: string): Promise<boolean> {
    return this.update(state => {
      const before = state.devices.length
      state.devices = state.devices.filter(d => d.tokenHash !== hash(token))
      return state.devices.length !== before
    })
  }
  async prune(): Promise<void> { await this.update(() => {}) }
  async drain(observations: StoredState, send: PushSender, budget = 50, deadline = Infinity): Promise<void> {
    const devices = await this.update(state => {
      const eventIds = new Set(observations.events.map(e => e.id))
      for (const device of state.devices) {
        for (const id of Object.keys(device.attempts)) if (!eventIds.has(id)) delete device.attempts[id]
      }
      return structuredClone(state.devices)
    })
    for (const device of devices) {
        for (const event of observations.events) {
          const age = this.clock() - Date.parse(event.observedAt)
          if (Date.parse(event.observedAt) <= device.enrolledAt || age < 0 || age >= 3600_000 || !(event.type === 'new' ? device.watches : device.liftWatches).some(id => noticeMatchesPlace(id, event.notice))) continue
          const prior = device.attempts[event.id]
          if (prior?.accepted || (prior && prior.nextAt > this.clock())) continue
          const source = observations.sources.find(s => s.agency === event.notice.agency)
          const current = source?.records.find(n => n.id === event.notice.id)
          if (!current || current.liftStatus === 'unknown' || statusFor('', source, this.clock()).state === 'unavailable' || (event.type === 'new' ? !!current.lifted : !current.lifted)) continue
          if (budget <= 0 || this.clock() >= deadline) return
          const spanish = device.language === 'es'
          const action = event.type === 'lifted' ? spanish ? 'La agencia publicó el levantamiento' : 'Agency published a lift' : spanish ? 'Nuevo aviso publicado' : 'New published notice'
          const payload = JSON.stringify({ title: current.name.slice(0, 120), body: `${action} · ${current.kind === 'boil' ? spanish ? 'Aviso de hervir agua' : 'Boil-water notice' : spanish ? 'Aviso de algas' : 'HAB advisory'} · ${event.type === 'lifted' ? current.lifted : current.issued ?? event.observedAt}\n${spanish ? 'Consulta el área y las instrucciones oficiales.' : 'Check the published area and official guidance.'}`, tag: event.id, url: `/?notice=${encodeURIComponent(current.id)}`, sourceUrl: current.url, observedAt: event.observedAt })
          const claimId = randomUUID()
          const claimed = await this.update(state => {
            const live = state.devices.find(d => d.tokenHash === device.tokenHash && d.enrolledAt === device.enrolledAt)
            const attempt = live?.attempts[event.id]
            if (!live || attempt?.accepted || (attempt && attempt.nextAt > this.clock())) return false
            live.attempts[event.id] = { tries: (attempt?.tries ?? 0) + 1, nextAt: this.clock() + Math.min(15 * 60_000, 60_000 * 2 ** (attempt?.tries ?? 0)), accepted: false, claimId }
            return true
          })
          if (!claimed) continue
          if (this.clock() >= deadline) return // Persisted backoff leaves the claim retryable later.
          budget--
          let accepted = false; let gone = false
          try { await send(device.subscription, payload); accepted = true }
          catch (error) {
            gone = [404, 410].includes((error as { statusCode?: number }).statusCode ?? 0)
            // Never log endpoints/keys or claim device delivery from provider acceptance.
          }
          await this.update(state => {
            const live = state.devices.find(d => d.tokenHash === device.tokenHash)
            if (live?.attempts[event.id]?.claimId !== claimId) return
            if (gone) state.devices = state.devices.filter(d => d !== live)
            else live.attempts[event.id].accepted = accepted
          })
          if (gone) break
        }
      }
  }
}
