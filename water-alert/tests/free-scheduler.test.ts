// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { runScheduled } from '../scheduler/worker'

const env = { ENABLED: 'true', WATER_ALERT_ORIGIN: 'https://water-alert.example', CRON_SECRET: 'a'.repeat(43) }
describe('free scheduled trigger', () => {
  it('does not send anything until explicitly enabled', async () => {
    let requests = 0
    await runScheduled({ ...env, ENABLED: 'false' }, async () => { requests++; return Response.json({ ok: true }) })
    expect(requests).toBe(0)
  })
  it('calls only the canonical protected endpoint without forwarding redirects', async () => {
    let request: Request | undefined
    await runScheduled(env, async (input, init) => { request = new Request(input, init); return Response.json({ ok: true }) })
    expect(request?.url).toBe('https://water-alert.example/api/cron')
    expect(request?.headers.get('authorization')).toBe(`Bearer ${env.CRON_SECRET}`)
    expect(request?.redirect).toBe('error')
    expect(request?.signal.aborted).toBe(false)
  })
  it('rejects unsafe configuration before making a request', async () => {
    let requests = 0
    const fetcher: typeof fetch = async () => { requests++; return Response.json({ ok: true }) }
    for (const invalid of [{ WATER_ALERT_ORIGIN: 'http://water-alert.example' }, { WATER_ALERT_ORIGIN: 'https://user:password@water-alert.example' }, { WATER_ALERT_ORIGIN: 'https://water-alert.example/other' }, { CRON_SECRET: '' }]) {
      await expect(runScheduled({ ...env, ...invalid }, fetcher)).rejects.toThrow('Scheduler configuration invalid')
    }
    expect(requests).toBe(0)
  })
  it('reports upstream failure without exposing secrets or response contents', async () => {
    await expect(runScheduled(env, async () => new Response(env.CRON_SECRET, { status: 503 }))).rejects.toThrow(/^Scheduled check failed$/)
    await expect(runScheduled(env, async () => { throw new Error(`private ${env.CRON_SECRET}`) })).rejects.toThrow(/^Scheduled check failed$/)
  })
  it('does not configure paid Vercel cron and leaves the five-minute Worker disabled', async () => {
    const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
    const worker = JSON.parse(await readFile(new URL('../scheduler/wrangler.json', import.meta.url), 'utf8'))
    expect(vercel.crons ?? []).toEqual([])
    expect(worker.triggers.crons).toEqual(['*/5 * * * *'])
    expect(worker.vars.ENABLED).toBe('false')
    expect(worker.workers_dev).toBe(false)
    expect(worker.vars.CRON_SECRET).toBeUndefined()
  })
})
