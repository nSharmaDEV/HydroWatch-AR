// One on-demand ADH annual-report lookup for a single supplier.
//
// This finds and links a document. It never reads one: no PDF text extraction,
// no summary, no findings. Those stay with `npm run ccr:sync`, whose output is
// reviewed in a diff before it ships. Identity comes from `pickCandidate`
// unchanged, so an ambiguous or missing match is reported as such and never
// guessed. A failed check returns a non-storing state: "we could not check" is
// never recorded as "no report" and never as an all-clear.
import { REPORT_YEAR, nameTokens, normalizeCounty, pickCandidate, popplerTools, reportUrl, searchAdh, splitPages, titleYear, validateSummary, type PdfTools, type Summarize, type Target } from '../scripts/ccr-sync-lib.js'
import { readByRules } from '../scripts/ccr-rules-lib.js'
import type { AnnualReportIssue } from '../src/annual-reports.js'

export type ReportCheck =
  | { state: 'aiSummarized'; year: number; url: string; summarizedOn: string; model: string; issues: readonly AnnualReportIssue[]; checkedAt: string }
  | { state: 'autoRead'; year: number; url: string; readOn: string; issues: readonly AnnualReportIssue[]; checkedAt: string }
  | { state: 'unreviewed'; year: number; url: string; checkedAt: string; note?: { en: string; es: string } }
  | { state: 'unavailable'; year: number; sourceUrl?: string; checkedAt: string }
  | { state: 'ambiguous' }
  | { state: 'incomplete' }

export interface CheckableSystem { name: string; county: string }

/** ADH is slow; each hop gets its own budget so one stall cannot hang the request. */
const timed = (doFetch: typeof fetch, ms: number): typeof fetch =>
  (input, init) => doFetch(input, { ...init, signal: AbortSignal.timeout(ms) })

export const todayInArkansas = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

export async function checkAnnualReport(system: CheckableSystem, doFetch: typeof fetch = fetch, checkedAt = todayInArkansas()): Promise<ReportCheck> {
  const name = nameTokens(system.name)[0]
  if (!name) return { state: 'incomplete' }
  const fetcher = timed(doFetch, 10_000)
  let candidates
  try { candidates = await searchAdh({ name }, fetcher) } catch { return { state: 'incomplete' } }
  // County and the full set of non-generic name words must match exactly.
  const target: Target = { id: '', name: system.name, county: normalizeCounty(system.county), reason: 'missing' }
  const pick = pickCandidate(target, candidates)
  if (!pick.ok) return pick.reason === 'ambiguous' ? { state: 'ambiguous' } : { state: 'unavailable', year: REPORT_YEAR, checkedAt }
  const { pws } = pick.candidate
  const url = reportUrl(pws)
  try {
    // Only the signature is needed, so ask for the first bytes; ADH may ignore it.
    const response = await fetcher(url, { headers: { Range: 'bytes=0-7' } })
    if (!response.ok) return { state: 'incomplete' }
    const head = Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString('latin1')
    if (head !== '%PDF-') return { state: 'incomplete' }
  } catch { return { state: 'incomplete' } }
  return { state: 'unreviewed', year: REPORT_YEAR, url, checkedAt }
}

export interface ReadDeps { summarize?: Summarize; model?: string; pdfTools?: PdfTools }

const longDate = (iso: string): { en: string; es: string } => {
  const d = new Date(`${iso}T12:00:00`)
  return { en: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), es: d.toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' }) }
}
const found = (checkedAt: string, en: string, es: string) => {
  const d = longDate(checkedAt)
  return { en: `Checked ${d.en}: ADH’s 2025 PDF was found, but ${en} Open the original PDF.`, es: `Revisado el ${d.es}: se encontró el PDF de 2025 de ADH, pero ${es} Abra el PDF original.` }
}

/**
 * Finds the 2025 report and reads it. Identity, the printed 2025 title and the
 * page count are checked first, exactly as in `npm run ccr:sync`. The report's
 * own tables are then read with fixed rules (`readByRules`), which show nothing
 * when anything is unclear. Only if the rules decline, and only when an AI key
 * is configured, is the PDF summarized by AI, and that summary is kept only if
 * every cited page, date and quote is found in the PDF text. Otherwise the PDF
 * link is shown as not reviewed. Each source is labelled as what it is.
 */
export async function readAnnualReport(system: CheckableSystem, deps: ReadDeps = {}, doFetch: typeof fetch = fetch, checkedAt = todayInArkansas()): Promise<ReportCheck> {
  const fetcher = timed(doFetch, 60_000)
  const tools = deps.pdfTools ?? popplerTools
  const name = nameTokens(system.name)[0]
  if (!name) return { state: 'incomplete' }
  let candidates
  try { candidates = await searchAdh({ name }, fetcher) } catch { return { state: 'incomplete' } }
  const target: Target = { id: '', name: system.name, county: normalizeCounty(system.county), reason: 'missing' }
  const pick = pickCandidate(target, candidates)
  if (!pick.ok) return pick.reason === 'ambiguous' ? { state: 'ambiguous' } : { state: 'unavailable', year: REPORT_YEAR, checkedAt }
  const url = reportUrl(pick.candidate.pws)
  let pdf: Buffer
  try {
    const response = await fetcher(url)
    if (!response.ok) return { state: 'incomplete' }
    pdf = Buffer.from(await response.arrayBuffer())
  } catch { return { state: 'incomplete' } }
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return { state: 'incomplete' }
  let text: string, pageCount: number
  try { text = tools.text(pdf); pageCount = tools.pages(pdf) } catch { return { state: 'incomplete' } }
  const pages = splitPages(text)
  const unread = (en: string, es: string): ReportCheck => ({ state: 'unreviewed', year: REPORT_YEAR, url, checkedAt, note: found(checkedAt, en, es) })
  if (!pageCount || pages.length !== pageCount) return unread('WAVE could not match its text to the document.', 'WAVE no pudo hacer coincidir su texto con el documento.')
  if (titleYear(pages[0]) !== REPORT_YEAR) return unread('the report year printed in the document is not 2025.', 'el año impreso en el documento no es 2025.')
  const rules = readByRules(text, pageCount)
  if (rules.ok) return { state: 'autoRead', year: REPORT_YEAR, url, readOn: checkedAt, issues: rules.issues, checkedAt }
  if (!deps.summarize) return unread('WAVE could not read it automatically.', 'WAVE no pudo leerlo automáticamente.')
  let ai
  try { ai = await deps.summarize(pdf) } catch { return { state: 'incomplete' } }
  const verdict = validateSummary(ai, pages)
  if (!verdict.ok) return unread('the automatic summary did not pass WAVE’s checks against the PDF text.', 'el resumen automático no pasó las verificaciones de WAVE con el texto del PDF.')
  return { state: 'aiSummarized', year: REPORT_YEAR, url, summarizedOn: checkedAt, model: deps.model ?? 'unknown', issues: verdict.issues, checkedAt }
}
