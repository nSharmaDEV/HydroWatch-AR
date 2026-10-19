import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { JobGate, PostgresCell, type SqlPool } from './postgres.js'
import type { cloudConfig } from './cloud-config.js'
import { PushStore, emptyDevices, type PushSender } from './push.js'
import { ObservationStore, emptyState } from './store.js'
import { SourceRunner } from './sources.js'
import { createApp } from './app.js'
import webpush from 'web-push'
export function createCloudApp(pool: SqlPool, config: ReturnType<typeof cloudConfig>, fetcher: typeof fetch = fetch, send?: PushSender, clock = Date.now) {
  const gate = new JobGate(pool, clock)
  const store = new ObservationStore(new PostgresCell(pool, 'observations', emptyState), async (agency, body, metadata) => {
    const client = await pool.connect()
    try { await client.query('INSERT INTO water_alert.captures(agency,body,metadata) VALUES ($1,$2,$3::jsonb) ON CONFLICT(agency) DO UPDATE SET body=EXCLUDED.body,metadata=EXCLUDED.metadata', [agency, body, JSON.stringify(metadata)]) }
    finally { client.release() }
  })
  const runner = new SourceRunner(store, fetcher, clock)
  const pushes = new PushStore(new PostgresCell(pool, 'devices', emptyDevices), clock)
  if (config.push && !send) webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey)
  const transport = send ?? ((subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 300, timeout: 10000, urgency: 'normal' }))
  async function check(cooldown: number) {
    const token = await gate.claim('sources', cooldown, 120000)
    if (!token) return
    try { await runner.check() } finally { await gate.release('sources', token) }
  }
  async function drain() {
    const token = await gate.claim('push', 0, 150000)
    if (!token) return
    try {
      if (config.push) await pushes.drain(await store.read(), transport, 10, clock() + 80000)
      else await pushes.prune()
    } finally { await gate.release('push', token) }
  }
  return createApp({ store, pushes, origin: config.origin, publicKey: config.push?.publicKey ?? null,
    runner: { check: () => check(60000) }, drain,
    cron: { secret: config.cronSecret, run: async () => { await check(300000); await drain() } },
    limiter: async req => {
      // Only this Vercel-only entry point trusts Vercel's overwritten platform header.
      const address = req.get('x-vercel-forwarded-for') ?? ''
      const identity = createHmac('sha256', config.cronSecret).update(isIP(address) ? address : 'unknown').digest('hex')
      return await gate.allow('global-mutations', 300) && await gate.allow(identity, 30)
    }
  })
}
