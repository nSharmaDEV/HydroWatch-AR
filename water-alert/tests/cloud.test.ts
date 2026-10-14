// @vitest-environment node
import { expect, it } from 'vitest'
import { cloudConfig } from '../server/cloud-config'
it('requires explicit production enablement, HTTPS, shared database and a strong cron secret', () => {
  const env = { VERCEL_ENV: 'production', WATER_ALERT_CLOUD_ENABLED: 'true', WATER_ALERT_ORIGIN: 'https://water.example', DATABASE_URL: 'postgresql://user:pass@db.example/alerts', CRON_SECRET: 'a'.repeat(43) }
  expect(cloudConfig(env).origin).toBe(env.WATER_ALERT_ORIGIN)
  for (const change of [{ VERCEL_ENV: 'preview' }, { WATER_ALERT_CLOUD_ENABLED: 'false' }, { WATER_ALERT_ORIGIN: 'http://localhost:5178' }, { DATABASE_URL: '' }, { CRON_SECRET: 'weak' }, { DATABASE_URL: 'https://db.example' }]) {
    expect(() => cloudConfig({ ...env, ...change })).toThrow()
  }
})
