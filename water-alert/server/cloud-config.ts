import { runtimeConfig } from './config.js'
export function cloudConfig(env: NodeJS.ProcessEnv) {
  if (env.VERCEL_ENV !== 'production' || env.WATER_ALERT_CLOUD_ENABLED !== 'true') throw new Error('Cloud backend requires explicit production enablement; previews must not use production data')
  if (!env.WATER_ALERT_ORIGIN?.startsWith('https://')) throw new Error('Production HTTPS origin required')
  const config = runtimeConfig(env)
  const databaseUrl = env.DATABASE_URL ?? ''
  const database = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || !database.username || !database.pathname.slice(1)) throw new Error('Shared PostgreSQL database required')
  const cronSecret = env.CRON_SECRET ?? ''
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(cronSecret)) throw new Error('Strong CRON_SECRET required')
  return { origin: config.origin, databaseUrl, cronSecret, push: config.push, help: config.help }
}
