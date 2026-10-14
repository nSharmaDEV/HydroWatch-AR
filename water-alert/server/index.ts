import express from 'express'
import { fileURLToPath } from 'node:url'
import { ObservationStore } from './store'
import { SourceRunner } from './sources'
import { startChecking } from './scheduler'
import webpush from 'web-push'
import { createApp } from './app'
import { runtimeConfig } from './config'
import { PushStore } from './push'
import { existsSync } from 'node:fs'

const config = runtimeConfig(process.env)
const directory = config.dataDirectory ?? fileURLToPath(new URL('../data/live/', import.meta.url))
const store = new ObservationStore(directory)
const runner = new SourceRunner(store)
const pushes = new PushStore(directory)
if (config.push) webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey)
let draining: Promise<void> | null = null
function drain(): Promise<void> {
  if (draining) return draining
  draining = (config.push ? store.read().then(state => pushes.drain(state, (subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 300, timeout: 10_000, urgency: 'normal' }))) : pushes.prune()).finally(() => { draining = null })
  return draining
}
const app = createApp({ store, runner, pushes, origin: config.origin, publicKey: config.push?.publicKey ?? null, drain })
const dist = fileURLToPath(new URL('../dist/', import.meta.url))
if (existsSync(dist)) {
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'"); next() })
  app.use(express.static(dist, { etag: true, setHeaders: (res, path) => { if (path.endsWith('sw.js') || path.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store') } }))
  app.get('/', (_req, res) => { res.sendFile(`${dist}index.html`) })
}
const server = app.listen(config.port, config.host, () => {
  console.log(`Water Alert API running on port ${config.port}; checks every 5 minutes; push ${config.push ? 'configured, device delivery unverified' : 'disabled'}`)
  const stop = startChecking(async () => { await runner.check(); await drain() }, () => console.error('Automatic check/delivery failed; inspect local service health'))
  const retry = setInterval(() => { void drain().catch(() => console.error('Push queue unavailable')) }, 60_000)
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { stop(); clearInterval(retry); server.close(() => process.exit(0)) })
})
