// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import { checkAnnualReport } from '../server/annual-report-check'
import { createApp } from '../server/app'
import { ObservationStore } from '../server/store'
import { SourceRunner } from '../server/sources'
import { PushStore } from '../server/push'

const searchPage = '<form><input type="hidden" name="__VIEWSTATE" value="vs"><input type="hidden" name="__EVENTVALIDATION" value="ev"></form>'
const resultsPage = (rows: [string, string, string][]) => `<table>${rows.map(([name, pws, county]) => `<tr><td><a href="d.aspx?P=${pws}&amp;YEAR=2025">${name}</a></td><td>${pws}</td><td>${county}</td><td>2025</td></tr>`).join('')}</table>`
const samplePdf = new TextEncoder().encode('%PDF-1.4 fake body for signature checks only')

/** Offline ADH: the search form, a results table, then a document response. */
function fakeAdh(rows: [string, string, string][], document: { body?: Uint8Array | string; status?: number } = {}) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('CCRSearch.aspx') && init?.method === 'POST') return new Response(resultsPage(rows))
    if (url.includes('CCRSearch.aspx')) return new Response(searchPage, { headers: { 'set-cookie': 'ASP.NET_SessionId=abc; path=/' } })
    if (document.status && document.status >= 400) return new Response('unavailable', { status: document.status })
    const body = document.body ?? samplePdf
    return new Response(typeof body === 'string' ? body : new Uint8Array(body))
  }) as unknown as typeof fetch
}

const cave = { name: 'CAVE SPRINGS WATERWORKS', county: 'Benton' }
const CAVE_ID = 'ADH:76a865f0e02e2f8186f51f0623cc6ddc0dab83d8577f0f3a08de19c838d19183'

it('links the exact 2025 document when one system matches', async () => {
  const result = await checkAnnualReport(cave, fakeAdh([['Cave Springs', '043', 'BENTON']]), '2026-11-16')
  expect(result).toEqual({ state: 'unreviewed', year: 2025, url: 'https://health.arkansas.gov/eng/d.aspx?P=043&YEAR=2025', checkedAt: '2026-11-16' })
})

it('records "no report found" only after a search that returned nothing', async () => {
  const result = await checkAnnualReport(cave, fakeAdh([]), '2026-11-16')
  expect(result).toEqual({ state: 'unavailable', year: 2025, checkedAt: '2026-11-16' })
})

it('requires the county to match and never substitutes a similar system', async () => {
  const result = await checkAnnualReport(cave, fakeAdh([['Cave Springs', '043', 'WASHINGTON']]), '2026-11-16')
  expect(result).toEqual({ state: 'unavailable', year: 2025, checkedAt: '2026-11-16' })
})

it('refuses to choose between two systems with the same name', async () => {
  const result = await checkAnnualReport(cave, fakeAdh([['Cave Springs', '043', 'BENTON'], ['Cave Springs', '044', 'BENTON']]), '2026-11-16')
  expect(result).toEqual({ state: 'ambiguous' })
})

it.each([
  ['the document is not a PDF', { body: '<html>Server error</html>' }],
  ['the document request fails', { status: 500 }],
])('stores nothing when %s', async (_label, document) => {
  const result = await checkAnnualReport(cave, fakeAdh([['Cave Springs', '043', 'BENTON']], document), '2026-11-16')
  expect(result).toEqual({ state: 'incomplete' })
})

it('stores nothing when ADH cannot be reached, never an all-clear', async () => {
  const offline = vi.fn(async () => { throw new Error('ETIMEDOUT') }) as unknown as typeof fetch
  expect(await checkAnnualReport(cave, offline, '2026-11-16')).toEqual({ state: 'incomplete' })
  const down = vi.fn(async () => new Response('busy', { status: 503 })) as unknown as typeof fetch
  expect(await checkAnnualReport(cave, down, '2026-11-16')).toEqual({ state: 'incomplete' })
})

const servers: Server[] = []; const dirs: string[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map(s => new Promise<void>(resolve => s.close(() => resolve()))))
  await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true })))
})
async function setup(adhFetch: typeof fetch, reportReader?: { summarize: (pdf: Buffer) => Promise<any>; model: string }) {
  const dir = await mkdtemp(join(tmpdir(), 'report-check-test-')); dirs.push(dir)
  const store = new ObservationStore(dir); const pushes = new PushStore(dir)
  const runner = new SourceRunner(store, async () => { throw new Error('offline') })
  const app = createApp({ store, runner, pushes, origin: 'http://localhost:5178', publicKey: null, drain: async () => {}, adhFetch, reportReader })
  const server = app.listen(0, '127.0.0.1'); servers.push(server)
  await new Promise<void>(resolve => server.once('listening', resolve))
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`
}
const post = (base: string, body: unknown) => fetch(`${base}/api/annual-report/check`, {
  method: 'POST', headers: { Origin: 'http://localhost:5178', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

it('rejects unknown places and malformed requests', async () => {
  const base = await setup(fakeAdh([]))
  expect((await post(base, { placeId: 'ADH:not-a-real-system' })).status).toBe(400)
  expect((await post(base, {})).status).toBe(400)
})

// Reading the report: the same pipeline as `ccr:sync`, against saved ADH PDFs
// and a mocked summarizer so no AI call is made.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { describe } from 'vitest'
import { readAnnualReport } from '../server/annual-report-check'

const hasPoppler = (() => { try { execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); return true } catch { return false } })()
const savedPdf = (pws: string) => readFileSync(new URL(`../docs/research/adh-ccr-2025/pdfs/${pws}.pdf`, import.meta.url))
const banksIssue = {
  category: 'publicNotice', heading: { en: 'Public notice', es: 'Aviso público' },
  title: { en: 'Failed to conduct a public notice regarding a total coliform monitoring violation within the mandated timeframe', es: 'No se realizó el aviso público sobre una infracción de monitoreo de coliformes totales dentro del plazo obligatorio' },
  action: { en: 'No corrective action taken', es: 'No se tomó ninguna acción correctiva' },
  reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2,
  evidence: 'Failed to conduct a public notice regarding a total coliform monitoring violation',
}
const goodSummary = { reportYear: 2025, confident: true, uncertainties: [], contradictions: [], issues: [banksIssue] }
const adhServing = (name: string, county: string, pws: string) => vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input)
  if (url.includes('CCRSearch.aspx') && init?.method === 'POST') return new Response(resultsPage([[name, pws, county]]))
  if (url.includes('CCRSearch.aspx')) return new Response(searchPage, { headers: { 'set-cookie': 'ASP.NET_SessionId=abc; path=/' } })
  return new Response(new Uint8Array(savedPdf(pws)))
}) as unknown as typeof fetch

describe.skipIf(!hasPoppler)('reading the report on demand', () => {
  const banks = { name: 'BANKS WATERWORKS', county: 'Bradley' }
  // Leslie's report has a result row marked Y, which the rules decline to read.
  const leslie = { name: 'LESLIE WATER SYSTEM', county: 'Searcy' }
  const leslieSummary = {
    reportYear: 2025, confident: true, uncertainties: [], contradictions: [],
    issues: [{ category: 'monitoring', heading: { en: 'Bacteriological samples', es: 'Muestras bacteriológicas' }, title: { en: 'Failed to submit the proper number of valid bacteriological samples', es: 'No se presentó la cantidad requerida de muestras bacteriológicas válidas' }, action: { en: 'Resumed bacteriological monitoring', es: 'Se reanudó el monitoreo bacteriológico' }, reportedFrom: '09/01/2025', reportedThrough: '09/30/2025', page: 2, evidence: 'Failed to submit the proper number of valid bacteriological samples' }],
  }

  it('reads the report’s own tables with fixed rules, with no AI and no key', async () => {
    const summarize = vi.fn()
    const result = await readAnnualReport(banks, { summarize }, adhServing('Banks', 'BRADLEY', '068'), '2026-11-16')
    expect(result).toMatchObject({ state: 'autoRead', readOn: '2026-11-16', url: 'https://health.arkansas.gov/eng/d.aspx?P=068&YEAR=2025', issues: [{ category: 'publicNotice', reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2 }] })
    expect(summarize).not.toHaveBeenCalled()
  })

  it('links the PDF as not reviewed when the rules decline and there is no AI key', async () => {
    const result = await readAnnualReport(leslie, {}, adhServing('Leslie', 'SEARCY', '500'), '2026-11-16')
    expect(result).toMatchObject({ state: 'unreviewed', url: 'https://health.arkansas.gov/eng/d.aspx?P=500&YEAR=2025', note: { en: expect.stringContaining('could not read it automatically') } })
    expect(result).not.toHaveProperty('issues')
  })

  it('uses the AI only for a report the rules decline, and only when its quotes are in the PDF', async () => {
    const summarize = vi.fn(async () => leslieSummary)
    const result = await readAnnualReport(leslie, { summarize, model: 'test-model' }, adhServing('Leslie', 'SEARCY', '500'), '2026-11-16')
    expect(summarize).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ state: 'aiSummarized', model: 'test-model', issues: [{ category: 'monitoring', page: 2 }] })
    const bad = { ...leslieSummary, issues: [{ ...leslieSummary.issues[0], evidence: 'Failed to monitor nitrate during the second quarter' }] }
    const withheld = await readAnnualReport(leslie, { summarize: async () => bad, model: 'm' }, adhServing('Leslie', 'SEARCY', '500'), '2026-11-16')
    expect(withheld.state).toBe('unreviewed')
    expect(withheld).not.toHaveProperty('issues')
  })

  it('stores nothing when the AI fails or the identity is ambiguous', async () => {
    expect(await readAnnualReport(leslie, { summarize: async () => { throw new Error('rate limited') }, model: 'm' }, adhServing('Leslie', 'SEARCY', '500'), '2026-11-16')).toEqual({ state: 'incomplete' })
    const two = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes('CCRSearch.aspx') && init?.method === 'POST') return new Response(resultsPage([['Banks', '068', 'BRADLEY'], ['Banks', '070', 'BRADLEY']]))
      return new Response(searchPage, { headers: { 'set-cookie': 'ASP.NET_SessionId=abc; path=/' } })
    }) as unknown as typeof fetch
    expect(await readAnnualReport(banks, {}, two, '2026-11-16')).toEqual({ state: 'ambiguous' })
  })

  it('serves the reading through the API and memoizes it', async () => {
    const adh = adhServing('Cave Springs', 'BENTON', '068')
    const base = await setup(adh)
    expect(await (await post(base, { placeId: CAVE_ID })).json()).toMatchObject({ state: 'autoRead', issues: [{ category: 'publicNotice' }] })
    const calls = (adh as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    await post(base, { placeId: CAVE_ID })
    expect((adh as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(calls)
  })
})
