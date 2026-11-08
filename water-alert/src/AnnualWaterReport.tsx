import { useId, useState } from 'react'
import { useMotionPresence } from './interface-motion'
import type { Language } from './domain'
import { isSummarized, type AnnualReport, type AnnualReportIssue, type SummarizedReport } from './annual-reports'
import { SourceLink } from './components'
import { Icon } from './icons'
import { RECOVERY_RESOURCES } from './recovery-resources'

// A quiet reference card: heading and source, secondary review metadata,
// then balanced finding sections. Report findings are dated document evidence.

export function useReportYear(reports: readonly AnnualReport[]) {
  const [selectedYear, setYear] = useState<number>()
  return { report: reports.find(r => r.year === selectedYear) ?? reports[0], setYear }
}

export const calendarIcon = <Icon name="calendar" size={16} />
export const formatIsoDate = (iso: string, language: Language) => new Date(`${iso}T12:00:00`).toLocaleDateString(language === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** Standalone use (help evidence): the same card. */
export function AnnualWaterReport({ reports, language }: { reports: readonly AnnualReport[]; language: Language }) {
  const { report, setYear } = useReportYear(reports)
  return <section className="annual-report-standalone" aria-label={language === 'es' ? 'Informe anual de calidad del agua' : 'Annual water-quality report'}>
    <AnnualReportCard reports={reports} report={report} onYear={setYear} language={language} />
  </section>
}

export function AnnualReportCard({ reports, report, onYear, language }: { reports: readonly AnnualReport[]; report?: AnnualReport; onYear: (year: number) => void; language: Language }) {
  const [open, setOpen] = useState(false)
  const motion = useMotionPresence(open, 'slide')
  const id = useId()
  const es = language === 'es'
  const status = reportStatus(report, language)
  const summary = isSummarized(report) ? summarizeFindings(report.issues, es) : undefined
  const ai = report?.state === 'aiSummarized'
  const count = summary?.count ?? 0
  // Findings the document printed as "Current". Historical: not present-day status.
  const ongoing = summary?.findings.filter(({ issue }) => issue.currentAsPrinted) ?? []
  // A missing report names its year only inside the pill, so the heading never implies a document exists.
  const found = report && report.state !== 'unavailable' ? report : undefined
  const reviewedOn = report?.state === 'reviewed' ? formatIsoDate(report.reviewedOn, language) : report?.state === 'aiSummarized' ? formatIsoDate(report.summarizedOn, language) : undefined
  // A clean reviewed report is heading-only; its review date moves into the PDF link's accessible name.
  const pdfLabel = es
    ? `Ver informe original (PDF)${reviewedOn && !count ? ai ? `, resumido por IA el ${reviewedOn}` : `, revisado el ${reviewedOn}` : ''}`
    : `View original report (PDF)${reviewedOn && !count ? ai ? `, AI summary ${reviewedOn}` : `, reviewed ${reviewedOn}` : ''}`
  const headerOnly = !count && !report?.note && !(report?.state === 'unavailable' && report.sourceUrl)
  return <article className={`provider-card annual-report${count ? ' report-summary-issues' : ''}${headerOnly ? ' annual-report-header-only' : ''}`}>
    <div className="provider-card-heading">
      {/* With findings, the dated count already sits in the Provider information chip and the facts below,
          so the visible heading is just "Annual report / PDF"; the year and status stay for screen readers. */}
      <h4>{es ? 'Informe anual' : 'Annual report'}{count && found ? <span className="sr-only">{es
        ? ` ${found.year}: ${status.label}; no es una evaluación actual de la seguridad del agua.`
        : ` ${found.year}: ${status.label}; not a current water-safety assessment.`}</span> : null}</h4>
      {found && reports.length > 1
        ? <select className="report-year-select" aria-label={es ? 'Año' : 'Year'} value={found.year} onChange={e => { setOpen(false); onYear(Number(e.target.value)) }}>{reports.map(r => <option key={r.year} value={r.year}>{r.year}</option>)}</select>
        : found && !count ? <span className="report-year">{found.year}</span> : null}
      {count ? null : <span className={`status-pill status-pill-${status.tone}${isSummarized(report) ? ' report-finding' : ''}`}>{status.label}{found ? <span className="sr-only">{es
        ? ` en el informe de ${found.year}; no es una evaluación actual de la seguridad del agua.`
        : ` in the ${found.year} report; not a current water-safety assessment.`}</span> : null}</span>}
      {/* Automated summaries are always labelled; the supplier info dialog explains the limits. */}
      {ai ? <span className="report-ai-tag">{es ? 'Resumen por IA' : 'AI summary'}</span> : null}
      {count && isSummarized(report) ? <p className="report-reviewed">{calendarIcon}<span>{ai ? es ? 'Resumido por IA' : 'AI summary' : es ? 'Revisado' : 'Reviewed'} <time dateTime={report.state === 'reviewed' ? report.reviewedOn : report.summarizedOn}>{reviewedOn}</time></span></p> : null}
      <span className="provider-card-source">
        {found
          ? <span className="report-pdf"><SourceLink url={found.url}><span aria-hidden="true">PDF</span><span className="sr-only">{pdfLabel}</span></SourceLink></span>
          : <SourceLink url={RECOVERY_RESOURCES.annualReports}>{es ? 'Informes de ADH' : 'ADH reports'}</SourceLink>}
      </span>
    </div>
    {count && isSummarized(report) ? <>
      <dl className={`provider-card-facts report-facts${ongoing.length ? '' : ' report-facts-single'}`}>
        {ongoing.length ? <div className="report-ongoing"><dt><Icon name="history" size={16} />{es ? 'En curso al imprimirse' : 'Ongoing when printed'}</dt><dd><ul className="report-ongoing-list">{ongoing.map(({ issue }, i) => <li key={i}><span className="report-ongoing-label">{categoryLabel(issue.category, 1, es)}</span>{issue.reportedFrom ? <span className="report-ongoing-since">{es ? `desde ${formatPrintedDate(issue.reportedFrom, language)}` : `since ${formatPrintedDate(issue.reportedFrom, language)}`}</span> : null}<span className="sr-only">{es ? `; el informe de ${report.year} imprime “Current”; no es el estado actual.` : `; the ${report.year} report prints “Current”; this is not current status.`}</span></li>)}</ul></dd></div> : null}
        <div><dt>{es ? 'Tipos de problemas' : 'Issue types'}</dt><dd><ul className="report-category-list">{categoryCounts(summary!.findings, es).map(({ count: n, label }) => <li key={label}><span className="report-category-count">{n}</span> {label}</li>)}</ul></dd></div>
      </dl>
      <div className="report-toggle-row"><button className="report-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open
        ? summary!.mixedFindings ? es ? 'Ocultar hallazgos' : 'Hide findings' : es ? 'Ocultar problemas' : 'Hide issues'
        : es ? `Ver ${count} ${summary!.noun}` : `View ${count} ${summary!.noun}`}<span className="disclosure-icon" aria-hidden="true" /></button></div>
      <div ref={motion.ref} id={id} hidden={!motion.present} inert={!open} aria-hidden={!open || undefined} className="report-issues"><IssueList report={report} findings={summary!.findings} language={language} /></div>
    </> : null}
    {isSummarized(report) && report.note ? <p className="report-review-note">{report.note[language]}</p> : null}
    {report && !isSummarized(report) && report.note ? <p className="provider-card-note report-check-note">{report.note[language]}</p> : null}
    {report?.state === 'unavailable' && report.sourceUrl ? <p className="provider-card-links"><SourceLink url={report.sourceUrl}>{es ? 'Directorio de ADH' : 'ADH directory'}</SourceLink></p> : null}
  </article>
}

/** True when a reviewed report lists at least one finding. */
export const reportHasFindings = (report?: AnnualReport) => isSummarized(report) && groupFindings(report.issues).length > 0

/**
 * Short dated chip for the collapsed Provider information header. Only shown
 * when the selected report lists findings; the year keeps it historical.
 */
export function reportHeaderChip(report: AnnualReport | undefined, language: Language) {
  if (!isSummarized(report)) return null
  const es = language === 'es'
  const { count, mixedFindings, hasConflict } = summarizeFindings(report.issues, es)
  if (!count) return null
  const chip = hasConflict ? es ? `${report.year}: requiere aclaración` : `${report.year}: clarification needed`
    : mixedFindings ? es ? `${report.year}: ${count} ${count === 1 ? 'hallazgo' : 'hallazgos'}` : `${report.year}: ${count} ${count === 1 ? 'finding' : 'findings'}`
    : es ? `${report.year}: ${count} ${count === 1 ? 'problema' : 'problemas'} de cumplimiento` : `${report.year}: ${count} compliance ${count === 1 ? 'issue' : 'issues'}`
  return report.state === 'aiSummarized' ? `${chip} · ${es ? 'resumen por IA' : 'AI summary'}` : chip
}

// One short status per report state, shown as the row's pill. Reviewed
// wording stays scoped to the document; it is never a present-day finding.
function reportStatus(report: AnnualReport | undefined, language: Language): { label: string; tone: 'issues' | 'clear' | 'neutral' } {
  const es = language === 'es'
  if (!report || report.state === 'unreviewed') return { label: es ? 'Aún no revisado' : 'Not yet reviewed', tone: 'neutral' }
  if (report.state === 'unavailable') return { label: es ? `No se encontró informe de ${report.year}` : `No ${report.year} report found`, tone: 'neutral' }
  const { count, noun, mixedFindings, hasConflict } = summarizeFindings(report.issues, es)
  if (hasConflict) return { label: es ? `${count} hallazgos del informe; se requiere aclaración` : `${count} report findings; clarification needed`, tone: 'issues' }
  if (!count) return { label: es ? 'No se reportaron infracciones' : 'No violations reported', tone: 'clear' }
  if (mixedFindings) return { label: es ? `${count} ${noun} ${count === 1 ? 'reportado' : 'reportados'}` : `${count} ${noun} reported`, tone: 'issues' }
  return { label: es ? `${count} ${noun} de cumplimiento ${count === 1 ? 'reportado' : 'reportados'}` : `${count} compliance ${noun} reported`, tone: 'issues' }
}

function summarizeFindings(issues: readonly AnnualReportIssue[], es: boolean) {
  const findings = groupFindings(issues)
  const count = findings.length
  const hasConflict = issues.some(issue => issue.category === 'documentConflict')
  const mixedFindings = issues.some(issue => ['significantDeficiency', 'upstreamSupplier', 'documentConflict'].includes(issue.category))
  const noun = mixedFindings ? es ? count === 1 ? 'hallazgo' : 'hallazgos' : count === 1 ? 'finding' : 'findings'
    : es ? count === 1 ? 'problema' : 'problemas' : count === 1 ? 'issue' : 'issues'
  return { findings, count, noun, mixedFindings, hasConflict }
}

type FindingGroup = { issue: AnnualReportIssue; periods: { from: string; through: string }[] }

// A source row can list separate intervals. Keep both intervals, without
// counting the identical finding twice or implying an uninterrupted period.
function groupFindings(issues: readonly AnnualReportIssue[]) {
  const groups: FindingGroup[] = []
  const intervalGroups = new Map<string, FindingGroup>()
  for (const issue of issues) {
    const period = issue.reportedFrom && issue.reportedThrough ? { from: issue.reportedFrom, through: issue.reportedThrough } : undefined
    const key = period && !issue.dateLabel && !issue.currentAsPrinted
      ? JSON.stringify([issue.category, issue.heading, issue.title, issue.action, issue.page]) : undefined
    const existing = key ? intervalGroups.get(key) : undefined
    if (existing && period) existing.periods.push(period)
    else {
      const group = { issue, periods: period ? [period] : [] }
      groups.push(group)
      if (key) intervalGroups.set(key, group)
    }
  }
  return groups
}

// Printed month/day/year dates (e.g. 10/01/2025) shown as a short date; any
// other printed form is kept exactly as printed.
function formatPrintedDate(printed: string, language: Language) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(printed)
  return match ? formatIsoDate(`${match[3]}-${match[1]}-${match[2]}`, language) : printed
}

function categoryLabel(category: AnnualReportIssue['category'], count: number, es: boolean) {
  if (count === 1 && category === 'significantDeficiency') return es ? 'Deficiencia significativa' : 'Significant deficiency'
  if (count === 1 && category === 'documentConflict') return es ? 'Contradicción del documento' : 'Document conflict'
  return categoryLabels(es)[category]
}

// One entry per category with findings; counts are grouped findings, so a
// finding printed with two intervals counts once.
function categoryCounts(findings: readonly FindingGroup[], es: boolean) {
  const categories = categoryLabels(es)
  return (Object.keys(categories) as (keyof typeof categories)[]).flatMap(category => {
    const count = findings.filter(({ issue }) => issue.category === category).length
    return count ? [{ count, label: categoryLabel(category, count, es) }] : []
  })
}

function categoryLabels(es: boolean): Record<AnnualReportIssue['category'], string> {
  return {
    monitoring: es ? 'Monitoreo/informes' : 'Monitoring/reporting',
    licensing: es ? 'Licencia' : 'Licensing',
    publicNotice: es ? 'Aviso público' : 'Public notice',
    significantDeficiency: es ? 'Deficiencias significativas' : 'Significant deficiencies',
    waterQuality: es ? 'Calidad del agua' : 'Water quality',
    upstreamSupplier: es ? 'Proveedor de origen' : 'Upstream supplier',
    documentConflict: es ? 'Contradicciones del documento' : 'Document conflicts',
  }
}

function IssueList({ report, findings, language }: { report: SummarizedReport; findings: readonly FindingGroup[]; language: Language }) {
  const es = language === 'es'
  const kinds = {
    monitoring: es ? 'Infracción de monitoreo/informes' : 'Monitoring/reporting violation',
    licensing: es ? 'Infracción de licencia' : 'Licensing violation',
    publicNotice: es ? 'Infracción de aviso público' : 'Public notice violation',
    significantDeficiency: es ? 'Deficiencia significativa' : 'Significant deficiency',
    waterQuality: es ? 'Infracción de calidad del agua' : 'Water-quality violation',
    upstreamSupplier: es ? 'Hallazgo del proveedor de origen' : 'Upstream supplier finding',
    documentConflict: es ? 'Contradicción del documento' : 'Document conflict',
  }
  const notProvided = es ? 'No indicado en el informe' : 'Not provided in the report'
  return <>
    <ol>{findings.map(({ issue, periods }, i) => {
      const deficiency = issue.category === 'significantDeficiency'
      return <li key={i}>
        <div className="report-issue-header"><h5>{issue.heading[language]}</h5><span className="report-issue-leader" aria-hidden="true" /><SourceLink url={`${report.url}#page=${issue.page}`}>{es ? `Informe, página ${issue.page}` : `Report, page ${issue.page}`}</SourceLink></div>
        <p className="report-issue-kind">{kinds[issue.category]}</p>
        <dl>{periods.length > 1 ? <div className="report-periods"><dt>{calendarIcon}{es ? 'Periodos reportados' : 'Reported periods'}</dt><dd><ul>{periods.map(period => <li key={`${period.from}-${period.through}`}>{period.from} – {period.through}</li>)}</ul></dd></div> : <>
          <div><dt>{calendarIcon}{deficiency ? es ? 'Identificado el' : 'Identified on' : issue.dateLabel?.[language] ?? (es ? 'Desde (según el informe)' : 'Reported from')}</dt><dd>{issue.reportedFrom ?? notProvided}</dd></div>
          <div><dt>{calendarIcon}{deficiency ? es ? 'Finalización reportada' : 'Reported completion' : es ? 'Hasta (según el informe)' : 'Reported through'}</dt><dd>{issue.currentAsPrinted ? es ? '“Current” (según el informe)' : '“Current” (as printed in the report)' : issue.reportedThrough ?? notProvided}</dd></div></>}
          <div><dt><Icon name="file-text" size={16} />{es ? 'Qué se reportó' : 'What was reported'}</dt><dd>{issue.title[language]}</dd></div>
          <div><dt><Icon name="wrench" size={16} />{deficiency ? es ? 'Avance reportado' : 'Reported progress' : es ? 'Acción correctiva reportada' : 'Reported corrective action'}</dt><dd>{issue.action[language]}</dd></div></dl>
      </li>
    })}</ol>
  </>
}
