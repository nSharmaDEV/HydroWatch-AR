import { ANNUAL_REPORTS, type AnnualReport } from './annual-reports'
import type { Language, Place } from './domain'
import type { HelpFact } from './help-requests'
import { deviceReport, readChecks, REPORT_CHECK_KEY, type StoredCheck } from './report-check'

/** Match the exact-supplier report source shown in Places; never treat a URL as a finding. */
export function helpReports(place: Place, sample: boolean, refreshed?: AnnualReport): readonly AnnualReport[] {
  if (sample || place.kind !== 'system') return []
  const reviewed = Object.hasOwn(ANNUAL_REPORTS, place.id) ? ANNUAL_REPORTS[place.id] : []
  const stored = readChecks<StoredCheck>(REPORT_CHECK_KEY)[place.id]
  const device = refreshed ?? (stored ? deviceReport(stored) : undefined)
  return [...reviewed, ...(device && !reviewed.some(report => report.year === device.year) ? [device] : [])].sort((a, b) => b.year - a.year)
}

/** Automated interpretation is disclosed historical context, never an agency quotation. */
export function detectedReportFacts(place: Place, sample: boolean, language: Language): HelpFact[] {
  const es = language === 'es'
  return helpReports(place, sample).flatMap(report => {
    if (report.state !== 'aiSummarized' && report.state !== 'autoRead') return []
    const date = report.state === 'aiSummarized' ? report.summarizedOn : report.readOn
    return report.issues.flatMap((issue, i): HelpFact[] => {
      if (!issue.title?.[language]?.trim()) return []
      const id = `${report.year}:${i}`, page = Number.isInteger(issue.page) && issue.page > 0 ? issue.page : undefined
      const period = [issue.reportedFrom, issue.reportedThrough].filter(Boolean).join(' – ')
      const status = issue.currentAsPrinted ? es ? '“Current” al imprimirse; no es el estado actual' : '“Current” as printed; not current status' : ''
      const text = es
        ? `Quisiera aclarar el siguiente hallazgo del informe de ${report.year}: ${issue.title[language]}.${period ? ` Período indicado: ${period}.` : ''}${status ? ` ${status}.` : ''} Acción indicada: ${issue.action[language]}.`
        : `I would like clarification of this finding in the ${report.year} report: ${issue.title[language]}.${period ? ` Reported period: ${period}.` : ''}${status ? ` ${status}.` : ''} Listed action: ${issue.action[language]}.`
      return [{ id, kind: 'historical', included: true, text, sources: [{ recordId: id, url: page ? `${report.url.replace(/#.*$/, '')}#page=${page}` : report.url, label: `${report.year}${page ? ` · ${es ? 'página' : 'page'} ${page}` : ''} · ${es ? 'leído' : 'read'} ${date}` }], record: { agency: 'Annual water-quality report', year: String(report.year), date: issue.reportedFrom ?? '', problem: issue.title[language], area: '', status, verified: false, sourceMethod: report.state } }]
    })
  })
}
