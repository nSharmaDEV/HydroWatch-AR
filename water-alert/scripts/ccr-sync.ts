// Local rules-first collector. Stages ignored source artifacts + resumable
// outcomes by default. --write explicitly imports generated records, never
// human reviews. --ai additionally opts in to paid API use; no key is needed
// otherwise. Never deploys, commits, notifies or modifies live observations.
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HUMAN_ANNUAL_REPORTS, mergeAnnualReports, type AnnualReport } from '../src/annual-reports'
import { AI_ANNUAL_REPORTS } from '../src/ai-annual-reports'
import { PLACE_CATALOG } from '../src/place-catalog'
import { DIRECTORY } from '../src/water-system-directory'
import { claudeSummarizer, findTargets, popplerTools, pwsFromUrl, renderGeneratedModule, syncOne, REPORT_YEAR, type SystemPlace } from './ccr-sync-lib'
import { coverageAudit, parseBatchArgs, politeFetch, runBatch, type Checkpoint } from './ccr-batch-lib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = parseBatchArgs(process.argv.slice(2))
const cache = path.resolve(args.cache ?? path.join(root, 'data/ccr-sync'))
const model = process.env.CCR_MODEL || 'claude-opus-5-5'
const apiKey = process.env.ANTHROPIC_API_KEY
if (args.ai && !apiKey) throw new Error('--ai requires ANTHROPIC_API_KEY; omit --ai for free fixed-rule reading.')
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

const livePath = path.join(root, 'data/live/observations.json')
const live: SystemPlace[] = existsSync(livePath) ? (JSON.parse(readFileSync(livePath, 'utf8')).places ?? []) : []
const catalog = PLACE_CATALOG.map(e => e.place as SystemPlace)
// EPA's directory snapshot (src/directory/epa-water-systems.json, refreshed by
// `npm run directory:epa`) covers every active Arkansas community system, not
// just the catalog/previously-observed ones, so a freshly added or searched
// supplier is still a sync target. Its pwsid is EPA's AR######## form, never
// ADH's internal CCR-search PWS number, so it is never used as a known-PWS
// hint — only exact catalog URLs give that. Name+county matching (already the
// fallback for every unknown system) finds the ADH PWS instead.
const directorySystems: SystemPlace[] = DIRECTORY.systems.map(s => ({ id: s.placeId, name: s.name, county: s.county, kind: 'system' }))
const knownPws = Object.fromEntries(PLACE_CATALOG.flatMap(e => { const pws = e.place.kind === 'system' ? pwsFromUrl(e.url) : undefined; return pws ? [[e.place.id, pws]] : [] }))
const current = mergeAnnualReports(HUMAN_ANNUAL_REPORTS, AI_ANNUAL_REPORTS)
const validation = new Set(['AR0000465', 'AR0000124', 'AR0000209', 'AR0000189', 'AR0000272', 'AR0000039', 'AR0000466', 'AR0000222', 'AR0000484', 'AR0000446'])
const selected = new Set(DIRECTORY.systems.filter(s => args.validation ? validation.has(s.pwsid) : !args.only || s.placeId === args.only || s.pwsid === args.only).map(s => s.placeId))
const targets = findTargets([...catalog, ...directorySystems, ...live], current, knownPws).filter(t => args.validation || args.only ? selected.has(t.id) || t.id === args.only : true)
if (args.only && !targets.length) throw new Error('No eligible target matches --only (human-reviewed records are protected).')
console.log(`${targets.length} supplier(s) selected${args.dryRun ? ' (dry run: no AI, nothing written)' : '; same-day completed checkpoints resume automatically'}.`)

const summarize = args.ai ? claudeSummarizer({ apiKey: apiKey!, model }) : undefined
const fetcher = politeFetch({ fetch, delayMs: 1000, retries: 2 })
const generated: Record<string, readonly AnnualReport[]> = { ...AI_ANNUAL_REPORTS }
const checkpointPath = path.join(cache, 'checkpoint.json')
const checkpoint: Checkpoint = !args.dryRun && existsSync(checkpointPath) ? JSON.parse(readFileSync(checkpointPath, 'utf8')) : {}
// One collector per cache directory. A separate cache can benchmark another tool.
const atomicWrite = (file: string, text: string | Uint8Array) => {
  mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, text)
  renameSync(temporary, file)
}
const stage = () => {
  for (const [id, entry] of Object.entries(checkpoint)) if (entry.report) generated[id] = [entry.report]
  const rows = coverageAudit(DIRECTORY.systems, current, checkpoint)
  const counts = rows.reduce<Record<string, number>>((out, row) => { out[row.outcome] = (out[row.outcome] ?? 0) + 1; return out }, {})
  atomicWrite(path.join(cache, 'coverage.json'), `${JSON.stringify({ generatedOn: today, directoryCheckedOn: DIRECTORY.checkedOn, requestedYear: REPORT_YEAR, counts, systems: rows }, null, 2)}\n`)
  atomicWrite(path.join(cache, 'candidate-reports.ts'), renderGeneratedModule(generated))
  return counts
}
const batch = await runBatch(targets, checkpoint, {
  today, mode: args.ai ? `ai:${model}` : 'rules', retryFailed: args.retryFailed,
  run: async target => {
    const result = await syncOne(target, { fetch: fetcher, summarize, pdfTools: popplerTools, today, model })
    console.log(`${result.log.outcome.padEnd(12)} ${target.name}${result.log.pws ? ` (PWS ${result.log.pws})` : ''} — ${result.log.detail ?? ''}`)
    return result
  },
  persist: async (state, result) => {
    if (args.dryRun) return
    if (result.pdf && result.log.sha256) {
      const stem = `${result.log.pws}-${result.log.sha256}`
      atomicWrite(path.join(cache, 'pdfs', `${stem}.pdf`), result.pdf)
      if (result.text) atomicWrite(path.join(cache, 'text', `${stem}.txt`), result.text)
    }
    atomicWrite(checkpointPath, `${JSON.stringify(state, null, 2)}\n`)
    stage()
  },
})
if (!args.dryRun) {
  console.log('Directory outcomes:', stage())
  if (args.write) atomicWrite(path.join(root, 'src/ai-annual-reports.ts'), renderGeneratedModule(generated))
  console.log(`Staged evidence and coverage: ${cache}. ${args.write ? 'Imported generated records.' : 'App records unchanged; review before --write.'} Nothing committed or deployed.`)
}
if (batch.halted) {
  console.error('Stopped after three consecutive retrieval failures. Remaining suppliers were not checked. Resume with --retry-failed after source access recovers.')
  process.exitCode = 1
}
