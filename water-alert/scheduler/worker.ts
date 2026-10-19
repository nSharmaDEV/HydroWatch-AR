export interface SchedulerEnv { ENABLED?: string; WATER_ALERT_ORIGIN?: string; CRON_SECRET?: string }
export async function runScheduled(env: SchedulerEnv, fetcher: typeof fetch = fetch): Promise<void> {
  if (env.ENABLED !== 'true') return
  let origin: URL
  try {
    origin = new URL(env.WATER_ALERT_ORIGIN ?? '')
    if (origin.protocol !== 'https:' || origin.origin !== env.WATER_ALERT_ORIGIN || origin.username || origin.password || !/^[A-Za-z0-9_-]{32,128}$/.test(env.CRON_SECRET ?? '')) throw new Error()
  } catch { throw new Error('Scheduler configuration invalid') }
  try {
    const response = await fetcher(`${origin.origin}/api/cron`, {
      // Workers rejects redirect:'error'; manual never forwards the bearer to a redirect target.
      method: 'GET', redirect: 'manual',
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      signal: AbortSignal.timeout(150000),
    })
    const ok = response.ok
    await response.body?.cancel()
    if (!ok) throw new Error()
  } catch { throw new Error('Scheduled check failed') }
}

export default {
  // Return the whole promise: cron permits network waiting beyond HTTP waitUntil's 30 seconds.
  async scheduled(_controller: unknown, env: SchedulerEnv): Promise<void> { await runScheduled(env) },
}
