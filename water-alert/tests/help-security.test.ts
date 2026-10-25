// @vitest-environment node
import { expect, test } from 'vitest'
import { createHmac } from 'node:crypto'
import { HelpAuth, helpConfig, verifyWebhook } from '../server/help-auth'
test('managed identity comes from verified server response, never a device bearer or unconfirmed email', async () => {
  const auth = new HelpAuth({ url: 'https://test.supabase.co', key: 'public' }, async () => Response.json({ id: 'user-1', email: 'resident@example.test', email_confirmed_at: '2026-01-01' }))
  expect(await auth.identity('Bearer ' + 'a'.repeat(43))).toBeNull()
  expect(await auth.identity('wave_help=valid-token')).toEqual({ id: 'user-1', email: 'resident@example.test' })
  const unconfirmed = new HelpAuth({ url: 'https://test.supabase.co', key: 'public' }, async () => Response.json({ id: 'user-1', email: 'resident@example.test' }))
  expect(await unconfirmed.identity('wave_help=valid-token')).toBeNull()
})
test('webhook signature binds exact bytes, event id and a recent timestamp', () => {
  const raw = Buffer.from('{"type":"email.delivered"}'), secret = 'whsec_' + Buffer.from('a-long-test-only-secret').toString('base64'), at = 1000000
  const headers = { id: 'evt-1', timestamp: String(at / 1000), signature: 'v1,' + createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`evt-1.${at / 1000}.${raw}`).digest('base64') }
  expect(verifyWebhook(raw, headers, secret, at)).toBe(true)
  expect(verifyWebhook(Buffer.from('{}'), headers, secret, at)).toBe(false)
  expect(verifyWebhook(raw, headers, secret, at + 301000)).toBe(false)
})
test('delivery is disabled by default and incomplete opt-in fails closed', () => {
  expect(helpConfig({})).toEqual({ auth: null, delivery: null, accountUrl: null })
  expect(() => helpConfig({ WATER_ALERT_EMAIL_ENABLED: 'true' })).toThrow()
})
