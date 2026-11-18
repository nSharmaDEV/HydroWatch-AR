import { useId, useState } from 'react'
import type { Language } from './domain'
import { SourceLink } from './components'
import { Icon } from './icons'
import { useMotionPresence } from './interface-motion'
import { formatIsoDate } from './AnnualWaterReport'
import type { EchoStatus } from './echo-check'
import { byReportedPeriod, methodLabel, readablePrinted, type EvidenceDocument, type EvidenceIssue } from './evidence-model'
import { currentProblem, problemGroups, problemHeading } from './evidence-presentation'
import { factIdForIssue } from './help-evidence'
import type { ProviderEvidence } from './provider-evidence'

/**
 * Provider information, extended into an official-document evidence review.
 *
 * The original report card holds source rows, inline historical issues and
 * source details. Existing directory facts remain alongside it. No dialogs.
 *
 * Everything shown is dated document evidence. It never changes the live
 * advisory status above it, and a short list is never an all-clear.
 */

/** Full inline issues before the additional-issues disclosure. */
const PREVIEW_FINDINGS = 3
/** From this many visible problems, every type is its own collapsible group. */
const COLLAPSE_ALL_AT = 6

/** One on-demand lookup offered beside the source it refreshes. */
export interface SourceCheck { run: () => void; busy: boolean; failed?: boolean; message?: string; checkedOn?: string }

export function ProviderEvidenceSections({ evidence, language, onAsk, onCheckRecords, recordsStatus, reportCheck, children }: {
  evidence: ProviderEvidence
  language: Language
  /** Starts the existing Help flow with this finding emphasized. */
  onAsk?: (key: string) => void
  onCheckRecords?: () => void
  recordsStatus?: EchoStatus
  /** The existing annual-report lookup, kept where it has always been offered. */
  reportCheck?: SourceCheck
  /** The existing Water system card. */
  children?: React.ReactNode
}) {
  const es = language === 'es'
  const [showIssues, setShowIssues] = useState(false)
  const [filter, setFilter] = useState<'present' | 'all'>('all')
  const issuesMotion = useMotionPresence(showIssues, 'slide')
  const prefix = useId()
  const ordered = [...evidence.issues].sort(byReportedPeriod)
  const byId = new Map(evidence.documents.map(document => [document.id, document]))
  const hasReadRecords = evidence.documents.some(document => document.availability === 'available' && document.method !== 'notReviewed')
  const current = ordered.filter(currentProblem)
  const visible = filter === 'present' ? current : ordered
  // A long list reads more easily when every type is its own collapsible group.
  const collapseAll = visible.length >= COLLAPSE_ALL_AT

  return <div className="provider-cards">
    <section className="provider-card annual-report evidence-findings evidence-records">
      <SourceStates evidence={evidence} language={language} onCheckRecords={onCheckRecords} recordsStatus={recordsStatus} reportCheck={reportCheck} />
      {ordered.length ? <div className="evidence-filters" role="group" aria-label={es ? 'Problemas registrados' : 'Recorded problems'}>
        <button className="report-toggle secondary evidence-current-toggle" aria-pressed={showIssues && filter === 'present'} aria-expanded={showIssues && filter === 'present'} aria-controls={`${prefix}-issues`} onClick={() => { setFilter('present'); setShowIssues(value => filter !== 'present' || !value) }}>{es ? 'Problemas actuales' : 'Current Problems'} · {hasReadRecords ? current.length : '—'}<Icon name="chevron-down" className="evidence-chevron" size={18} /></button>
        <button className="report-toggle evidence-issues-toggle" aria-pressed={showIssues && filter === 'all'} aria-expanded={showIssues && filter === 'all'} aria-controls={`${prefix}-issues`} onClick={() => { setFilter('all'); setShowIssues(value => filter !== 'all' || !value) }}>{es ? `Todos los problemas registrados · ${ordered.length}` : `All recorded problems · ${ordered.length}`}<Icon name="chevron-down" className="evidence-chevron" size={18} /></button>
      </div> : null}
      {ordered.length ? <div ref={issuesMotion.ref} id={`${prefix}-issues`} hidden={!issuesMotion.present} inert={!showIssues} aria-hidden={!showIssues || undefined}>
        {visible.length ? <div key={filter} className="evidence-type-groups">{problemGroups(visible, language).map(group => <ProblemGroup key={group.key} label={group.label} issues={group.issues} documents={byId} language={language} onAsk={onAsk} current={filter === 'present'} collapse={collapseAll} />)}</div> : <p role="status">{!hasReadRecords ? es ? 'No hay registros leídos disponibles.' : 'No read records available.' : filter === 'present' ? es ? 'No hay problemas que coincidan con este filtro en los registros consultados.' : 'No matching open problems in the records checked.' : es ? 'No se identificaron problemas en los registros leídos; la cobertura puede ser incompleta.' : 'No problems identified in the records read; coverage may be incomplete.'}</p>}
      </div> : null}
    </section>

    {children}
  </div>
}

function ProblemGroup({ label, issues, documents, language, onAsk, current, collapse }: { label: string; issues: EvidenceIssue[]; documents: Map<string, EvidenceDocument>; language: Language; onAsk?: (key: string) => void; current: boolean; collapse: boolean }) {
  const [showMore, setShowMore] = useState(false)
  const id = useId(), es = language === 'es'
  const extra = issues.length - PREVIEW_FINDINGS
  const content = <div className="report-issues">
    {issues.slice(0, PREVIEW_FINDINGS).map((issue, index) => <InlineIssue key={issue.id} issue={issue} number={index + 1} documents={documents} language={language} onAsk={onAsk} current={current} />)}
    {extra > 0 ? <>
      <div id={id} className="evidence-extra-issues" hidden={!showMore}>{issues.slice(PREVIEW_FINDINGS).map((issue, index) => <InlineIssue key={issue.id} issue={issue} number={index + PREVIEW_FINDINGS + 1} documents={documents} language={language} onAsk={onAsk} current={current} />)}</div>
      <div className="evidence-more-row"><button className="primary evidence-more" aria-expanded={showMore} aria-controls={id} onClick={() => setShowMore(value => !value)}>{showMore ? es ? 'Mostrar menos' : 'Show less' : es ? `Mostrar ${extra} más` : `Show ${extra} more`}</button></div>
    </> : null}
  </div>
  return !collapse && issues.length <= 2 ? <section className="evidence-type-group evidence-type-inline"><h4>{label} · {issues.length}</h4>{content}</section> : <details className="evidence-type-group"><summary><span>{label} · {issues.length}</span><Icon name="chevron-down" className="evidence-chevron" size={18} /></summary>{content}</details>
}

function InlineIssue({ issue, number, documents, language, onAsk }: { issue: EvidenceIssue; number: number; documents: Map<string, EvidenceDocument>; language: Language; onAsk?: (key: string) => void; current?: boolean }) {
  const es = language === 'es'
  const actions = issue.actions.filter(action => !action.predatesPeriod)
  const title = problemHeading(issue, language)
  return <article className="evidence-inline-issue">
    <div className="report-issue-header"><h5><span>{number}.</span> {title}</h5>{onAsk ? <><span className="report-issue-leader" aria-hidden="true" /><button className="secondary report-ask" onClick={() => onAsk(factIdForIssue(issue))}>{es ? 'Preguntar sobre esto' : 'Ask about this'}</button></> : null}</div>
    <div className="evidence-inline-sources">{issue.citations.map((citation, index) => citation.url ? <SourceLink key={index} url={citation.url}>{documents.get(citation.documentId)?.type === 'annualReport' ? `${es ? 'Informe' : 'Report'}${citation.page ? `, ${es ? 'página' : 'page'} ${citation.page}` : ''}` : `${es ? 'Registro de EPA' : 'EPA record'}${citation.recordRef ? ` · ${citation.recordRef}` : ''}`}</SourceLink> : null)}</div>
    <dl className="evidence-inline-dates">
      <div><dt><Icon name="calendar" size={16} />{es ? 'Desde (según el informe)' : 'Reported from'}</dt><dd>{issue.period.from ?? (es ? 'No indicado' : 'Not stated')}</dd></div>
      <div><dt><Icon name="calendar" size={16} />{es ? 'Hasta (según el informe)' : 'Reported through'}</dt><dd>{issue.period.through ?? (issue.period.currentAsPrinted ? es ? '“Current” (según el informe)' : '“Current” (as printed in the report)' : es ? 'Sin fecha de fin registrada' : 'No end date recorded')}</dd></div>
      <div><dt><Icon name="file-text" size={16} />{es ? 'Qué se reportó' : 'What was reported'}</dt><dd>{issue.title[language]}{issue.upstream ? <p className="evidence-note">{es ? 'Corresponde al proveedor de origen.' : 'Reported for the upstream supplier.'}</p> : null}</dd></div>
      <div><dt><Icon name="wrench" size={16} />{es ? 'Acción correctiva reportada' : 'Reported corrective action'}</dt><dd>{actions.length ? actions.map((action, index) => <span className="evidence-action" key={index}>{action.label[language]}{action.on ? ` (${readablePrinted(action.on, language)})` : ''}</span>) : es ? 'No se indica en estos registros.' : 'Not listed in these records.'}</dd></div>
    </dl>
    {issue.resolution ? <p className="evidence-inline-resolution"><strong>{es ? 'Resolución documentada' : 'Resolution documented'}</strong>: {issue.resolution.label[language]}{issue.resolution.on ? ` (${issue.resolution.on})` : ''}</p> : null}
    {issue.resolution && issue.conflicts.some(conflict => conflict.kind === 'status' || conflict.kind === 'date') ? <p className="evidence-note">{es ? 'El informe y el registro de resolución no coinciden.' : 'The report and resolution record differ.'}</p> : null}
  </article>
}

function SourceStates({ evidence, language, onCheckRecords, recordsStatus, reportCheck }: {
  evidence: ProviderEvidence; language: Language; onCheckRecords?: () => void; recordsStatus?: EchoStatus; reportCheck?: SourceCheck
}) {
  const es = language === 'es'
  const checks: Partial<Record<string, SourceCheck>> = {
    ...(reportCheck ? { adhAnnualReport: reportCheck } : {}),
    ...(onCheckRecords ? { epaEcho: { run: onCheckRecords, busy: recordsStatus === 'checking', failed: recordsStatus === 'incomplete' } } : {}),
  }
  const stateLabel = (state: string) => state === 'none' ? (es ? 'Sin registros devueltos' : 'No records returned')
    : state === 'incomplete' ? (es ? 'No se pudo consultar' : 'Could not be checked')
    : state === 'unsupported' ? (es ? 'No disponible aquí' : 'Not available here')
    : (es ? 'Aún no consultado' : 'Not checked yet')
  const structured = evidence.documents.find(document => document.method === 'structuredRecord')
  const extract = structured?.version?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0]
  return <ul className="evidence-source-headers">
    {evidence.sources.map(source => {
      const check = source.state === 'unsupported' ? undefined : checks[source.id]
      const annual = source.id === 'adhAnnualReport'
      const report = annual ? evidence.documents.find(document => document.type === 'annualReport' && document.availability === 'available') : undefined
      const year = report?.period?.through?.match(/\d{4}$/)?.[0]
      const label = annual ? es ? 'Informe anual' : 'Annual report' : es ? 'Registros de EPA' : 'EPA records'
      const checkedOn = check?.checkedOn ?? source.checkedOn
      const checked = checkedOn ? `${es ? 'Consultado el' : 'Checked'} ${formatIsoDate(checkedOn, language)}` : undefined
      // Each row says how its records were read and how fresh they are; general method notes are in Settings → Sources.
      const parts = check?.busy ? [es ? 'Buscando actualizaciones…' : 'Checking for updates…']
        // A failed refresh keeps describing the saved records still shown: method, or the EPA data date.
        : check?.failed ? [es ? 'Error al actualizar' : 'Update failed', annual
          ? report ? report.method === 'notReviewed' ? es ? 'Sin leer' : 'Not read' : methodLabel(report.method, language) : undefined
          : structured && extract ? `${es ? 'Datos con fecha del' : 'Data dated'} ${readablePrinted(extract, language)}` : undefined]
        : annual
          ? report ? [report.method === 'notReviewed' ? es ? 'Sin leer' : 'Not read' : methodLabel(report.method, language), checked]
            : evidence.documents.some(document => document.type === 'annualReport') ? [es ? 'No recuperado' : 'Not retrieved', checked] : [stateLabel(source.state), checked]
          : recordsStatus === 'none' ? [stateLabel('none'), structured ? es ? 'Se conservaron los registros anteriores' : 'Earlier records kept' : undefined, checked]
            : source.state === 'available' ? [extract ? `${es ? 'Datos con fecha del' : 'Data dated'} ${readablePrinted(extract, language)}` : undefined, checked]
            : [stateLabel(source.state)]
      const state = parts.filter(Boolean).join(' · ')
      return <li key={source.id} className="provider-card-heading evidence-source-row">
        <div className="provider-card-heading evidence-source-heading">
          <h4>{label}</h4>
          {year ? <span className="report-year">{year}</span> : null}
          {state ? <span className="evidence-source-state" aria-live="polite">{state}</span> : null}
          <span className="profile-leader" aria-hidden="true" />
          {(report?.url ?? source.url) ? <span className="provider-card-source"><SourceLink url={(report?.url ?? source.url)!}>{annual && report ? es ? 'Abrir PDF' : 'Open PDF' : annual ? es ? 'Buscar informe' : 'Find report' : es ? 'Ver registros' : 'View records'}</SourceLink></span> : null}
        </div>
      </li>
    })}
  </ul>
}
