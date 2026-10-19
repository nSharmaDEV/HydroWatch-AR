import { pathToFileURL } from 'node:url'

export interface HostingCheck { name: string; ok: boolean }
// Initial push-disabled deployment only. No credentials, writes, checks or sends.
export async function verifyHosting(origin: string, fetcher: typeof fetch = fetch): Promise<HostingCheck[]> {
  let url: URL
  try { url = new URL(origin) } catch { throw new Error('Exact HTTPS origin required') }
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw new Error('Exact HTTPS origin required')
  const checks: HostingCheck[] = []
  const noStore = (response: Response) => /(?:^|,)\s*no-store\s*(?:,|$)/i.test(response.headers.get('cache-control') ?? '')
  async function check(name: string, path: string, validate: (response: Response) => Promise<boolean>, headers?: HeadersInit) {
    try {
      const response = await fetcher(origin + path, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000), headers })
      checks.push({ name, ok: noStore(response) && await validate(response) })
      await response.body?.cancel().catch(() => {})
    } catch { checks.push({ name, ok: false }) } // Never print upstream bodies/errors.
  }
  const json = (response: Response) => response.headers.get('content-type')?.includes('application/json')
  await check('HTTPS app HTML (no redirect, no-store)', '/', async response => response.status === 200 && !!response.headers.get('content-type')?.includes('text/html'))
  await check('Push worker JavaScript (no-store)', '/sw.js', async response => response.status === 200 && /(?:java|ecma)script/.test(response.headers.get('content-type') ?? ''))
  await check('Database-backed status API JSON (no-store)', '/api/status', async response => {
    if (response.status !== 200 || !json(response)) return false
    const state = await response.json()
    return state.version === 1 && Array.isArray(state.sources) && state.sources.length === 2 && ['ADH', 'ADEQ'].every(agency => state.sources.some((source: { agency: string }) => source.agency === agency)) && ['archive', 'places', 'events'].every(key => Array.isArray(state[key]))
  })
  await check('Push explicitly disabled', '/api/push/config', async response => {
    if (response.status !== 200 || !json(response)) return false
    const config = await response.json()
    return config.enabled === false && config.publicKey === null
  })
  await check('Unauthenticated cron rejected', '/api/cron', async response => response.status === 401 && !!json(response))
  await check('Foreign Origin rejected', '/api/status', async response => response.status === 403 && !!json(response), { Origin: 'https://origin-check.invalid' })
  return checks
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Exact HTTPS origin required')
    const checks = await verifyHosting(process.argv[2])
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`)
    process.exitCode = checks.every(check => check.ok) ? 0 : 1
  } catch {
    console.error('Usage: npm run verify:hosting -- https://canonical-host (initial push-disabled deployment only)')
    process.exitCode = 1
  }
}
