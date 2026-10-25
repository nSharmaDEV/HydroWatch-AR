import { ANNUAL_REPORTS } from './annual-reports.js'
import type { Place } from './domain'
import type { HelpSource } from './help-requests'

/** Resident message prose; the old detailed appendix remains for other tools. */
export function reportMessage(place: Place, sample: boolean, selected: readonly string[], language: 'en' | 'es') {
  const findings = reportEvidence(place, sample).filter(row => selected.includes(row.key)), es = language === 'es'
  return {
    context: findings.map(({ report, issue }) => [
      es ? `El informe de ${report.year} (página ${issue.page}) registra: “${issue.title[language]}”.` : `The ${report.year} report (page ${issue.page}) records: “${issue.title[language]}”.`,
      issue.reportedFrom ? (es ? `El período indicado comienza el ${issue.reportedFrom}.` : `The reported period begins ${issue.reportedFrom}.`) : '',
      issue.currentAsPrinted ? (es ? 'El documento imprime “Current”; no es el estado actual.' : 'The document prints “Current”; this is not current status.') : issue.reportedThrough ? (es ? `El período indicado termina el ${issue.reportedThrough}.` : `The reported period ends ${issue.reportedThrough}.`) : '',
      issue.action.en !== 'None listed' ? (es ? `La acción indicada en ese documento es: “${issue.action[language]}”.` : `The action reported in that document is: “${issue.action[language]}”.`) : (es ? 'El documento no enumera una acción correctiva.' : 'The document lists no corrective action.'),
      es ? 'Es información histórica, no una evaluación del estado actual.' : 'This is historical information, not an assessment of current status.',
    ].filter(Boolean).join(' ')).join('\n\n'),
    sources: findings.map(({ key, report, issue }): HelpSource => ({ recordId: key, url: `${report.url}#page=${issue.page}`, label: `${report.year} · ${es ? 'página' : 'page'} ${issue.page} · ${es ? 'revisado' : 'reviewed'} ${report.reviewedOn}` })),
  }
}

/** Exact supplier keys only; never use a name/county match or live reports in samples. */
export function reportEvidence(place: Place, sample: boolean) {
  if (sample || place.kind !== 'system' || !Object.hasOwn(ANNUAL_REPORTS, place.id)) return []
  return ANNUAL_REPORTS[place.id].flatMap(report => report.state === 'reviewed'
    ? report.issues.map((issue, index) => ({ key: `${report.year}:${index}`, report, issue })) : [])
}

/** Report rows with no corrective action listed are included in all provider emails. */
export function requiredReportEvidence(place: Place, sample: boolean) {
  return reportEvidence(place, sample).filter(({ issue }) => issue.action.en === 'None listed')
}

export function reportAppendix(place: Place, sample: boolean, selected: readonly string[]) {
  const findings = reportEvidence(place, sample).filter(row => selected.includes(row.key))
  if (!findings.length) return ''
  return '\n\nHISTORICAL REPORT REFERENCES — dated document evidence, not a current compliance or safety assessment. Not proof of personal loss, liability or compensation entitlement. Verify the original English report.\n' + findings.map(({ report, issue }, index) =>
    `[H${index + 1}] Supplier: ${place.name}\nExact supplier ID: ${place.id}\nReport year: ${report.year}; page ${issue.page}\nReviewed transcription: ${issue.title.en}\nReported from: ${issue.reportedFrom ?? 'Not provided'}\nReported through: ${issue.currentAsPrinted ? '"Current" (as printed in the historical report; not current status)' : issue.reportedThrough ?? 'Not provided'}\nReported action: ${issue.action.en}\nSource: ${report.url}#page=${issue.page}\nManually reviewed: ${report.reviewedOn}`
  ).join('\n\n')
}
