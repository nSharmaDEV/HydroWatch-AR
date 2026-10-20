import { useId, useState } from 'react'
import type { Language } from './domain'
import type { AnnualReport, AnnualReportIssue } from './annual-reports'
import { SourceLink } from './components'
import { RECOVERY_RESOURCES } from './recovery-resources'

export function AnnualWaterReport({ reports, language }: { reports: readonly AnnualReport[]; language: Language }) {
  const [selectedYear, setSelectedYear] = useState<number>()
  const yearId = useId()
  const es = language === 'es'
  const report = reports.find(r => r.year === selectedYear) ?? reports[0]
  return <section className="annual-report" aria-label={es ? 'Informe anual de calidad del agua' : 'Annual water-quality report'}>
    <div className="annual-report-header">
      <h4>{es ? 'Informe anual de calidad del agua' : 'Annual water-quality report'}</h4>
      {report ? <div className="report-year"><label htmlFor={yearId}>{es ? 'Año' : 'Year'}</label><select id={yearId} value={report.year} onChange={e => setSelectedYear(Number(e.target.value))}>{reports.map(r => <option key={r.year} value={r.year}>{r.year}</option>)}</select></div> : null}
    </div>
    <ReportFindings key={report?.year ?? 'unknown'} report={report} language={language} />
    <p className="quiet-note report-limits">{es ? 'Informe histórico; no es una evaluación actual de cumplimiento ni de seguridad.' : 'Historical report—not a current compliance or safety assessment.'}</p>
  </section>
}

// A source row can list separate intervals. Keep both intervals, without
// counting the identical finding twice or implying an uninterrupted period.
function groupFindings(issues: readonly AnnualReportIssue[]) {
  const groups: { issue: AnnualReportIssue; periods: { from: string; through: string }[] }[] = []
  const intervalGroups = new Map<string, typeof groups[number]>()
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

function ReportFindings({ report, language }: { report?: AnnualReport; language: Language }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const es = language === 'es'
  const categories = {
    monitoring: es ? 'monitoreo/informes' : 'monitoring/reporting',
    licensing: es ? 'licencia' : 'licensing',
    publicNotice: es ? 'aviso público' : 'public notice',
    significantDeficiency: es ? 'deficiencias significativas' : 'significant deficiencies',
    waterQuality: es ? 'calidad del agua' : 'water quality',
    upstreamSupplier: es ? 'proveedor de origen' : 'upstream supplier',
    documentConflict: es ? 'contradicciones del documento' : 'document conflicts',
  }
  if (!report || report.state !== 'reviewed') return <div className="report-unreviewed">
    <p><strong>{report?.state === 'unavailable' ? es ? 'Informe no disponible' : 'Report unavailable' : es ? 'Informe aún no revisado' : 'Report not yet reviewed'}</strong></p>
    <p>{report?.state === 'unavailable' ? es ? 'No hay un informe disponible aquí. Busca el sistema y el año en ADH.' : 'No report is available here. Check the system and year at ADH.' : es ? 'Aún no hemos verificado los hallazgos del informe de este proveedor.' : 'We have not yet verified this provider’s report findings.'}</p>
    {report?.note ? <p>{report.note[language]}</p> : null}
    {report?.state === 'unavailable' && report.sourceUrl ? <SourceLink url={report.sourceUrl}>{es ? 'Directorio de ADH' : 'ADH directory'}</SourceLink> : null}
    {report?.state === 'unreviewed' ? <SourceLink url={report.url}>{es ? 'Ver informe original (PDF)' : 'View original report (PDF)'}</SourceLink> : null}
    <SourceLink url={RECOVERY_RESOURCES.annualReports}>{es ? 'Informes anuales de calidad del agua en ADH' : 'Annual water-quality reports at ADH'}</SourceLink>
  </div>

  const findings = groupFindings(report.issues)
  const count = findings.length
  const hasConflict = report.issues.some(issue => issue.category === 'documentConflict')
  const mixedFindings = report.issues.some(issue => ['significantDeficiency', 'upstreamSupplier', 'documentConflict'].includes(issue.category))
  const noun = mixedFindings ? es ? count === 1 ? 'hallazgo' : 'hallazgos' : count === 1 ? 'finding' : 'findings'
    : es ? count === 1 ? 'problema' : 'problemas' : count === 1 ? 'issue' : 'issues'
  const kinds = {
    monitoring: es ? 'Infracción de monitoreo/informes' : 'Monitoring/reporting violation',
    licensing: es ? 'Infracción de licencia' : 'Licensing violation',
    publicNotice: es ? 'Infracción de aviso público' : 'Public notice violation',
    significantDeficiency: es ? 'Deficiencia significativa' : 'Significant deficiency',
    waterQuality: es ? 'Infracción de calidad del agua' : 'Water-quality violation',
    upstreamSupplier: es ? 'Hallazgo del proveedor de origen' : 'Upstream supplier finding',
    documentConflict: es ? 'Contradicción del documento' : 'Document conflict',
  }
  return <>
    {report.note ? <p className="report-review-note">{report.note[language]}</p> : null}
    <div className={`report-summary${count ? ' report-summary-issues' : ''}`}>
      <div className="report-summary-header">
      <p className="report-finding"><strong>{hasConflict ? es ? `${count} hallazgos del informe; se requiere aclaración` : `${count} report findings; clarification needed` : count ? mixedFindings ? es ? `${count} ${noun} ${count === 1 ? 'reportado' : 'reportados'}` : `${count} ${noun} reported` : es ? `${count} ${noun} de cumplimiento ${count === 1 ? 'reportado' : 'reportados'}` : `${count} compliance ${noun} reported` : es ? 'No se reportaron infracciones' : 'No violations reported'}</strong></p>
      {count ? <button className="report-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? mixedFindings ? es ? 'Ocultar hallazgos' : 'Hide findings' : es ? 'Ocultar problemas' : 'Hide issues' : es ? `Ver ${count} ${noun}` : `View ${count} ${noun}`}<span className="disclosure-icon" aria-hidden="true" /></button> : null}
      </div>
      {count ? <p className="report-categories">{(Object.keys(categories) as (keyof typeof categories)[]).flatMap(category => {
        const n = findings.filter(({ issue }) => issue.category === category).length
        const label = n === 1 && category === 'significantDeficiency' ? es ? 'deficiencia significativa' : 'significant deficiency'
          : n === 1 && category === 'documentConflict' ? es ? 'contradicción del documento' : 'document conflict' : categories[category]
        return n ? [`${n} ${label}`] : []
      }).join(' · ')}</p> : null}
    {count ? <div id={id} hidden={!open} className="report-issues">
      <p className="quiet-note">{es ? 'Las fechas se muestran como en el informe (mes/día/año). Las acciones son las indicadas en el informe, no una verificación actual de resolución.' : 'Dates are shown as printed (month/day/year). Actions are reported by the document, not a present-day resolution check.'}</p>
      <ol>{findings.map(({ issue, periods }, i) => <li key={i}>
        <div className="report-issue-header"><h5>{issue.heading[language]}</h5><span className="report-issue-leader" aria-hidden="true" /><SourceLink url={`${report.url}#page=${issue.page}`}>{es ? `Informe, página ${issue.page}` : `Report, page ${issue.page}`}</SourceLink></div>
        <p className="report-issue-kind">{kinds[issue.category]}</p>
        <dl>{periods.length > 1 ? <div className="report-periods"><dt>{es ? 'Periodos reportados' : 'Reported periods'}</dt><dd><ul>{periods.map(period => <li key={`${period.from}-${period.through}`}>{period.from} – {period.through}</li>)}</ul></dd></div> : <>
          <div><dt>{issue.category === 'significantDeficiency' ? es ? 'Identificado el' : 'Identified on' : issue.dateLabel?.[language] ?? (es ? 'Desde (según el informe)' : 'Reported from')}</dt><dd>{issue.reportedFrom ?? (es ? 'No indicado en el informe' : 'Not provided in the report')}</dd></div>
          <div><dt>{issue.category === 'significantDeficiency' ? es ? 'Finalización reportada' : 'Reported completion' : es ? 'Hasta (según el informe)' : 'Reported through'}</dt><dd>{issue.currentAsPrinted ? es ? '“Current” (según el informe)' : '“Current” (as printed in the report)' : issue.reportedThrough ?? (es ? 'No indicado en el informe' : 'Not provided in the report')}</dd></div></>}
          <div><dt>{es ? 'Qué se reportó' : 'What was reported'}</dt><dd>{issue.title[language]}</dd></div>
          <div><dt>{issue.category === 'significantDeficiency' ? es ? 'Avance reportado' : 'Reported progress' : es ? 'Acción correctiva reportada' : 'Reported corrective action'}</dt><dd>{issue.action[language]}</dd></div></dl>
      </li>)}</ol>
      <p className="quiet-note">{es ? 'La falta de monitoreo no demuestra contaminación ni confirma que el agua sea segura.' : 'Missing monitoring does not prove contamination or establish that the water is safe.'}</p>
    </div> : null}
    </div>
    <div className="report-sources"><SourceLink url={report.url}>{es ? 'Ver informe original (PDF)' : 'View original report (PDF)'}</SourceLink><SourceLink url={RECOVERY_RESOURCES.annualReports}>{es ? 'Informes anuales de calidad del agua en ADH' : 'Annual water-quality reports at ADH'}</SourceLink></div>
    <p className="quiet-note">{es ? 'Revisión manual de ADH: ' : 'ADH report manually reviewed: '}<time dateTime={report.reviewedOn}>{report.reviewedOn}</time></p>
  </>
}
