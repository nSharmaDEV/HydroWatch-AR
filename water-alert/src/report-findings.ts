import { ANNUAL_REPORTS, type AnnualReport, type AnnualReportIssue } from './annual-reports.js'
import type { Place } from './domain.js'

/**
 * Annual-report findings shown on Home and used for report alerts. These are
 * dated document findings, never current safety or compliance status.
 */
export interface ReportFinding { key: string; issue: AnnualReportIssue; askable: boolean }
export interface LatestReport { year: number; state: AnnualReport['state']; url?: string; checkedOn?: string; findings: ReportFinding[] }

/** The newest report for an exact supplier. Samples and lakes never show live report data. */
export function latestReport(place: Place, sample: boolean, reports: Readonly<Record<string, readonly AnnualReport[]>> = ANNUAL_REPORTS): LatestReport | undefined {
  if (sample || place.kind !== 'system' || !Object.hasOwn(reports, place.id)) return undefined
  const report = [...reports[place.id]].sort((a, b) => b.year - a.year)[0]
  if (!report) return undefined
  if (report.state !== 'reviewed' && report.state !== 'aiSummarized') return { year: report.year, state: report.state, url: report.state === 'unreviewed' ? report.url : report.sourceUrl, findings: [] }
  return {
    year: report.year, state: report.state, url: report.url,
    checkedOn: report.state === 'reviewed' ? report.reviewedOn : report.summarizedOn,
    // Only hand-checked findings can start a message; AI summaries are listed, labelled, never quoted.
    findings: report.issues.map((issue, index) => ({ key: `${report.year}:${index}`, issue, askable: report.state === 'reviewed' })),
  }
}

export interface ReportAlert { id: string; placeId: string; year: number; count: number; url: string }
const YEAR = 365 * 86400_000
/** One alert per supplier and report year: hand-checked, with issues, checked within the last year. */
export function reviewedReportAlerts(reports: Readonly<Record<string, readonly AnnualReport[]>> = ANNUAL_REPORTS, now = Date.now()): ReportAlert[] {
  return Object.entries(reports).flatMap(([placeId, list]) => {
    if (/sample/i.test(placeId)) return []
    const report = [...list].sort((a, b) => b.year - a.year)[0]
    if (report?.state !== 'reviewed' || !report.issues.length || now - Date.parse(report.reviewedOn) > YEAR) return []
    return [{ id: `report:${placeId}:${report.year}`, placeId, year: report.year, count: report.issues.length, url: report.url }]
  })
}

/** The resident's opening sentence for "Ask about this": quotes the hand-checked finding with its page and dates. */
export function reportQuestion(place: Place, key: string, language: 'en' | 'es'): string | undefined {
  const report = latestReport(place, false)
  const finding = report?.findings.find(f => f.key === key && f.askable)
  if (!report || !finding) return undefined
  const { issue } = finding, es = language === 'es'
  const dates = issue.reportedFrom
    ? issue.currentAsPrinted
      ? es ? ` (desde el ${issue.reportedFrom}, indicado como vigente cuando se imprimió el informe)` : ` (starting ${issue.reportedFrom}, listed as current when the report was printed)`
      : issue.reportedThrough ? es ? ` (del ${issue.reportedFrom} al ${issue.reportedThrough})` : ` (${issue.reportedFrom} to ${issue.reportedThrough})` : es ? ` (desde el ${issue.reportedFrom})` : ` (starting ${issue.reportedFrom})`
    : ''
  return es
    ? `Su informe anual del agua de ${report.year} (página ${issue.page}) indica: “${issue.title.es}”${dates}.`
    : `Your ${report.year} annual water report (page ${issue.page}) lists: “${issue.title.en}”${dates}.`
}
