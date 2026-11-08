// @vitest-environment node
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { HUMAN_ANNUAL_REPORTS, mergeAnnualReports, type AnnualReport } from '../src/annual-reports'
import { findTargets, parseAiJson, parseSearchResults, pickCandidate, popplerTools, renderGeneratedModule, syncOne, titleYear, validateSummary, type AiSummary, type Summarize, type Target } from '../scripts/ccr-sync-lib'

const archive = new URL('../docs/research/adh-ccr-2025/', import.meta.url)
const pdf = (pws: string) => readFileSync(new URL(`pdfs/${pws}.pdf`, archive))
const hasPoppler = (() => { try { execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); return true } catch { return false } })()

const searchPage = '<form><input type="hidden" name="__VIEWSTATE" value="vs"><input type="hidden" name="__EVENTVALIDATION" value="ev"></form>'
const resultsPage = (rows: [string, string, string][]) => `<table>${rows.map(([name, pws, county]) => `<tr><td><a href="d.aspx?P=${pws}&amp;YEAR=2025">${name}</a></td><td>${pws}</td><td>${county}</td><td>2025</td></tr>`).join('')}</table>`

/** Offline ADH: search form, a results table and the saved public PDFs. */
function fakeAdh(rows: [string, string, string][]) {
  const posts: URLSearchParams[] = []
  const doFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('CCRSearch.aspx') && init?.method === 'POST') {
      expect(new Headers(init.headers).get('cookie')).toBe('ASP.NET_SessionId=abc')
      posts.push(new URLSearchParams(String(init.body)))
      return new Response(resultsPage(rows))
    }
    if (url.endsWith('CCRSearch.aspx')) return new Response(searchPage, { headers: { 'set-cookie': 'ASP.NET_SessionId=abc; path=/' } })
    const pws = /P=([^&]+)/.exec(url)![1]
    return new Response(new Uint8Array(pdf(pws)), { headers: { 'content-type': 'application/pdf' } })
  }) as unknown as typeof fetch
  return { doFetch, posts }
}

const banks: Target = { id: 'ADH:banks', name: 'BANKS WATERWORKS', county: 'BRADLEY', reason: 'missing' }
const banksIssue = {
  category: 'publicNotice', heading: { en: 'Public notice', es: 'Aviso público' },
  title: { en: 'Failed to conduct a public notice regarding a total coliform monitoring violation within the mandated timeframe', es: 'No se realizó el aviso público sobre una infracción de monitoreo de coliformes totales dentro del plazo obligatorio' },
  action: { en: 'No corrective action taken', es: 'No se tomó ninguna acción correctiva' },
  reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2,
  evidence: 'Failed to conduct a public notice regarding a total coliform monitoring violation',
}
const banksSummary: AiSummary = { reportYear: 2025, confident: true, uncertainties: [], contradictions: [], issues: [banksIssue] }
const deps = (doFetch: typeof fetch, summarize?: Summarize) => ({ fetch: doFetch, summarize, pdfTools: popplerTools, today: '2026-11-08', model: 'test-model' })

describe('target selection', () => {
  it('targets missing and not-reviewed suppliers, never human-reviewed ones or lakes', () => {
    const reports: Record<string, readonly AnnualReport[]> = {
      'ADH:done': [{ year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: 'u', issues: [] }],
      'ADH:gone': [{ year: 2025, state: 'unavailable', sourceUrl: 'https://health.arkansas.gov/eng/WS.aspx?ID=T0467' }],
      'ADH:mismatch': [{ year: 2025, state: 'unreviewed', url: 'https://health.arkansas.gov/eng/d.aspx?P=575&YEAR=2025' }],
      'ADH:ai': [{ year: 2025, state: 'aiSummarized', url: 'u', summarizedOn: '2026-11-08', model: 'm', issues: [] }],
    }
    const place = (id: string, kind = 'system') => ({ id, name: id, county: 'X', kind })
    const targets = findTargets([place('ADH:done'), place('ADH:gone'), place('ADH:mismatch'), place('ADH:ai'), place('ADH:new'), place('ADEQ:lake', 'lake'), place('ADH:new')], reports)
    expect(targets).toEqual([
      { id: 'ADH:gone', name: 'ADH:gone', county: 'X', pws: 'T0467', reason: 'recheck' },
      { id: 'ADH:mismatch', name: 'ADH:mismatch', county: 'X', pws: '575', reason: 'recheck' },
      { id: 'ADH:new', name: 'ADH:new', county: 'X', reason: 'missing' },
    ])
  })

  it('keeps human reviews when merging automated output', () => {
    const id = Object.keys(HUMAN_ANNUAL_REPORTS).find(k => HUMAN_ANNUAL_REPORTS[k][0].state === 'reviewed')!
    const springdale = 'ADH:053f9d9a4da2a01c88521af3b90956c809eb8a96e3df0304ab4cfa8956163140'
    const ai: AnnualReport = { year: 2025, state: 'aiSummarized', url: 'u', summarizedOn: '2026-11-08', model: 'm', issues: [] }
    const merged = mergeAnnualReports(HUMAN_ANNUAL_REPORTS, { [id]: [ai], [springdale]: [ai] })
    expect(merged[id]).toBe(HUMAN_ANNUAL_REPORTS[id])
    expect(merged[springdale]).toEqual([ai])
  })
})

describe('identity matching', () => {
  const rows = parseSearchResults(resultsPage([['Banks', '068', 'BRADLEY'], ['Banks Hill', '999', 'BRADLEY'], ['Salem Waterworks', '200', 'FULTON'], ['Salem Water Users', '492', 'SALINE']]))
  it('reads PWS and year from the returned link', () => {
    expect(rows[0]).toMatchObject({ name: 'Banks', pws: '068', year: 2025, url: 'https://health.arkansas.gov/eng/d.aspx?P=068&YEAR=2025' })
  })
  it('requires county plus identical name words, or the exact known PWS', () => {
    expect(pickCandidate(banks, rows)).toMatchObject({ ok: true, candidate: { pws: '068' } })
    expect(pickCandidate({ ...banks, county: 'Ashley County' }, rows)).toEqual({ ok: false, reason: 'none' })
    expect(pickCandidate({ id: 'x', name: 'SALEM WATER USERS', county: 'SALINE', reason: 'missing' }, rows)).toMatchObject({ ok: true, candidate: { pws: '492' } })
    expect(pickCandidate({ ...banks, pws: '999' }, rows)).toMatchObject({ ok: true, candidate: { pws: '999' } })
    expect(pickCandidate({ ...banks, pws: '777' }, rows)).toEqual({ ok: false, reason: 'none' })
  })
  it('treats two different PWS IDs as ambiguous, but repeated county rows as one report', () => {
    const twice = parseSearchResults(resultsPage([['Banks', '068', 'BRADLEY'], ['Banks', '070', 'BRADLEY']]))
    expect(pickCandidate(banks, twice)).toEqual({ ok: false, reason: 'ambiguous' })
    const counties = parseSearchResults(resultsPage([['Banks', '068', 'BRADLEY'], ['Banks', '068', 'DREW']]))
    expect(pickCandidate(banks, counties)).toMatchObject({ ok: true })
  })
})

describe('summary checks', () => {
  const pages = ['2025 Annual Drinking Water Quality Report', 'TYPE: Public Notice FROM: TO:\nFailed to conduct a public notice regarding a\ntotal coliform monitoring violation within the 5/1/2025 12/31/2025 No corrective action taken']
  it('accepts a confident summary whose quotes and dates are on the cited page', () => {
    const verdict = validateSummary(banksSummary, pages)
    expect(verdict).toMatchObject({ ok: true, issues: [{ category: 'publicNotice', page: 2, reportedFrom: '5/1/2025' }] })
    expect(verdict.ok && verdict.issues[0]).not.toHaveProperty('evidence')
  })
  it.each([
    ['yearMismatch', { reportYear: 2024 }],
    ['unsure', { confident: false }],
    ['unsure', { uncertainties: ['page 3 is blurry'] }],
    ['contradiction', { contradictions: ['HAA5 marked Y but text says no violations'] }],
    ['contradiction', { issues: [{ ...banksIssue, category: 'documentConflict' }] }],
    ['checksFailed', { issues: [{ ...banksIssue, page: 1 }] }],
    ['checksFailed', { issues: [{ ...banksIssue, page: 9 }] }],
    ['checksFailed', { issues: [{ ...banksIssue, evidence: 'Failed to submit lead and copper samples on time' }] }],
    ['checksFailed', { issues: [{ ...banksIssue, reportedFrom: '05/01/2025' }] }],
    ['checksFailed', { issues: [{ ...banksIssue, title: { en: 'x', es: '' } }] }],
  ] as const)('withholds the summary: %s', (reason, change) => {
    expect(validateSummary({ ...banksSummary, ...change } as AiSummary, pages)).toMatchObject({ ok: false, reason })
  })
  it('parses JSON wrapped in prose or code fences', () => {
    expect(parseAiJson('```json\n{"reportYear":2025,"confident":true,"contradictions":[],"issues":[]}\n```')).toMatchObject({ reportYear: 2025 })
  })
  it('reads the printed title year from saved texts', () => {
    expect(titleYear(readFileSync(new URL('text/068.txt', archive), 'utf8'))).toBe(2025)
    expect(titleYear(readFileSync(new URL('text/575.txt', archive), 'utf8'))).toBe(2024)
  })
})

describe.skipIf(!hasPoppler)('syncOne on saved ADH PDFs with a mocked AI', () => {
  it('publishes a checked AI summary for an exact match', async () => {
    const { doFetch, posts } = fakeAdh([['Banks', '068', 'BRADLEY']])
    const summarize = vi.fn(async () => banksSummary)
    const result = await syncOne(banks, deps(doFetch, summarize))
    expect(posts[0].get('ctl00$MainContent$txtName')).toBe('BANKS')
    expect(posts[0].get('ctl00$MainContent$lstSection')).toBe('2025')
    expect(posts[0].get('__VIEWSTATE')).toBe('vs')
    expect(summarize).toHaveBeenCalledOnce()
    expect(result.report).toMatchObject({ state: 'aiSummarized', url: 'https://health.arkansas.gov/eng/d.aspx?P=068&YEAR=2025', summarizedOn: '2026-11-08', model: 'test-model', issues: [{ category: 'publicNotice', page: 2 }] })
    expect(result.log).toMatchObject({ outcome: 'aiSummarized', pws: '068', pages: 3, sha256: '87d62047830f6882020da8fa832ccb62d633046b95bf5ee441f7fb083a507172' })
  })

  it('keeps the PDF link but no summary when the AI quote is not in the PDF', async () => {
    const { doFetch } = fakeAdh([['Banks', '068', 'BRADLEY']])
    const result = await syncOne(banks, deps(doFetch, async () => ({ ...banksSummary, issues: [{ ...banksIssue, evidence: 'Failed to monitor nitrate during the second quarter' }] })))
    expect(result.report).toMatchObject({ state: 'unreviewed', url: 'https://health.arkansas.gov/eng/d.aspx?P=068&YEAR=2025' })
    expect(result.report?.note?.en).toMatch(/did not pass WAVE’s checks/)
    expect(result.report?.note?.es).toMatch(/no pasó las verificaciones/)
  })

  it('stops before the AI when the printed report year is not 2025 (Springdale)', async () => {
    const { doFetch, posts } = fakeAdh([['Springdale', '575', 'WASHINGTON'], ['Springdale', '575', 'BENTON']])
    const summarize = vi.fn()
    const result = await syncOne({ id: 'ADH:s', name: 'SPRINGDALE WATER UTILITIES', county: 'Washington', pws: '575', reason: 'recheck' }, deps(doFetch, summarize))
    expect(posts[0].get('ctl00$MainContent$txtID')).toBe('575')
    expect(summarize).not.toHaveBeenCalled()
    expect(result.report).toMatchObject({ state: 'unreviewed' })
    expect(result.report?.note?.en).toMatch(/report year printed in the document is not 2025/)
  })

  it('records “no report found” only after a successful search, never a safety result', async () => {
    const { doFetch } = fakeAdh([])
    const result = await syncOne({ id: 'ADH:t', name: 'EUREKA RIVERSIDE RESORT', county: 'CARROLL', pws: 'T0467', reason: 'recheck' }, deps(doFetch, vi.fn()))
    expect(result.report).toMatchObject({ state: 'unavailable', sourceUrl: 'https://health.arkansas.gov/eng/WS.aspx?ID=T0467' })
    expect(result.report?.note?.en).toMatch(/No report findings or safety conclusion can be inferred/)
  })

  it('writes nothing when the search fails, the AI fails or the identity is ambiguous', async () => {
    const down = vi.fn(async () => new Response('busy', { status: 503 })) as unknown as typeof fetch
    const failed = await syncOne(banks, deps(down, vi.fn()))
    expect(failed.report).toBeUndefined()
    expect(failed.log.outcome).toBe('skipped')
    const { doFetch } = fakeAdh([['Banks', '068', 'BRADLEY']])
    const aiDown = await syncOne(banks, deps(doFetch, async () => { throw new Error('rate limited') }))
    expect(aiDown.report).toBeUndefined()
    expect(aiDown.log).toMatchObject({ outcome: 'skipped', detail: 'AI failed: rate limited' })
    const two = fakeAdh([['Banks', '068', 'BRADLEY'], ['Banks', '070', 'BRADLEY']])
    const ambiguous = await syncOne(banks, deps(two.doFetch, vi.fn()))
    expect(ambiguous.report).toBeUndefined()
    expect(ambiguous.log.detail).toMatch(/ambiguous/)
  })

  it('renders a module the app can import', async () => {
    const { doFetch } = fakeAdh([['Banks', '068', 'BRADLEY']])
    const { report } = await syncOne(banks, deps(doFetch, async () => banksSummary))
    const source = renderGeneratedModule({ [banks.id]: [report!] })
    expect(source).toMatch(/^\/\/ GENERATED by `npm run ccr:sync`/)
    expect(source).toContain('"state": "aiSummarized"')
  })
})
