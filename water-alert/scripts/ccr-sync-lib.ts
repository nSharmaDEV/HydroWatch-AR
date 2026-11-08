// Pure + dependency-injected pieces of `npm run ccr:sync`. Network, AI and
// PDF tools are passed in so tests run on saved PDFs with a mocked AI.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as cheerio from 'cheerio'
import type { AnnualReport, AnnualReportIssue } from '../src/annual-reports'

export const REPORT_YEAR = 2025
export const ADH_SEARCH_URL = 'https://health.arkansas.gov/eng/CCRSearch.aspx'
export const reportUrl = (pws: string, year = REPORT_YEAR) => `https://health.arkansas.gov/eng/d.aspx?P=${pws}&YEAR=${year}`
export const directoryUrl = (pws: string) => `https://health.arkansas.gov/eng/WS.aspx?ID=${pws}`

type Text = { en: string; es: string }
type Reports = Readonly<Record<string, readonly AnnualReport[]>>
export interface SystemPlace { id: string; name: string; county: string; kind: string }
export interface Target { id: string; name: string; county: string; pws?: string; reason: 'missing' | 'recheck' }
export interface Candidate { name: string; pws: string; year: number; cells: string[]; url: string }

/** PWS from an ADH URL (`d.aspx?P=`, `WS.aspx?ID=`), or undefined. */
export function pwsFromUrl(url?: string) {
  if (!url) return undefined
  const match = /[?&](?:P|ID)=([A-Za-z0-9]+)/i.exec(url)
  return match?.[1]
}

/**
 * Suppliers with no annual-report entry, plus not-reviewed ones (unreviewed,
 * unavailable, or an earlier automatic result) to check again. Human-reviewed
 * records are never targets.
 */
export function findTargets(places: readonly SystemPlace[], reports: Reports, knownPws: Readonly<Record<string, string>> = {}): Target[] {
  const seen = new Set<string>()
  const targets: Target[] = []
  for (const place of places) {
    if (place.kind !== 'system' || !place.id.startsWith('ADH:') || seen.has(place.id)) continue
    seen.add(place.id)
    const existing = Object.hasOwn(reports, place.id) ? reports[place.id] : undefined
    if (existing?.some(r => r.state === 'reviewed')) continue
    const report = existing?.find(r => r.year === REPORT_YEAR)
    const fromReport = report ? pwsFromUrl(report.state === 'unavailable' ? report.sourceUrl : report.url) : undefined
    const pws = knownPws[place.id] ?? fromReport
    if (existing && report?.state === 'aiSummarized') continue
    targets.push({ id: place.id, name: place.name, county: place.county, ...(pws ? { pws } : {}), reason: existing ? 'recheck' : 'missing' })
  }
  return targets
}

// Generic words that differ between ADH notice names and CCR search names
// ("NORTH HOWARD RURAL WATER ASSOCIATION" vs "North Howard RWA").
const GENERIC = new Set(['WATER', 'WATERWORKS', 'WORKS', 'SYSTEM', 'SYSTEMS', 'ASSOCIATION', 'ASSN', 'ASSOC', 'RURAL', 'RWA', 'RWD', 'PWA', 'PWFB', 'PUBLIC', 'AUTHORITY', 'UTILITIES', 'UTILITY', 'CITY', 'OF', 'THE', 'INC', 'LLC', 'COMMISSION', 'DEPT', 'DEPARTMENT', 'DISTRICT', 'USERS', 'CORP', 'CORPORATION', 'COMPANY', 'CO', 'AND'])
export function nameTokens(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(t => t && !GENERIC.has(t))
}
export const normalizeCounty = (county: string) => county.toUpperCase().replace(/\s+COUNTY$/, '').trim()

export function parseHiddenFields(html: string) {
  const $ = cheerio.load(html)
  const fields: Record<string, string> = {}
  $('input[type="hidden"]').each((_, el) => { const name = $(el).attr('name'); if (name) fields[name] = $(el).attr('value') ?? '' })
  return fields
}

/** Rows linking to `d.aspx?P=…&YEAR=…`; identity and year come from the link itself. */
export function parseSearchResults(html: string, base = ADH_SEARCH_URL): Candidate[] {
  const $ = cheerio.load(html)
  const out: Candidate[] = []
  $('a[href*="d.aspx"]').each((_, el) => {
    const url = new URL($(el).attr('href')!, base).toString()
    const params = new URL(url).searchParams
    const pws = params.get('P'), year = Number(params.get('YEAR'))
    if (!pws || !Number.isFinite(year)) return
    const cells = $(el).closest('tr').find('td').map((_, td) => $(td).text().trim()).get()
    out.push({ name: cells[0] || $(el).text().trim(), pws, year, cells, url })
  })
  return out
}

export type Pick = { ok: true; candidate: Candidate } | { ok: false; reason: 'none' | 'ambiguous' }
/**
 * Exact identity only. A known PWS must match the link's P= value; otherwise
 * county must match and the non-generic name words must be identical. Several
 * county rows for the same PWS are one report; two different PWS IDs are ambiguous.
 */
export function pickCandidate(target: Target, candidates: readonly Candidate[]): Pick {
  const county = normalizeCounty(target.county)
  const wanted = nameTokens(target.name).join(' ')
  const matches = candidates.filter(c => c.year === REPORT_YEAR && (target.pws
    ? c.pws.toUpperCase() === target.pws.toUpperCase()
    : c.cells.some(cell => normalizeCounty(cell) === county) && wanted !== '' && nameTokens(c.name).join(' ') === wanted))
  const ids = new Set(matches.map(c => c.pws.toUpperCase()))
  if (!matches.length) return { ok: false, reason: 'none' }
  if (ids.size > 1) return { ok: false, reason: 'ambiguous' }
  return { ok: true, candidate: matches[0] }
}

/** Year printed in "YYYY Annual Drinking Water Quality Report" on page 1. */
export function titleYear(pageOne: string) {
  const match = /(\d{4})\s+Annual\s+Drinking\s+Water\s+Quality\s+Report/i.exec(pageOne)
  return match ? Number(match[1]) : undefined
}
export const splitPages = (text: string) => text.split('\f').filter((page, i, all) => i < all.length - 1 || page.trim())
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length >= 2)
/** Every word of the quote appears on that page (layout text splits table cells, so order is not required). */
export function quoteOnPage(quote: string, page: string) {
  const onPage = new Set(words(page))
  const quoted = words(quote)
  return quoted.length >= 3 && quoted.every(w => onPage.has(w))
}

const CATEGORIES = ['monitoring', 'licensing', 'publicNotice', 'significantDeficiency', 'waterQuality', 'upstreamSupplier'] as const
export interface AiIssue extends Omit<AnnualReportIssue, 'category'> { category: string; evidence: string }
export interface AiSummary { reportYear: number | null; confident: boolean; contradictions: string[]; uncertainties?: string[]; issues: AiIssue[] }

export type Verdict = { ok: true; issues: AnnualReportIssue[] } | { ok: false; reason: 'yearMismatch' | 'unsure' | 'contradiction' | 'checksFailed'; detail: string }
const filled = (t: unknown): t is Text => !!t && typeof t === 'object' && typeof (t as Text).en === 'string' && typeof (t as Text).es === 'string' && !!(t as Text).en.trim() && !!(t as Text).es.trim()

/** Deterministic checks on the AI output against the extracted PDF pages. */
export function validateSummary(ai: AiSummary, pages: readonly string[]): Verdict {
  if (ai.reportYear !== REPORT_YEAR) return { ok: false, reason: 'yearMismatch', detail: `AI read report year ${ai.reportYear}` }
  if (ai.contradictions?.length || ai.issues?.some(i => i.category === 'documentConflict')) return { ok: false, reason: 'contradiction', detail: (ai.contradictions ?? []).join('; ') || 'documentConflict issue' }
  if (ai.confident !== true || ai.uncertainties?.length) return { ok: false, reason: 'unsure', detail: (ai.uncertainties ?? []).join('; ') || 'confident was not true' }
  if (!Array.isArray(ai.issues)) return { ok: false, reason: 'checksFailed', detail: 'issues missing' }
  const issues: AnnualReportIssue[] = []
  for (const [n, issue] of ai.issues.entries()) {
    const fail = (detail: string): Verdict => ({ ok: false, reason: 'checksFailed', detail: `issue ${n + 1}: ${detail}` })
    if (!(CATEGORIES as readonly string[]).includes(issue.category)) return fail(`category ${issue.category}`)
    if (!Number.isInteger(issue.page) || issue.page < 1 || issue.page > pages.length) return fail(`page ${issue.page} of ${pages.length}`)
    if (!filled(issue.heading) || !filled(issue.title) || !filled(issue.action)) return fail('missing English/Spanish text')
    if (issue.dateLabel !== undefined && !filled(issue.dateLabel)) return fail('dateLabel')
    if (typeof issue.evidence !== 'string' || !quoteOnPage(issue.evidence, pages[issue.page - 1])) return fail(`evidence not found on page ${issue.page}`)
    for (const date of [issue.reportedFrom, issue.reportedThrough]) if (date !== undefined && (typeof date !== 'string' || !date.trim() || !pages[issue.page - 1].includes(date.trim()))) return fail(`date ${date} not on page ${issue.page}`)
    issues.push({
      category: issue.category as AnnualReportIssue['category'], heading: issue.heading, title: issue.title, action: issue.action, page: issue.page,
      ...(issue.reportedFrom ? { reportedFrom: issue.reportedFrom } : {}),
      ...(issue.reportedThrough ? { reportedThrough: issue.reportedThrough } : {}),
      ...(issue.dateLabel ? { dateLabel: issue.dateLabel } : {}),
      ...(issue.currentAsPrinted ? { currentAsPrinted: true } : {}),
    })
  }
  return { ok: true, issues }
}

export const AI_PROMPT = `You are summarizing an Arkansas Department of Health (ADH) Consumer Confidence Report (annual drinking-water quality report) for a public app. Read EVERY page, including tables, footnotes, separate violation tables and significant-deficiency sections.

Report only what the document itself states as:
- monitoring/reporting violations (category "monitoring")
- state licensing violations ("licensing")
- public-notice violations ("publicNotice")
- significant deficiencies from a sanitary survey/inspection ("significantDeficiency")
- water-quality violations, e.g. a contaminant row marked Y in the violation column ("waterQuality")
- violations or Y rows explicitly attributed to an upstream/purchased-water supplier ("upstreamSupplier")
Do not list detected contaminants that are not marked as violations. Do not add advice, health conclusions or present-day status.

Return ONLY a JSON object, no prose:
{
  "reportYear": number|null,          // year printed in the report title
  "confident": boolean,               // false if any page is unreadable or anything is unclear
  "uncertainties": string[],          // anything you are unsure about; empty if none
  "contradictions": string[],         // statements that conflict (e.g. a Y violation row but text says "no violations"); empty if none
  "issues": [{
    "category": "monitoring"|"licensing"|"publicNotice"|"significantDeficiency"|"waterQuality"|"upstreamSupplier",
    "heading": {"en": short heading, "es": Spanish},
    "title": {"en": what was reported, close to the document wording, "es": Spanish},
    "action": {"en": corrective action as printed, or "None listed", "es": Spanish, or "Ninguna indicada"},
    "reportedFrom": date exactly as printed (omit if not printed),
    "reportedThrough": date exactly as printed (omit if not printed or printed as "Current"),
    "currentAsPrinted": true only if the end date is printed as "Current",
    "dateLabel": {"en","es"} only for significant deficiencies: {"en":"Survey / inspection date reported","es":"Fecha de inspección reportada"},
    "page": physical PDF page number (1-based),
    "evidence": a short verbatim quote (5-20 words) copied from that page that supports this issue
  }]
}
If the report lists no violations or significant deficiencies, return "issues": [].`

export interface AiClientOptions { apiKey: string; model: string; fetch?: typeof fetch }
export type Summarize = (pdf: Buffer) => Promise<AiSummary>
/** Claude Messages API with the whole PDF as a document block. */
export function claudeSummarizer({ apiKey, model, fetch: doFetch = fetch }: AiClientOptions): Summarize {
  return async pdf => {
    const response = await doFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 8000, temperature: 0, messages: [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
        { type: 'text', text: AI_PROMPT },
      ] }] }),
    })
    if (!response.ok) throw new Error(`Claude API ${response.status}: ${(await response.text()).slice(0, 300)}`)
    const body = await response.json() as { content: { type: string; text?: string }[] }
    return parseAiJson(body.content.filter(c => c.type === 'text').map(c => c.text).join(''))
  }
}
export function parseAiJson(text: string): AiSummary {
  const start = text.indexOf('{'), end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('AI response contained no JSON object')
  return JSON.parse(text.slice(start, end + 1)) as AiSummary
}

export interface PdfTools { text: (pdf: Buffer) => string; pages: (pdf: Buffer) => number }
/** Poppler `pdftotext -layout` / `pdfinfo`, reading the PDF from stdin. */
export const popplerTools: PdfTools = {
  text: pdf => execFileSync('pdftotext', ['-layout', '-', '-'], { input: pdf, maxBuffer: 64 * 1024 * 1024 }).toString('utf8'),
  pages: pdf => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', ['-'], { input: pdf }).toString('utf8'))?.[1] ?? 0),
}

/** GET for hidden fields + cookies, then POST the search (by PWS ID or by name). */
export async function searchAdh(query: { id?: string; name?: string }, doFetch: typeof fetch = fetch): Promise<Candidate[]> {
  const first = await doFetch(ADH_SEARCH_URL)
  if (!first.ok) throw new Error(`ADH search page ${first.status}`)
  const cookie = first.headers.getSetCookie?.().map(c => c.split(';')[0]).join('; ') ?? ''
  const form = new URLSearchParams({ ...parseHiddenFields(await first.text()), 'ctl00$MainContent$lstSection': String(REPORT_YEAR), 'ctl00$MainContent$btnSearch': 'Search' })
  if (query.id) form.set('ctl00$MainContent$txtID', query.id)
  if (query.name) form.set('ctl00$MainContent$txtName', query.name)
  const result = await doFetch(ADH_SEARCH_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) }, body: form.toString() })
  if (!result.ok) throw new Error(`ADH search ${result.status}`)
  return parseSearchResults(await result.text())
}

const longDate = (iso: string): Text => {
  const d = new Date(`${iso}T12:00:00`)
  return { en: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), es: d.toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' }) }
}
const NOT_PUBLISHED: Record<Exclude<Verdict, { ok: true }>['reason'], Text> = {
  yearMismatch: { en: 'the report year printed in the document is not 2025', es: 'el año impreso en el documento no es 2025' },
  unsure: { en: 'the automatic summary was not certain about the document', es: 'el resumen automático no tuvo certeza sobre el documento' },
  contradiction: { en: 'the document contains statements that conflict with each other', es: 'el documento contiene afirmaciones que se contradicen' },
  checksFailed: { en: 'the automatic summary did not pass WAVE’s checks against the PDF text', es: 'el resumen automático no pasó las verificaciones de WAVE con el texto del PDF' },
}

export interface SyncDeps { fetch: typeof fetch; summarize?: Summarize; pdfTools: PdfTools; today: string; model: string }
export interface SyncLog { id: string; name: string; reason: Target['reason']; pws?: string; outcome: 'aiSummarized' | 'unreviewed' | 'unavailable' | 'skipped'; detail?: string; url?: string; sha256?: string; bytes?: number; pages?: number }
export interface SyncResult { report?: AnnualReport; log: SyncLog; pdf?: Buffer; text?: string }

/**
 * One supplier. Network/AI failures and ambiguous identities are skipped (no
 * record written): a failure is never "no report found" and never all-clear.
 */
export async function syncOne(target: Target, deps: SyncDeps): Promise<SyncResult> {
  const base = { id: target.id, name: target.name, reason: target.reason }
  const checked = longDate(deps.today)
  const skip = (detail: string, extra: Partial<SyncLog> = {}): SyncResult => ({ log: { ...base, ...extra, outcome: 'skipped', detail } })
  let candidates: Candidate[]
  const query = target.pws ? { id: target.pws } : { name: nameTokens(target.name)[0] }
  if (!query.id && !query.name) return skip('no searchable name words')
  try { candidates = await searchAdh(query, deps.fetch) } catch (error) { return skip(`search failed: ${(error as Error).message}`) }
  const pick = pickCandidate(target, candidates)
  if (!pick.ok) {
    if (pick.reason === 'ambiguous') return skip(`ambiguous search result for “${query.id ?? query.name}”`)
    const where = target.pws ? `PWS ${target.pws}` : `“${query.name}” in ${normalizeCounty(target.county)} County`
    return { report: { year: REPORT_YEAR, state: 'unavailable', ...(target.pws ? { sourceUrl: directoryUrl(target.pws) } : {}), note: {
      en: `Checked ${checked.en}: no matching 2025 PDF found in ADH’s annual-report search for ${where}. No report findings or safety conclusion can be inferred.`,
      es: `Revisado el ${checked.es}: no se encontró un PDF de 2025 que coincida en la búsqueda de informes de ADH para ${where}. No se pueden inferir hallazgos ni conclusiones de seguridad.`,
    } }, log: { ...base, pws: target.pws, outcome: 'unavailable', detail: `no ${pick.reason === 'none' ? 'exact' : ''} match` } }
  }
  const { pws } = pick.candidate
  const url = reportUrl(pws)
  let pdf: Buffer
  try {
    const response = await deps.fetch(url)
    if (!response.ok) return skip(`PDF ${response.status}`, { pws, url })
    pdf = Buffer.from(await response.arrayBuffer())
  } catch (error) { return skip(`PDF download failed: ${(error as Error).message}`, { pws, url }) }
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return skip('response is not a PDF', { pws, url })
  const evidence = { pws, url, sha256: createHash('sha256').update(pdf).digest('hex'), bytes: pdf.length, pages: deps.pdfTools.pages(pdf) }
  const text = deps.pdfTools.text(pdf)
  const pages = splitPages(text)
  const notPublished = (reason: keyof typeof NOT_PUBLISHED, detail: string): SyncResult => ({ pdf, text, report: { year: REPORT_YEAR, state: 'unreviewed', url, note: {
    en: `Checked ${checked.en}: ADH’s 2025 PDF was found, but no summary is shown because ${NOT_PUBLISHED[reason].en}. Open the original PDF.`,
    es: `Revisado el ${checked.es}: se encontró el PDF de 2025 de ADH, pero no se muestra un resumen porque ${NOT_PUBLISHED[reason].es}. Abra el PDF original.`,
  } }, log: { ...base, ...evidence, outcome: 'unreviewed', detail: `${reason}: ${detail}` } })
  if (!evidence.pages || pages.length !== evidence.pages) return notPublished('checksFailed', `text pages ${pages.length} vs PDF pages ${evidence.pages}`)
  const printed = titleYear(pages[0])
  if (printed !== REPORT_YEAR) return notPublished('yearMismatch', `title year ${printed ?? 'not found'}`)
  if (!deps.summarize) return skip('dry run: AI step not run', evidence)
  let ai: AiSummary
  try { ai = await deps.summarize(pdf) } catch (error) { return skip(`AI failed: ${(error as Error).message}`, evidence) }
  const verdict = validateSummary(ai, pages)
  if (!verdict.ok) return notPublished(verdict.reason, verdict.detail)
  return { pdf, text, report: { year: REPORT_YEAR, state: 'aiSummarized', url, summarizedOn: deps.today, model: deps.model, issues: verdict.issues }, log: { ...base, ...evidence, outcome: 'aiSummarized', detail: `${verdict.issues.length} issue(s)` } }
}

export function renderGeneratedModule(reports: Reports) {
  const sorted = Object.fromEntries(Object.entries(reports).sort(([a], [b]) => a.localeCompare(b)))
  return `// GENERATED by \`npm run ccr:sync\` (scripts/ccr-sync.ts). Do not hand-edit:
// hand-reviewed records belong in annual-reports.ts / observed-supplier-reports.ts.
// Run log: docs/research/adh-ccr-2025/ai-sync-log.json.
import type { AnnualReport } from './annual-reports'

export const AI_ANNUAL_REPORTS: Readonly<Record<string, readonly AnnualReport[]>> = ${JSON.stringify(sorted, null, 2)}
`
}
