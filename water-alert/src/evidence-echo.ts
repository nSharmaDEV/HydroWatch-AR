import { ECHO_SOURCE_LABEL, echoReportUrl, flaggedAreas, surveyAreaLabel, type EchoRecordSet, type EchoViolationRecord } from './echo-records'
import { periodMonth, text, type DocumentedAction, type EvidenceCitation, type EvidenceConflict, type EvidenceDocument, type EvidenceIssue, type IssueCategory, type SystemIdentity } from './evidence-model'

/**
 * EPA ECHO records → shared evidence model.
 *
 * Every field is the publisher's own wording. WAVE adds a normalized
 * requirement key for grouping and a category label; both are marked as
 * WAVE's own interpretation wherever they are shown. Nothing here decides that
 * an issue is resolved: only the record's own resolving action or explicit
 * resolved status becomes resolution evidence, and the printed status is always
 * carried alongside it.
 */

/** A reviewed map from the publisher's rule and category wording to a grouping key. */
function requirement(record: EchoViolationRecord): { key: string; category: IssueCategory } {
  const rule = (record.rule ?? '').toLowerCase()
  const contaminant = (record.contaminant ?? '').toLowerCase()
  const category = (record.category ?? '').toLowerCase()
  const code = (record.categoryCode ?? '').toUpperCase()
  const monitoring = code === 'MON' || /monitoring violation/.test(category)
  const reporting = code === 'RPT' || /reporting violation/.test(category)
  const both = /monitoring and reporting/.test(category) || code === 'MR'
  if (/revised total coliform/.test(rule)) {
    if (both) return { key: 'rtcr.monitorOrReport', category: 'monitoringOrReporting' }
    if (monitoring) return { key: 'rtcr.monitoring', category: 'monitoring' }
    if (reporting) return { key: 'rtcr.reporting', category: 'reporting' }
  }
  if (/e\.? ?coli/.test(contaminant) || /e\.? ?coli/.test(rule)) {
    if (both) return { key: 'ecoli.monitorOrReport', category: 'monitoringOrReporting' }
    if (monitoring) return { key: 'ecoli.monitoring', category: 'monitoring' }
    if (reporting) return { key: 'ecoli.reporting', category: 'reporting' }
  }
  if (/public notice/.test(contaminant) || /public notice/.test(rule)) return { key: 'publicNotice', category: 'publicNotice' }
  if (/consumer confidence/.test(contaminant) || /consumer confidence/.test(rule)) return { key: 'ccr.report', category: 'consumerConfidence' }
  if (/disinfectants and disinfection byproducts/.test(rule)) {
    const stage = /stage 2/.test(rule) ? 'dbp2' : 'dbp1'
    if (/treatment technique/.test(category) || code === 'TT') return { key: `${stage}.treatment`, category: 'treatment' }
    if (monitoring) return { key: `${stage}.monitoring`, category: 'monitoring' }
    if (reporting) return { key: `${stage}.reporting`, category: 'reporting' }
  }
  // Unknown wording keeps its own key, so it can never join another requirement.
  const slug = (value: string) => value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown'
  const maxCategory: IssueCategory = /maximum contaminant level|mcl/.test(category) ? 'waterQuality' : monitoring ? 'monitoring' : reporting ? 'reporting' : both ? 'monitoringOrReporting' : /treatment technique/.test(category) ? 'treatment' : 'other'
  return { key: `epa-${slug(rule || contaminant || 'rule')}.${slug(category || code || 'category')}`, category: maxCategory }
}

/** The publisher's own wording, with the distinguishing rule first. */
function violationTitle(record: EchoViolationRecord) {
  const subject = record.rule && record.rule !== record.contaminant ? [record.rule, record.contaminant] : [record.contaminant ?? record.rule]
  const parts = [...subject, record.category].filter(Boolean)
  const printed = [...new Set(parts)].join(' — ') || 'Violation recorded'
  return text(printed, printed)
}

/** Resolution evidence must be explicit and dated on or after the period began. */
function resolutionFor(record: EchoViolationRecord, citation: EvidenceCitation) {
  const start = periodMonth(record.from)
  const resolving = record.actions.find(action => (action.type ?? '').toLowerCase() === 'resolving' && action.on && (!start || (periodMonth(action.on) ?? '') >= start))
  if (resolving) {
    return { ...(resolving.on ? { on: resolving.on } : {}), label: text(resolving.action ?? 'Resolving action recorded', resolving.action ?? 'Acción de resolución registrada'), citation }
  }
  if ((record.status ?? '').toLowerCase() === 'resolved' && record.resolvedOn) {
    const label = `EPA record status “Resolved”, dated ${record.resolvedOn}`
    return { on: record.resolvedOn, label: text(label, `Estado del registro de EPA “Resolved”, con fecha ${record.resolvedOn}`), citation }
  }
  return undefined
}

function statusConflicts(record: EchoViolationRecord): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = []
  const status = (record.status ?? '').toLowerCase()
  if (record.resolvedOn && status && status !== 'resolved') {
    conflicts.push({ kind: 'status', text: text(
      `The EPA record carries a date of ${record.resolvedOn} and a status of “${record.status}”. WAVE prints both and does not read this as a correction.`,
      `El registro de EPA tiene fecha ${record.resolvedOn} y el estado “${record.status}”. WAVE imprime ambos y no lo interpreta como una corrección.`,
    ) })
  }
  if (!record.resolvedOn && status === 'addressed') {
    // Normal record wording, explained in the detail. Not a disagreement
    // between sources, so it never flags the row as needing clarification.
    conflicts.push({ kind: 'recordLimitation', text: text(
      'The EPA record status is “Addressed”. The record does not state that the requirement was met, and WAVE does not read it as resolved.',
      'El estado del registro de EPA es “Addressed”. El registro no indica que se haya cumplido el requisito, y WAVE no lo interpreta como resuelto.',
    ) })
  }
  return conflicts
}

export function echoDocuments(records: EchoRecordSet, system: SystemIdentity): EvidenceDocument[] {
  const base = { system, retrievedOn: records.retrievedOn, method: 'structuredRecord' as const, availability: 'available' as const, ...(records.extractOn ? { version: `${ECHO_SOURCE_LABEL} ${records.extractOn}` } : {}) }
  const url = echoReportUrl(records.pwsid)
  const documents: EvidenceDocument[] = []
  for (const violation of records.violations) {
    documents.push({
      ...base, id: `echo:violation:${records.pwsid}:${violation.id}`, type: 'violationRecord', url,
      title: text(`Violation record ${violation.id}`, `Registro de infracción ${violation.id}`),
      ...(violation.from || violation.through ? { period: { ...(violation.from ? { from: violation.from } : {}), ...(violation.through ? { through: violation.through } : {}) } } : {}),
    })
  }
  for (const survey of records.surveys) {
    documents.push({
      ...base, id: `echo:survey:${survey.id}`, type: 'inspectionReport', url, period: { from: survey.on },
      title: text(survey.type ?? 'Site visit', survey.type ?? 'Visita al sistema'),
      note: text(
        'ECHO publishes the visit date and the areas it flagged. The inspector’s full written report is not published here; request it from the agency that performed the visit.',
        'ECHO publica la fecha de la visita y las áreas señaladas. El informe escrito completo del inspector no se publica aquí; solicítelo a la agencia que realizó la visita.',
      ),
      retrieval: text(
        'Ask the Arkansas Department of Health Engineering Section for the sanitary survey or inspection report for this date.',
        'Solicite a la Sección de Ingeniería del Departamento de Salud de Arkansas el informe de evaluación sanitaria o inspección de esa fecha.',
      ),
    })
  }
  for (const notice of records.notices) {
    documents.push({
      ...base, id: `echo:notice:${records.pwsid}:${notice.id}`, type: 'publicNotice', url,
      ...(notice.on ? { period: { from: notice.on } } : {}),
      title: text(notice.action ?? 'Public notice record', notice.action ?? 'Registro de aviso público'),
      note: text(
        'The federal record logs that a notice was received. The notice text itself is not published here.',
        'El registro federal anota que se recibió un aviso. El texto del aviso no se publica aquí.',
      ),
    })
  }
  for (const action of records.formalActions) {
    documents.push({
      ...base, id: `echo:formal:${action.id}`, type: 'enforcementOrder', url,
      ...(action.on ? { period: { from: action.on } } : {}),
      title: text(action.action ?? 'Formal enforcement action', action.action ?? 'Acción formal de cumplimiento'),
      note: text(
        'The federal record logs the action and its date. The order document itself is not published here.',
        'El registro federal anota la acción y su fecha. El documento de la orden no se publica aquí.',
      ),
      retrieval: text(
        'Ask the Arkansas Department of Health for the enforcement correspondence for this date.',
        'Solicite al Departamento de Salud de Arkansas la correspondencia de cumplimiento de esa fecha.',
      ),
    })
  }
  return documents
}

export function echoIssues(records: EchoRecordSet, system: SystemIdentity): EvidenceIssue[] {
  const url = echoReportUrl(records.pwsid)
  const issues: EvidenceIssue[] = []
  for (const record of records.violations) {
    const documentId = `echo:violation:${records.pwsid}:${record.id}`
    const citation: EvidenceCitation = { documentId, url, recordRef: record.id, quoteVerified: false, method: 'structuredRecord' }
    const { key, category } = requirement(record)
    const start = periodMonth(record.from)
    const actions: DocumentedAction[] = record.actions.flatMap((action): DocumentedAction[] => {
      if (!action.action) return []
      const month = periodMonth(action.on)
      const predates = !!start && !!month && month < start
      return [{
        ...(action.on ? { on: action.on } : {}),
        label: text(`${action.action}${action.type ? ` (${action.type})` : ''}`, `${action.action}${action.type ? ` (${action.type})` : ''}`),
        citation: { ...citation, ...(action.id ? { recordRef: action.id } : {}) },
        interpreted: false,
        ...(predates ? { predatesPeriod: true } : {}),
      }]
    })
    const conflicts = statusConflicts(record)
    if (actions.some(action => action.predatesPeriod)) {
      conflicts.push({ kind: 'recordLimitation', text: text(
        'The EPA record links enforcement actions dated before this reported period began. WAVE lists them but does not present them as a response to this issue.',
        'El registro de EPA vincula acciones de cumplimiento con fecha anterior al inicio del período indicado. WAVE las enumera pero no las presenta como respuesta a este asunto.',
      ) })
    }
    issues.push({
      id: `echo:${records.pwsid}:${record.id}`,
      system, category, requirementKey: key,
      requirement: text(record.rule ?? record.contaminant ?? 'Requirement not stated', record.rule ?? record.contaminant ?? 'Requisito no indicado'),
      title: violationTitle(record),
      period: { ...(record.from ? { from: record.from } : {}), ...(record.through ? { through: record.through } : {}) },
      citations: [citation], actions,
      ...(resolutionFor(record, citation) ? { resolution: resolutionFor(record, citation) } : {}),
      ...(record.status ? { printedStatus: { label: text(record.status, record.status), ...(record.resolvedOn ? { on: record.resolvedOn } : {}), citation } } : {}),
      conflicts, upstream: false, uncertain: [], methods: ['structuredRecord'],
    })
  }
  for (const survey of records.surveys) {
    const flagged = flaggedAreas(survey)
    if (!flagged.length) continue
    const documentId = `echo:survey:${survey.id}`
    const citation: EvidenceCitation = { documentId, url, recordRef: survey.id, quoteVerified: false, method: 'structuredRecord' }
    for (const area of flagged) {
      const label = surveyAreaLabel(area.key, 'en')
      issues.push({
        id: `echo:${survey.id}:${area.key}`,
        system, category: 'significantDeficiency', requirementKey: `survey.${area.key.toLowerCase()}`,
        requirement: text(`Sanitary survey — ${label}`, `Evaluación sanitaria — ${surveyAreaLabel(area.key, 'es')}`),
        title: text(
          `${survey.type ?? 'Site visit'} flagged ${label}`,
          `${survey.type ?? 'Visita al sistema'}: se señaló ${surveyAreaLabel(area.key, 'es')}`,
        ),
        period: { from: survey.on },
        citations: [{ ...citation, ...(area.detail ? { quote: text(area.detail, area.detail), quoteVerified: true } : {}) }],
        actions: [], conflicts: [], upstream: false, uncertain: [], methods: ['structuredRecord'],
      })
    }
  }
  return issues
}
