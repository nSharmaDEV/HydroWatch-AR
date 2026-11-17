// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { readByRules } from '../scripts/ccr-rules-lib'
import { splitPages } from '../scripts/ccr-sync-lib'
import { HUMAN_ANNUAL_REPORTS, type AnnualReportIssue } from '../src/annual-reports'

const archive = new URL('../docs/research/adh-ccr-2025/text/', import.meta.url)
// Public ADH reports retrieved 2026-11-16 that the reader was NOT built from.
const heldOut = (pws: string) => readFileSync(new URL(`fixtures/ccr-text-${pws}.txt`, import.meta.url), 'utf8')
const saved = (pws: string) => readFileSync(new URL(`${pws}.txt`, archive), 'utf8')
const read = (text: string) => readByRules(text, splitPages(text).length)
const ok = (text: string) => { const r = read(text); if (!r.ok) throw new Error(r.reason); return r.issues }

it('reads a violations table row exactly as printed', () => {
  expect(ok(saved('068'))).toEqual([expect.objectContaining({ category: 'publicNotice', reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2,
    title: { en: 'Failed to conduct a public notice regarding a total coliform monitoring violation within the mandated timeframe', es: expect.any(String) },
    action: { en: 'No corrective action taken', es: expect.any(String) } })])
})

it('keeps separate findings and repeated periods straight', () => {
  const leslie = ok(saved('063'))
  expect(leslie.map(i => `${i.category} ${i.reportedFrom}-${i.reportedThrough}`)).toEqual([
    'licensing 1/1/2025-4/1/2025', 'publicNotice 3/1/2025-3/31/2025', 'publicNotice 5/1/2025-5/31/2025'])
  // One printed finding with two periods keeps one title for both.
  expect(new Set(leslie.slice(1).map(i => i.title.en)).size).toBe(1)
  expect(ok(saved('042')).filter(i => i.category === 'monitoring').map(i => i.reportedFrom)).toEqual(['5/1/2025', '8/1/2025'])
})

it('reads the significant-deficiencies table with its survey date', () => {
  const [issue] = ok(saved('087'))
  expect(issue).toMatchObject({ category: 'significantDeficiency', page: 2, title: { en: expect.stringContaining('Several tanks require modifications') }, action: { en: expect.stringContaining('working to correct') } })
})

it('does not cut words when a right column starts left of its header (held-out report 004)', () => {
  const [issue] = ok(heldOut('004'))
  expect(issue.reportedFrom).toBe('3/28/2025')
  expect(issue.title.en).toBe('Inspections are due for the Clearwells.')
  expect(issue.action.en).toBe('As of this date, there is a plan in place to correct the significant deficiency.')
})

it('reads other unseen reports and matches the raw text (held-out 195, 296)', () => {
  expect(ok(heldOut('195'))[0]).toMatchObject({ reportedFrom: 'March 26, 2025', title: { en: expect.stringContaining('properly screened') } })
  expect(ok(heldOut('296'))[0]).toMatchObject({ category: 'monitoring', reportedFrom: '3/1/2025', reportedThrough: '3/31/2025' })
})

it.each([
  ['500', 'a result row is marked Y'], ['772', 'a result row is marked Y'], ['845', 'a result row is marked Y'], ['735', 'a result row is marked Y'],
  ['747', 'exactly a from and a to date'], ['575', 'not 2025'],
])('declines rather than guess report %s', (pws, reason) => {
  const r = read(saved(pws))
  expect(r.ok).toBe(false)
  expect(r.ok === false && r.reason).toContain(reason)
})

it('declines when a column boundary would fall inside a word', () => {
  const page = ['2025 Annual Drinking Water Quality Report', ''].join('\n') + '\f' + [
    '                         SIGNIFICANT DEFICIENCY', 'The following was reported on 3/28/2025, upon inspection.',
    'Nature of Deficiencies                                       Progress to Date',
    'Tank inspection overdue and in need of attention by the utility today.', 'CCR 25 Example (000)  Page 2 of 2', ''].join('\n')
  expect(read(page).ok).toBe(false)
})

it('never contradicts a hand review: every saved report is read correctly or declined', () => {
  const day = (d?: string) => (d ?? '').replace(/\b(\d)\//g, '0$1/').replace(/\/(\d)\//g, '/0$1/')
  const key = (i: AnnualReportIssue) => i.category === 'significantDeficiency' ? `DEF|${day(i.reportedFrom)}` : `${i.category}|${day(i.reportedFrom)}|${day(i.reportedThrough)}`
  const truth = new Map<string, string[]>()
  for (const reports of Object.values(HUMAN_ANNUAL_REPORTS)) {
    const r = reports.find(x => x.year === 2025)
    const pws = r && r.state === 'reviewed' ? /P=(\w+)/.exec(r.url)?.[1] : undefined
    if (r && r.state === 'reviewed' && pws) truth.set(pws, r.issues.map(key).sort())
  }
  let compared = 0
  for (const file of readdirSync(archive).filter(f => f.endsWith('.txt'))) {
    const pws = file.replace('.txt', ''), want = truth.get(pws)
    const r = read(saved(pws))
    if (!want || !r.ok) continue
    compared++
    const got = r.issues.map(key).sort()
    // Saved Bull Shoals prints a survey date as "November 6, 2024"; compare by presence for deficiencies.
    expect(got.map(k => k.startsWith('DEF|') ? 'DEF' : k), pws).toEqual(want.map(k => k.startsWith('DEF|') ? 'DEF' : k))
  }
  expect(compared).toBeGreaterThan(25)
})
