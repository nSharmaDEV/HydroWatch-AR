// @vitest-environment node
import { expect, it } from 'vitest'
import { verifyHosting } from '../scripts/verify-hosting'

function transport(change: Record<string, Response> = {}) {
  const calls: { path: string; options?: RequestInit }[] = []
  const responses: Record<string, () => Response> = {
    '/': () => new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }),
    '/sw.js': () => new Response("self.addEventListener('push', () => {})", { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' } }),
    '/api/status': () => Response.json({ version: 1, sources: [{ agency: 'ADH' }, { agency: 'ADEQ' }], archive: [], places: [], events: [] }, { headers: { 'Cache-Control': 'no-store' } }),
    '/api/push/config': () => Response.json({ enabled: false, publicKey: null }, { headers: { 'Cache-Control': 'no-store' } }),
    '/api/cron': () => Response.json({ error: 'Scheduled job authorization required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } }),
  }
  const fetcher: typeof fetch = async (input, options) => {
    const path = new URL(String(input)).pathname
    calls.push({ path, options })
    if (options?.headers && new Headers(options.headers).has('Origin')) return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    return change[path] ?? responses[path]()
  }
  return { fetcher, calls }
}

it('checks initial HTTPS routing, cache policy, disabled push and cron protection with read-only unauthenticated requests', async () => {
  const { fetcher, calls } = transport()
  const checks = await verifyHosting('https://water.example', fetcher)
  expect(checks.every(check => check.ok)).toBe(true)
  expect(calls.map(call => call.path)).toEqual(['/', '/sw.js', '/api/status', '/api/push/config', '/api/cron', '/api/status'])
  for (const { options } of calls) {
    expect(options?.method).toBe('GET')
    expect(options?.redirect).toBe('error')
    expect(options?.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(options?.headers).has('Authorization')).toBe(false)
  }
})

it.each(['http://water.example', 'https://user:password@water.example', 'https://water.example/path', 'https://water.example?token=private', 'https://water.example/'])('rejects noncanonical or credential-bearing origins before fetching: %s', async origin => {
  const { fetcher, calls } = transport()
  await expect(verifyHosting(origin, fetcher)).rejects.toThrow('Exact HTTPS origin required')
  expect(calls).toEqual([])
})

it.each([
  ['/api/status', new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } })],
  ['/api/push/config', Response.json({ enabled: true, publicKey: 'public' }, { headers: { 'Cache-Control': 'no-store' } })],
  ['/api/cron', Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })],
  ['/sw.js', new Response('worker', { headers: { 'Content-Type': 'application/javascript' } })],
] as const)('fails closed for incorrect hosted response at %s', async (path, response) => {
  const { fetcher } = transport({ [path]: response })
  expect((await verifyHosting('https://water.example', fetcher)).some(check => !check.ok)).toBe(true)
})

it('never returns upstream exception messages or response bodies in reports', async () => {
  const fetcher: typeof fetch = async () => { throw new Error('postgres://private-credential') }
  const checks = await verifyHosting('https://water.example', fetcher)
  expect(checks.every(check => !check.ok)).toBe(true)
  expect(JSON.stringify(checks)).not.toContain('private-credential')
})
