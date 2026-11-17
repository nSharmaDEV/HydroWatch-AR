import express, { type ErrorRequestHandler, type Request } from 'express'
import { timingSafeEqual } from 'node:crypto'
import type { ObservationStore } from './store.js'
import type { SourceRunner } from './sources.js'
import type { PushStore } from './push.js'
import { withPlaceCatalog } from '../src/place-catalog.js'
import { directorySystem } from '../src/water-system-directory.js'
import { readAnnualReport, todayInArkansas, type ReadDeps, type ReportCheck } from './annual-report-check.js'
import { checkWaterSystem } from './water-system-check.js'
import { helpJson, helpRouter, helpWebhook, type HelpServices } from './help-api.js'
export function createApp({ store, runner, pushes, origin, publicKey, drain, cron, limiter, help, geocodeFetch = fetch, adhFetch = fetch, reportReader }: { store: ObservationStore; runner: Pick<SourceRunner, 'check'>; pushes: PushStore; origin: string; publicKey: string | null; drain: () => Promise<void>; cron?: { secret: string; run: () => Promise<void> }; limiter?: (req: Request) => Promise<boolean>; help?: HelpServices; geocodeFetch?: typeof fetch; adhFetch?: typeof fetch; reportReader?: ReadDeps }) {
  const app = express()
  app.disable('x-powered-by')
  if (help) app.post('/api/help/webhook', express.raw({ type: 'application/json', limit: '64kb' }), helpWebhook(help))
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
    if (req.path === '/geocode-address' && req.method === 'POST') {
      if (requestOrigin !== origin) { res.status(403).json({ error: 'Exact app origin required' }); return }
      next(); return
    }
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
  if (help) app.use('/api/help', helpJson, helpRouter(help))
  else app.get('/api/help/session', (_req, res) => { res.json({ enabled: false, user: null, delivery: false, accountUrl: null }) })
  app.use(express.json({ limit: '16kb' }))
  const geocodeLimits = new Map<string, { at: number; count: number }>()
  app.post('/api/geocode-address', async (req, res) => {
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : ''
    if (address.length < 8 || address.length > 200) { res.status(400).json({ error: 'Enter a street address between 8 and 200 characters.' }); return }
    const now = Date.now()
    for (const [key, value] of geocodeLimits) if (now - value.at > 60_000) geocodeLimits.delete(key)
    const key = req.socket.remoteAddress ?? 'unknown'
    const limit = geocodeLimits.get(key) ?? { at: now, count: 0 }; geocodeLimits.set(key, limit)
    if (++limit.count > 20) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Address lookup limit reached. Try again in a minute.' }); return }
    try {
      const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
      url.searchParams.set('address', `${address}, Arkansas`)
      url.searchParams.set('benchmark', 'Public_AR_Current')
      url.searchParams.set('format', 'json')
      const upstream = await geocodeFetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } })
      if (!upstream.ok) { res.status(502).json({ error: 'Address lookup is temporarily unavailable.' }); return }
      const data: unknown = await upstream.json()
      const matches = (data as { result?: { addressMatches?: unknown } })?.result?.addressMatches
      const found = Array.isArray(matches) ? matches.flatMap(match => {
        const item = match as { matchedAddress?: unknown; addressComponents?: { state?: unknown; city?: unknown; zip?: unknown }; coordinates?: { x?: unknown; y?: unknown } }
        if (item.addressComponents?.state !== 'AR' || typeof item.matchedAddress !== 'string') return []
        const { x, y } = item.coordinates ?? {}
        const place = typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? { lat: y, lng: x } : null
        return [{ label: item.matchedAddress, place, city: typeof item.addressComponents.city === 'string' ? item.addressComponents.city : '', zip: typeof item.addressComponents.zip === 'string' ? item.addressComponents.zip : '' }]
      }).slice(0, 5) : []
      // `addresses` keeps the original response shape; `matches` adds coordinates for the Help address field.
      res.json({ addresses: found.map(m => m.label), matches: found.filter(m => m.place).map(m => ({ label: m.label, lat: m.place!.lat, lng: m.place!.lng, city: m.city, zip: m.zip })) })
    } catch {
      res.status(502).json({ error: 'Address lookup is temporarily unavailable.' })
    }
  })
  // On-demand ADH annual-report lookup. Results are kept on the requesting
  // device, not here; this short memo only stops repeated taps re-hitting a
  // state government site. Failures are never memoized, so a retry is immediate.
  const reportLimits = new Map<string, { at: number; count: number }>()
  const reportMemo = new Map<string, { at: number; result: ReportCheck }>()
  app.post('/api/annual-report/check', async (req, res) => {
    const placeId = typeof req.body?.placeId === 'string' ? req.body.placeId : ''
    const system = placeId ? directorySystem(placeId) : undefined
    if (!system) { res.status(400).json({ error: 'Unknown water system' }); return }
    const now = Date.now()
    for (const [key, value] of reportLimits) if (now - value.at > 60_000) reportLimits.delete(key)
    // A read costs an AI call, so those results are kept for an hour.
    for (const [key, value] of reportMemo) if (now - value.at > (value.result.state === 'aiSummarized' ? 3_600_000 : 300_000)) reportMemo.delete(key)
    const memo = reportMemo.get(placeId)
    if (memo) { res.json(memo.result); return }
    const key = req.socket.remoteAddress ?? 'unknown'
    const limit = reportLimits.get(key) ?? { at: now, count: 0 }; reportLimits.set(key, limit)
    if (++limit.count > 10 || reportLimits.size > 10000) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Report check limit reached. Try again in a minute.' }); return }
    const result = await readAnnualReport(system, reportReader ?? {}, adhFetch)
    if (result.state === 'aiSummarized' || result.state === 'autoRead' || result.state === 'unreviewed' || result.state === 'unavailable') reportMemo.set(placeId, { at: now, result })
    res.json(result)
  })
  const systemMemo = new Map<string, { at: number; result: Awaited<ReturnType<typeof checkWaterSystem>> }>()
  app.post('/api/water-system/check', async (req, res) => {
    const placeId = typeof req.body?.placeId === 'string' ? req.body.placeId : ''
    const system = placeId ? directorySystem(placeId) : undefined
    if (!system) { res.status(400).json({ error: 'Unknown water system' }); return }
    const now = Date.now()
    for (const [key, value] of reportLimits) if (now - value.at > 60_000) reportLimits.delete(key)
    for (const [key, value] of systemMemo) if (now - value.at > 300_000) systemMemo.delete(key)
    const memo = systemMemo.get(placeId)
    if (memo) { res.json(memo.result); return }
    const key = req.socket.remoteAddress ?? 'unknown'
    const limit = reportLimits.get(key) ?? { at: now, count: 0 }; reportLimits.set(key, limit)
    if (++limit.count > 10 || reportLimits.size > 10000) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Check limit reached. Try again in a minute.' }); return }
    const result = await checkWaterSystem(system, adhFetch, todayInArkansas())
    if (result.state === 'verified') systemMemo.set(placeId, { at: now, result })
    res.json(result)
  })
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
