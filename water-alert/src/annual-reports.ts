import type { Language } from './domain'
import { OBSERVED_SUPPLIER_REPORTS } from './observed-supplier-reports.js'
import { AI_ANNUAL_REPORTS } from './ai-annual-reports.js'

type Text = Record<Language, string>
export interface AnnualReportIssue {
  category: 'monitoring' | 'licensing' | 'publicNotice' | 'significantDeficiency' | 'waterQuality' | 'upstreamSupplier' | 'documentConflict'
  title: Text
  heading: Text
  reportedFrom?: string
  dateLabel?: Text
  reportedThrough?: string
  action: Text
  page: number
  currentAsPrinted?: boolean
}
export type AnnualReport = { year: number } & (
  | { state: 'reviewed'; url: string; reviewedOn: string; issues: readonly AnnualReportIssue[]; note?: Text }
  // Written only by `npm run ccr:sync`: an AI summary of the whole PDF that
  // passed the script's identity, year, page and quote checks. Never a human
  // review; the UI labels it and the info dialog carries the AI disclaimer.
  | { state: 'aiSummarized'; url: string; summarizedOn: string; model: string; issues: readonly AnnualReportIssue[]; note?: Text }
  | { state: 'unreviewed'; url: string; note?: Text }
  | { state: 'unavailable'; note?: Text; sourceUrl?: string }
)
export type SummarizedReport = Extract<AnnualReport, { state: 'reviewed' | 'aiSummarized' }>
export const isSummarized = (report?: AnnualReport): report is SummarizedReport => report?.state === 'reviewed' || report?.state === 'aiSummarized'

/**
 * Human-reviewed records always win. Otherwise a newer automated result (AI
 * summary, unreviewed or not found) replaces the older not-reviewed record.
 */
export function mergeAnnualReports(human: Readonly<Record<string, readonly AnnualReport[]>>, automated: Readonly<Record<string, readonly AnnualReport[]>>) {
  const merged: Record<string, readonly AnnualReport[]> = { ...human }
  for (const [id, reports] of Object.entries(automated)) {
    if (!merged[id]?.some(r => r.state === 'reviewed')) merged[id] = reports
  }
  return merged
}

export const LEISURE_HILLS_ID = 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf'
// ADH's directory lists PWS 747 as VILLAGE WATER LLC (checked 2026-11-07): same
// system ID, Benton County, population 113 and WELL #1 as Leisure Hills.
export const VILLAGE_WATER_ID = 'ADH:60d4cc00909fefb1e5b34e34f861fd3a3e5003f571ac36e719f3716793c9535d'

// Manually transcribed from ADH's PWS 747 / 2025 PDF, pp. 1–2, checked 2026-10-19.
// Historical report findings only. Do not derive a live advisory or resolution from these rows.
const PWS_747_REPORTS: readonly AnnualReport[] = [{
  year: 2025, state: 'reviewed', reviewedOn: '2026-10-19',
  url: 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025',
  issues: [
    { category: 'monitoring', heading: { en: 'Bacteriological monitoring', es: 'Monitoreo bacteriológico' }, title: { en: 'Failed to monitor and/or report sample results, as specified in the RTCR', es: 'No se monitorearon y/o reportaron los resultados de muestras según la RTCR' }, reportedFrom: '07/11/2025', reportedThrough: '07/31/2025', action: { en: 'Resumed submission of the sampling report as required by state and federal regulations', es: 'Se reanudó la presentación del informe de muestreo según las normas estatales y federales' }, page: 2 },
    { category: 'monitoring', heading: { en: 'Bacteriological samples', es: 'Muestras bacteriológicas' }, title: { en: 'Failed to submit valid bacteriological samples', es: 'No se presentaron muestras bacteriológicas válidas' }, reportedFrom: '10/01/2025', reportedThrough: '10/31/2025', action: { en: 'Resumed bacteriological monitoring as required by state and federal regulations', es: 'Se reanudó el monitoreo bacteriológico según las normas estatales y federales' }, page: 2 },
    { category: 'licensing', heading: { en: 'State licensing', es: 'Licencia estatal' }, title: { en: 'State licensing regulations were not met', es: 'No se cumplieron las normas estatales de licencia' }, reportedFrom: '01/01/2025', reportedThrough: '12/31/2025', action: { en: 'None listed', es: 'Ninguna indicada' }, page: 2 },
    { category: 'publicNotice', heading: { en: 'Public education notice', es: 'Aviso de educación pública' }, title: { en: 'Failed to provide Public Education Notice regarding a National Primary Drinking Water Regulation Violation', es: 'No se proporcionó el aviso de educación pública sobre una infracción de la normativa nacional primaria de agua potable' }, reportedFrom: '10/01/2025', currentAsPrinted: true, action: { en: 'None listed', es: 'Ninguna indicada' }, page: 2 },
  ],
}]

/** Hand-reviewed records only. `ANNUAL_REPORTS` adds `npm run ccr:sync` output. */
export const HUMAN_ANNUAL_REPORTS: Readonly<Record<string, readonly AnnualReport[]>> = {
  ...OBSERVED_SUPPLIER_REPORTS,
  [LEISURE_HILLS_ID]: PWS_747_REPORTS,
  [VILLAGE_WATER_ID]: PWS_747_REPORTS,
  // All pages manually checked 2026-10-19: Bentonville pp. 1–3,
  // Fayetteville and Rogers pp. 1–2. Tables mark violations N; no separate
  // compliance issues are reported. Findings are document-scoped, not live.
  'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb': [{ year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: 'https://health.arkansas.gov/eng/d.aspx?P=041&YEAR=2025', issues: [] }],
  'ADH:d0d0e4d6d963087023a220d1e53cce5144fba15898034786ef95734647f08275': [{ year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: 'https://health.arkansas.gov/eng/d.aspx?P=569&YEAR=2025', issues: [] }],
  'ADH:ee7fdb65f65842e938d8b03b2ad2316ae23a827ee37db5e36728540a52bf09b7': [{ year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: 'https://health.arkansas.gov/eng/d.aspx?P=055&YEAR=2025', issues: [] }],
  // The requested year is 2025, but the returned title/footer says 2024 while
  // the test-results period says 2025. Do not silently assign reviewed findings.
  'ADH:053f9d9a4da2a01c88521af3b90956c809eb8a96e3df0304ab4cfa8956163140': [{ year: 2025, state: 'unreviewed', url: 'https://health.arkansas.gov/eng/d.aspx?P=575&YEAR=2025', note: {
    en: 'Checked Oct 19, 2026: ADH’s requested-year link returns a document titled 2024 with 2025 test results. The report year is inconsistent; findings have not been summarized.',
    es: 'Revisado el 19 de octubre de 2026: el enlace del año solicitado de ADH devuelve un documento titulado 2024 con resultados de 2025. El año del informe es inconsistente; no se han resumido los hallazgos.',
  } }],
}

export const ANNUAL_REPORTS: Readonly<Record<string, readonly AnnualReport[]>> = mergeAnnualReports(HUMAN_ANNUAL_REPORTS, AI_ANNUAL_REPORTS)
