// `npx tsx scripts/ccr-rules-measure.ts` — scores the rule-based reader against
// the hand-reviewed result for every saved 2025 report. Read-only, no network.
//   correct      readable, and the findings match the hand review
//   WRONG        readable, but the findings differ from the hand review (must be 0)
//   unreadable   the reader declined, so nothing would have been shown
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HUMAN_ANNUAL_REPORTS, type AnnualReport, type AnnualReportIssue } from '../src/annual-reports'
import { popplerTools, pwsFromUrl } from './ccr-sync-lib'
import { readByRules } from './ccr-rules-lib'

const archive = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/research/adh-ccr-2025')
const pad = (d: string) => d.replace(/\b(\d)\//g, '0$1/').replace(/\/(\d)\//g, '/0$1/')
const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
// "January 14,2025" and "01/14/2025" are the same survey day.
const day = (d?: string) => {
  if (!d) return ''
  const named = new RegExp(`(${monthNames.join('|')})\\s+(\\d{1,2}),\\s*(\\d{4})`, 'i').exec(d)
  if (named) return pad(`${monthNames.indexOf(named[1].toLowerCase()) + 1}/${named[2]}/${named[3]}`)
  return pad(d)
}
const key = (i: AnnualReportIssue) => i.category === 'significantDeficiency' ? `DEF|${day(i.reportedFrom)}` : `${i.category}|${day(i.reportedFrom)}|${day(i.reportedThrough)}`

const truth = new Map<string, AnnualReport>()
for (const reports of Object.values(HUMAN_ANNUAL_REPORTS)) {
  const report = reports.find(r => r.year === 2025)
  const pws = report && report.state !== 'unavailable' ? pwsFromUrl(report.url) : undefined
  if (report && pws) truth.set(pws.replace(/^0+(?=\d{3})/, ''), report)
}
const norm = (s: string) => s.replace(/^0+(?=\d{3})/, '')
const truthFor = (pws: string) => truth.get(norm(pws)) ?? truth.get(pws)

const counts = { correct: 0, wrong: 0, unreadableFindings: 0, unreadableClean: 0, noTruth: 0 }
const rows: string[] = []
for (const file of readdirSync(path.join(archive, 'text')).filter(f => f.endsWith('.txt')).sort()) {
  const pws = file.replace(/\.txt$/, '')
  const pdfPath = path.join(archive, 'pdfs', `${pws}.pdf`)
  if (!existsSync(pdfPath)) continue
  const expected = truthFor(pws)
  const pages = popplerTools.pages(readFileSync(pdfPath))
  const result = readByRules(readFileSync(path.join(archive, 'text', file), 'utf8'), pages)
  if (!expected || expected.state !== 'reviewed') { counts.noTruth++; rows.push(`${pws.padEnd(6)} no hand review to compare   ${result.ok ? `rules read ${result.issues.length} issue(s)` : `unreadable: ${result.reason}`}`); continue }
  const want = expected.issues.map(key).sort()
  if (!result.ok) {
    want.length ? counts.unreadableFindings++ : counts.unreadableClean++
    rows.push(`${pws.padEnd(6)} unreadable (${want.length ? `${want.length} finding(s) missed` : 'clean report'})   ${result.reason}`)
    continue
  }
  const got = result.issues.map(key).sort()
  const same = got.length === want.length && got.every((k, i) => k === want[i])
  same ? counts.correct++ : counts.wrong++
  rows.push(`${pws.padEnd(6)} ${same ? 'correct' : 'WRONG  '} ${got.length} read / ${want.length} expected${same ? '' : `\n         read:     ${got.join(' ; ')}\n         expected: ${want.join(' ; ')}`}`)
}
console.log(rows.join('\n'))
const total = counts.correct + counts.wrong + counts.unreadableFindings + counts.unreadableClean
console.log(`\n${total} reports with a hand review:`)
console.log(`  correct                       ${counts.correct}`)
console.log(`  WRONG (readable, mismatched)  ${counts.wrong}`)
console.log(`  unreadable, had findings      ${counts.unreadableFindings}`)
console.log(`  unreadable, clean report      ${counts.unreadableClean}`)
console.log(`  no hand review to compare     ${counts.noTruth}`)
