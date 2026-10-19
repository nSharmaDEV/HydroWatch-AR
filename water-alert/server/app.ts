import express, { type ErrorRequestHandler, type Request } from 'express'
import { timingSafeEqual } from 'node:crypto'
import type { ObservationStore } from './store.js'
import type { SourceRunner } from './sources.js'
import type { PushStore } from './push.js'
import { withPlaceCatalog } from '../src/place-catalog.js'
export function createApp({ store, runner, pushes, origin, publicKey, drain, cron, limiter }: { store: ObservationStore; runner: Pick<SourceRunner, 'check'>; pushes: PushStore; origin: string; publicKey: string | null; drain: () => Promise<void>; cron?: { secret: string; run: () => Promise<void> }; limiter?: (req: Request) => Promise<boolean> }) {
  const app = express()
  app.disable('x-powered-by')
  const limits = new Map<string, { at: number; count: number }>()
  app.use('/api', async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const requestOrigin = req.get('Origin')
    if (requestOrigin && requestOrigin !== origin) { res.status(403).json({ error: 'Origin not allowed' }); return }
    if (requestOrigin === origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return }
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (requestOrigin !== origin) { res.status(403).json({ error: 'Exact app origin required' }); return }
      if (limiter) {
        if (!await limiter(req)) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Please retry later' }); return }
        next(); return
      }
      const now = Date.now()
      for (const [key, value] of limits) if (now - value.at > 60_000) limits.delete(key)
      const key = req.socket.remoteAddress ?? 'unknown'
      const value = limits.get(key) ?? { at: now, count: 0 }; limits.set(key, value)
      if (++value.count > 30 || limits.size > 10000) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Please retry later' }); return }
    }
    next()
  })
  app.use(express.json({ limit: '16kb' }))
  if (cron) app.get('/api/cron', async (req, res) => {
    const supplied = Buffer.from(req.get('Authorization') ?? '')
    const expected = Buffer.from(`Bearer ${cron.secret}`)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.status(401).json({ error: 'Scheduled job authorization required' }); return }
    await cron.run(); res.json({ ok: true })
  })
  const status = async () => { const state = await store.read(); return { ...state, places: withPlaceCatalog(state.places) } }
  app.get('/api/status', async (_req, res) => { res.json(await status()) })
  app.post('/api/check', async (_req, res) => { await runner.check(); await drain(); res.json(await status()) })
  app.get('/api/push/config', (_req, res) => { res.json({ enabled: !!publicKey, publicKey }) })
  const tokenFor = (authorization?: string) => authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
  app.post('/api/push/device', async (req, res) => {
    if (!publicKey) { res.status(503).json({ error: 'Push not configured' }); return }
    const authorization = req.get('Authorization'); const token = tokenFor(authorization)
    if (authorization && !token) { res.status(401).json({ error: 'Invalid device authorization' }); return }
    const { places } = await store.read()
    try { res.status(201).json(await pushes.enroll(req.body, places, token)) }
    catch { res.status(400).json({ error: 'Unable to save this subscription. Check live places and device authorization.' }) }
  })
  app.delete('/api/push/device', async (req, res) => {
    const token = tokenFor(req.get('Authorization'))
    if (!token) { res.status(401).json({ error: 'Device authorization required' }); return }
    await pushes.remove(token)
    res.sendStatus(204) // Idempotent and does not reveal whether a device exists.
  })
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Unknown API route' }) })
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 503
    res.status(status).json({ error: status === 413 ? 'Request too large' : 'Request could not be completed' })
  }
  app.use(errors)
  return app
}
