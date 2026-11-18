// Local collection orchestration only. Never writes live observations or sends.
import { createHash } from 'node:crypto'
import type { AnnualReport } from '../src/annual-reports'
import { REPORT_YEAR, type SyncLog, type SyncResult, type Target } from './ccr-sync-lib'

export function parseBatchArgs(args: readonly string[]) {
  const flags = new Set(['--dry-run', '--write', '--ai', '--retry-failed', '--validation'])
  for (const arg of args) if (!flags.has(arg) && !/^--(?:only|cache)=.+$/.test(arg)) throw new Error(`Unknown or empty argument: ${arg}`)
  const result = { dryRun: args.includes('--dry-run'), write: args.includes('--write'), ai: args.includes('--ai'), retryFailed: args.includes('--retry-failed'), validation: args.includes('--validation'), only: args.find(a => a.startsWith('--only='))?.slice(7), cache: args.find(a => a.startsWith('--cache='))?.slice(8) }
  if (result.dryRun && (result.write || result.ai)) throw new Error('cannot combine --dry-run with --write or --ai')
  if (result.validation && result.only) throw new Error('cannot combine --validation and --only')
  return result
}

interface FetchOptions {
  fetch: typeof fetch
  delayMs: number
  retries: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

/** One serial request stream; bounded timeouts, conservative pacing and backoff. */
export function politeFetch(options: FetchOptions): typeof fetch {
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const now = options.now ?? Date.now
  let nextAt = 0
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const wait = Math.max(0, nextAt - now())
      if (wait > 60_000) throw new Error('source requested a cooldown longer than 60 seconds; resume later')
      if (wait) await sleep(wait)
      nextAt = now() + options.delayMs
      let response: Response
      try {
        response = await options.fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000) })
      } catch (error) {
        if (attempt >= options.retries || init?.signal?.aborted) throw error
        nextAt = Math.max(nextAt, now() + 1000 * 2 ** attempt)
        continue
      }
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) return response
      const after = response.headers.get('retry-after')
      const retryMs = after === null ? 0 : /^\d+$/.test(after) ? Number(after) * 1000 : Math.max(0, Date.parse(after) - now())
      nextAt = Math.max(nextAt, now() + (Number.isFinite(retryMs) ? retryMs : 0), now() + 1000 * 2 ** attempt)
      if (attempt >= options.retries) return response
      await response.body?.cancel()
    }
  }
}

export interface CheckpointEntry {
  fingerprint: string
  checkedOn: string
  elapsedMs: number
  report?: AnnualReport
  log: SyncLog
}
export type Checkpoint = Record<string, CheckpointEntry>
interface BatchOptions {
  today: string
  mode: string
  retryFailed?: boolean
  run: (target: Target) => Promise<SyncResult>
  persist: (checkpoint: Checkpoint, result: SyncResult) => Promise<void>
}

/** Persist source artifacts + state after EACH target; an interrupted run resumes. */
export async function runBatch(targets: readonly Target[], checkpoint: Checkpoint, options: BatchOptions) {
  let consecutiveFailures = 0
  for (const target of targets) {
    const fingerprint = createHash('sha256').update(JSON.stringify({ version: 1, year: REPORT_YEAR, target, date: options.today, mode: options.mode })).digest('hex')
    const previous = checkpoint[target.id]
    if (previous?.fingerprint === fingerprint && !(options.retryFailed && previous.log.failure)) continue
    const started = Date.now()
    const result = await options.run(target)
    checkpoint[target.id] = { fingerprint, checkedOn: options.today, elapsedMs: Date.now() - started, report: result.report, log: result.log }
    await options.persist(checkpoint, result)
    consecutiveFailures = result.log.failure === 'retrievalFailed' ? consecutiveFailures + 1 : 0
    if (consecutiveFailures >= 3) return { halted: true }
  }
  return { halted: false }
}

type Reports = Readonly<Record<string, readonly AnnualReport[]>>
interface AuditSystem { placeId: string; pwsid: string; name: string }
export interface AuditRow { placeId: string; pwsid: string; name: string; outcome: string; checkedOn?: string; url?: string; detail?: string }

/** Outcomes describe dated documents/attempts, not current safety or compliance. */
export function coverageAudit(systems: readonly AuditSystem[], reports: Reports, checkpoint: Checkpoint): AuditRow[] {
  return systems.map(system => {
    const base = { ...system }
    const bundled = reports[system.placeId]?.find(r => r.year === REPORT_YEAR)
    if (bundled?.state === 'reviewed') return { ...base, outcome: 'humanReviewed', checkedOn: bundled.reviewedOn, url: bundled.url }
    const entry = checkpoint[system.placeId]
    if (entry) {
      const outcome = entry.log.failure ?? (entry.log.outcome === 'unavailable' ? 'notFound' : entry.log.outcome === 'unreviewed' ? 'documentUnresolved' : entry.log.outcome)
      return { ...base, outcome, checkedOn: entry.checkedOn, url: entry.log.url, detail: entry.log.detail }
    }
    if (bundled?.state === 'autoRead') return { ...base, outcome: 'autoRead', checkedOn: bundled.readOn, url: bundled.url }
    if (bundled?.state === 'aiSummarized') return { ...base, outcome: 'aiSummarized', checkedOn: bundled.summarizedOn, url: bundled.url }
    if (bundled) return { ...base, outcome: bundled.state === 'unavailable' ? 'previouslyUnavailable' : 'previouslyUnreviewed' }
    return { ...base, outcome: 'notAttempted' }
  })
}
