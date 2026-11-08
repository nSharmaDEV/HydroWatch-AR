// `npm run ccr:sync` — local only. Finds suppliers without a 2025 annual-report
// record (plus not-reviewed ones), searches ADH's public CCR site, downloads the
// exact-PWS PDF, asks Claude to summarize all pages and keeps the result only if
// the deterministic checks in ccr-sync-lib.ts pass. Writes:
//   src/ai-annual-reports.ts                       (generated records)
//   docs/research/adh-ccr-2025/pdfs|text/<pws>.*   (dated source snapshots)
//   docs/research/adh-ccr-2025/ai-sync-log.json    (per-run log)
// Usage: npm run ccr:sync [-- --dry-run] [-- --only=ADH:…]
// Needs ANTHROPIC_API_KEY (except --dry-run). Optional CCR_MODEL.
// Never deploys, commits or notifies; review the diff before committing.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HUMAN_ANNUAL_REPORTS, mergeAnnualReports, type AnnualReport } from '../src/annual-reports'
import { AI_ANNUAL_REPORTS } from '../src/ai-annual-reports'
import { PLACE_CATALOG } from '../src/place-catalog'
import { claudeSummarizer, findTargets, popplerTools, pwsFromUrl, renderGeneratedModule, syncOne, type SyncLog, type SystemPlace } from './ccr-sync-lib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const archive = path.join(root, 'docs/research/adh-ccr-2025')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const only = args.find(a => a.startsWith('--only='))?.slice('--only='.length)
const model = process.env.CCR_MODEL || 'claude-opus-5-5'
const apiKey = process.env.ANTHROPIC_API_KEY
if (!dryRun && !apiKey) { console.error('ANTHROPIC_API_KEY is not set. Use --dry-run to search/download without the AI step.'); process.exit(1) }
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

const livePath = path.join(root, 'data/live/observations.json')
const live: SystemPlace[] = existsSync(livePath) ? (JSON.parse(readFileSync(livePath, 'utf8')).places ?? []) : []
const catalog = PLACE_CATALOG.map(e => e.place as SystemPlace)
const knownPws = Object.fromEntries(PLACE_CATALOG.flatMap(e => { const pws = e.place.kind === 'system' ? pwsFromUrl(e.url) : undefined; return pws ? [[e.place.id, pws]] : [] }))
const current = mergeAnnualReports(HUMAN_ANNUAL_REPORTS, AI_ANNUAL_REPORTS)
const targets = findTargets([...catalog, ...live], current, knownPws).filter(t => !only || t.id === only)
console.log(`${targets.length} supplier(s) to check${dryRun ? ' (dry run: no AI, nothing written)' : ''}.`)

const summarize = dryRun ? undefined : claudeSummarizer({ apiKey: apiKey!, model })
const generated: Record<string, readonly AnnualReport[]> = { ...AI_ANNUAL_REPORTS }
const logs: SyncLog[] = []
for (const target of targets) {
  const result = await syncOne(target, { fetch, summarize, pdfTools: popplerTools, today, model })
  logs.push(result.log)
  console.log(`${result.log.outcome.padEnd(12)} ${target.name}${result.log.pws ? ` (PWS ${result.log.pws})` : ''}${result.log.detail ? ` — ${result.log.detail}` : ''}`)
  if (dryRun) continue
  if (result.pdf && result.log.pws) {
    // Keep earlier snapshots: a changed PDF at the same URL gets a dated name.
    const existing = path.join(archive, 'pdfs', `${result.log.pws}.pdf`)
    const same = existsSync(existing) && createHash('sha256').update(readFileSync(existing)).digest('hex') === result.log.sha256
    const stem = !existsSync(existing) || same ? result.log.pws : `${result.log.pws}-${today}`
    mkdirSync(path.join(archive, 'pdfs'), { recursive: true }); mkdirSync(path.join(archive, 'text'), { recursive: true })
    if (!same) writeFileSync(path.join(archive, 'pdfs', `${stem}.pdf`), result.pdf)
    if (!same || !existsSync(path.join(archive, 'text', `${stem}.txt`))) writeFileSync(path.join(archive, 'text', `${stem}.txt`), result.text ?? '')
  }
  if (result.report) generated[target.id] = [result.report]
}

if (!dryRun) {
  writeFileSync(path.join(root, 'src/ai-annual-reports.ts'), renderGeneratedModule(generated))
  const logPath = path.join(archive, 'ai-sync-log.json')
  const runs = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : []
  runs.push({ runOn: today, model, requestedYear: 2025, results: logs })
  writeFileSync(logPath, `${JSON.stringify(runs, null, 2)}\n`)
  console.log('Wrote src/ai-annual-reports.ts and ai-sync-log.json. Review the diff; nothing was committed or deployed.')
}
