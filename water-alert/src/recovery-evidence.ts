import { ANNUAL_REPORTS } from './annual-reports'
import type { Place } from './domain'

/** Exact supplier keys only; never use a name/county match or live reports in samples. */
export function reportEvidence(place: Place, sample: boolean) {
  if (sample || place.kind !== 'system' || !Object.hasOwn(ANNUAL_REPORTS, place.id)) return []
  return ANNUAL_REPORTS[place.id].flatMap(report => report.state === 'reviewed'
    ? report.issues.map((issue, index) => ({ key: `${report.year}:${index}`, report, issue })) : [])
}

export function reportAppendix(place: Place, sample: boolean, selected: readonly string[]) {
  const findings = reportEvidence(place, sample).filter(row => selected.includes(row.key))
  if (!findings.length) return ''
  return '\n\nHISTORICAL REPORT REFERENCES — dated document evidence, not a current compliance or safety assessment. Not proof of personal loss, liability or compensation entitlement. Verify the original English report.\n' + findings.map(({ report, issue }, index) =>
    `[H${index + 1}] Supplier: ${place.name}\nExact supplier ID: ${place.id}\nReport year: ${report.year}; page ${issue.page}\nReviewed transcription: ${issue.title.en}\nReported from: ${issue.reportedFrom ?? 'Not provided'}\nReported through: ${issue.currentAsPrinted ? '"Current" (as printed in the historical report; not current status)' : issue.reportedThrough ?? 'Not provided'}\nReported action: ${issue.action.en}\nSource: ${report.url}#page=${issue.page}\nManually reviewed: ${report.reviewedOn}`
  ).join('\n\n')
}
