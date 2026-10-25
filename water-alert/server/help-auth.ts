import { createHmac, timingSafeEqual } from 'node:crypto'
export interface HelpConfig { auth: { url: string; key: string } | null; delivery: { key: string; from: string; domain: string; webhook: string } | null; accountUrl: string | null }
export function helpConfig(env: NodeJS.ProcessEnv): HelpConfig {
  let auth: HelpConfig['auth'] = null, delivery: HelpConfig['delivery'] = null
  if (env.WATER_ALERT_ACCOUNTS_ENABLED === 'true') {
    const url = new URL(env.WATER_ALERT_SUPABASE_URL ?? '')
    if (url.protocol !== 'https:' || url.origin !== url.href.replace(/\/$/, '') || !env.WATER_ALERT_SUPABASE_KEY) throw new Error('Accounts require an HTTPS Supabase origin and publishable key')
    auth = { url: url.origin, key: env.WATER_ALERT_SUPABASE_KEY }
  }
  if (env.WATER_ALERT_EMAIL_ENABLED === 'true') {
    const { RESEND_API_KEY: key, WATER_ALERT_EMAIL_FROM: from, WATER_ALERT_REPLY_DOMAIN: domain, RESEND_WEBHOOK_SECRET: webhook } = env
    if (!auth || !key || !from || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from) || !domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) || !webhook?.startsWith('whsec_')) throw new Error('Email requires managed accounts, Resend credentials, verified sender/reply domain and signed webhook secret')
    delivery = { key, from, domain, webhook }
  }
  const accountUrl = env.WATER_ALERT_ACCOUNT_URL ?? null
  if (accountUrl && new URL(accountUrl).protocol !== 'https:') throw new Error('Account portal must use HTTPS')
  return { auth, delivery, accountUrl }
}
export class HelpAuth {
  constructor(private config: NonNullable<HelpConfig['auth']>, private fetcher: typeof fetch = fetch) {}
  async identity(cookie?: string) {
    const token = cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('wave_help='))?.slice(10)
    if (!token || !/^[a-zA-Z0-9._-]{1,8000}$/.test(token)) return null
    const response = await this.fetcher(`${this.config.url}/auth/v1/user`, { headers: { apikey: this.config.key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) })
    if (!response.ok) return null
    const user = await response.json()
    return typeof user.id === 'string' && typeof user.email === 'string' && user.email_confirmed_at ? { id: user.id as string, email: user.email as string } : null
  }
  async signIn(email: unknown, password: unknown) {
    if (typeof email !== 'string' || email.length > 320 || typeof password !== 'string' || !password || password.length > 1024) throw new Error('Invalid sign-in')
    const r = await this.fetcher(`${this.config.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: this.config.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000) })
    if (!r.ok) throw new Error('Sign-in failed')
    const data = await r.json()
    if (!data.user?.email_confirmed_at || typeof data.access_token !== 'string' || !/^[a-zA-Z0-9._-]{1,8000}$/.test(data.access_token)) throw new Error('Confirmed account required')
    return { token: data.access_token as string, seconds: Math.max(1, Math.min(3600, Number(data.expires_in) || 300)) }
  }
}
export function verifyWebhook(raw: Buffer, h: { id?: string; timestamp?: string; signature?: string }, secret: string, now = Date.now()) {
  if (!h.id || h.id.length > 200 || !h.timestamp || !/^\d+$/.test(h.timestamp) || Math.abs(now / 1000 - Number(h.timestamp)) > 300 || !h.signature) return false
  const expected = createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64')).update(`${h.id}.${h.timestamp}.`).update(raw).digest()
  return h.signature.split(' ').some(part => { if (!part.startsWith('v1,')) return false; const actual = Buffer.from(part.slice(3), 'base64'); return actual.length === expected.length && timingSafeEqual(actual, expected) })
}
