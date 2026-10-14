// @vitest-environment node
import { expect, it } from 'vitest'
import { runtimeConfig } from '../server/config'
it('keeps external push sending off by default and requires explicit complete configuration', () => {
  expect(runtimeConfig({}).push).toBeNull()
  expect(runtimeConfig({ VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private' }).push).toBeNull()
  expect(() => runtimeConfig({ WATER_ALERT_PUSH_ENABLED: 'true' })).toThrow()
  expect(runtimeConfig({ WATER_ALERT_PUSH_ENABLED: 'true', VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:operator@example.org' }).push?.publicKey).toBe('public')
})
it('rejects unsafe production origins and invalid ports', () => {
  expect(() => runtimeConfig({ WATER_ALERT_ORIGIN: 'http://public.example.org' })).toThrow()
  expect(() => runtimeConfig({ WATER_ALERT_ORIGIN: 'https://example.org/path' })).toThrow()
  expect(() => runtimeConfig({ PORT: 'NaN' })).toThrow()
  expect(runtimeConfig({ WATER_ALERT_ORIGIN: 'https://example.org', PORT: '8080' }).port).toBe(8080)
})
