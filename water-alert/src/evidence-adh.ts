import type { AnnualReport, AnnualReportIssue } from './annual-reports'
import { text, type DocumentedAction, type EvidenceCitation, type EvidenceDocument, type EvidenceIssue, type IssueCategory, type ReviewMethod, type SystemIdentity } from './evidence-model'

/**
 * ADH / utility annual water-quality reports → shared evidence model.
 *
 * The transcriptions and review dates already in `annual-reports.ts` are kept
 * exactly as they are. This file only re-expresses them in the shared model so
 * one finding can carry several supporting records. A hand-reviewed report
 * stays authoritative within the pages that were actually reviewed, and an
 * automated read keeps its disclosure.
 */

export function reportMethod(report: AnnualReport): ReviewMethod {
  switch (report.state) {
    case 'reviewed': return 'humanReviewed'
    case 'autoRead': return 'autoRead'
    case 'aiSummarized': return 'aiSummarized'
    default: return 'notReviewed'
  }
}

export function reportCheckedOn(report: AnnualReport): string | undefined {
  switch (report.state) {
    case 'reviewed': return report.reviewedOn
    case 'autoRead': return report.readOn
    case 'aiSummarized': return report.summarizedOn
    default: return undefined
  }
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'unknown'

/** Maps a printed annual-report row to the shared requirement key. */
export function reportRequirement(issue: AnnualReportIssue): { key: string; category: IssueCategory; upstream: boolean } {
  const title = (issue.title?.en ?? '').toLowerCase()
  switch (issue.category) {
    case 'monitoring':
      // "monitor and/or report" names two requirements at once. It is kept on
      // its own key so it can never be silently filed as one or the other.
      if (/monitor and\/or report/.test(title)) return { key: 'rtcr.monitorOrReport', category: 'monitoringOrReporting', upstream: false }
      if (/bacteriological samples/.test(title)) return { key: 'rtcr.monitoring', category: 'monitoring', upstream: false }
      return { key: `adh-monitoring.${slug(title)}`, category: 'monitoring', upstream: false }
    case 'licensing': return { key: 'licensing.state', category: 'licensing', upstream: false }
    case 'publicNotice': return { key: 'publicNotice', category: 'publicNotice', upstream: false }
    case 'significantDeficiency': return { key: 'survey.deficiency', category: 'significantDeficiency', upstream: false }
    case 'waterQuality': return { key: `adh-quality.${slug(title)}`, category: 'waterQuality', upstream: false }
    case 'upstreamSupplier': return { key: `upstream.${slug(title)}`, category: 'upstreamSupplier', upstream: true }
    case 'documentConflict': return { key: `conflict.${slug(title)}`, category: 'documentConflict', upstream: false }
  }
}

export const reportDocumentId = (placeId: string, year: number) => `adh:report:${placeId}:${year}`

export function reportDocument(report: AnnualReport, system: SystemIdentity, retrievedOn: string): EvidenceDocument {
  const method = reportMethod(report)
  const checkedOn = reportCheckedOn(report)
  const url = report.state === 'unavailable' ? report.sourceUrl : report.url
  const noted = report.note
  // Only an explicit title/printed-year statement establishes a mismatch.
  // Review/retrieval dates in a note are not the document's printed year.
  const printedYear = noted?.en.match(/(?:titled|printed(?:\s+year)?(?:\s+is)?|title(?:\s+says)?)\s+(20\d{2})\b/i)?.[1]
  const otherYear = printedYear && Number(printedYear) !== report.year ? Number(printedYear) : undefined
  return {
    id: reportDocumentId(system.placeId, report.year),
    system, type: 'annualReport',
    title: text(`${report.year} annual water-quality report`, `Informe anual de calidad del agua ${report.year}`),
    ...(url ? { url } : {}),
    period: { from: `01/01/${report.year}`, through: `12/31/${report.year}` },
    retrievedOn: checkedOn ?? retrievedOn,
    // ADH serves these by requested year, so the requested year is the version identity.
    version: `ADH ${report.year} report request`,
    method,
    availability: report.state === 'unavailable' ? 'unavailable' : 'available',
    ...(noted ? { note: noted } : {}),
    ...(report.state === 'unavailable' ? {
      retrieval: text(
        'Ask the Arkansas Department of Health Engineering Section, or the utility directly, for the annual water-quality report for this year.',
        'Solicite el informe anual de calidad del agua de este año a la Sección de Ingeniería del Departamento de Salud de Arkansas o directamente al proveedor.',
      ),
    } : {}),
    ...(otherYear && noted ? {
      yearConflict: text(
        `The document’s printed year and the requested ${report.year} report do not agree (${otherYear} appears in the record). Findings have not been assigned from it.`,
        `El año impreso del documento y el informe solicitado de ${report.year} no coinciden (aparece ${otherYear} en el registro). No se le han asignado hallazgos.`,
      ),
    } : {}),
  }
}

export function reportIssues(report: AnnualReport, system: SystemIdentity): EvidenceIssue[] {
  if (report.state !== 'reviewed' && report.state !== 'autoRead' && report.state !== 'aiSummarized') return []
  const method = reportMethod(report)
  const documentId = reportDocumentId(system.placeId, report.year)
  return report.issues.flatMap((issue, index): EvidenceIssue[] => {
    // A row with no transcribed wording carries no finding to show.
    if (!issue.title?.en?.trim() && !issue.heading?.en?.trim()) return []
    const { key, category, upstream } = reportRequirement(issue)
    const citation: EvidenceCitation = {
      documentId, url: `${report.url.replace(/#.*$/, '')}#page=${issue.page}`, page: issue.page, quoteVerified: method === 'humanReviewed',
      // Only a hand-checked transcription is offered as the agency's exact wording.
      ...(method === 'humanReviewed' && issue.title ? { quote: issue.title } : {}),
      method,
    }
    const action = issue.action
    const noAction = !action?.en?.trim() || action.en === 'None listed' || action.en === 'Not provided in the report'
    const actions: DocumentedAction[] = noAction ? [] : [{ label: action, citation, interpreted: false }]
    return [{
      id: `adh:${system.placeId}:${report.year}:${index}`,
      system, category, requirementKey: key,
      requirement: issue.heading ?? issue.title,
      title: issue.title ?? issue.heading,
      period: {
        ...(issue.reportedFrom ? { from: issue.reportedFrom } : {}),
        ...(issue.reportedThrough ? { through: issue.reportedThrough } : {}),
        ...(issue.currentAsPrinted ? { currentAsPrinted: true } : {}),
      },
      citations: [citation],
      actions,
      // An annual report's "resumed monitoring" line is a documented action,
      // never resolution evidence; the report does not say the issue is closed.
      ...(noAction ? {
        printedStatus: {
          label: text('No corrective action listed in the report', 'El informe no indica ninguna acción correctiva'),
          citation,
        },
      } : {}),
      conflicts: issue.currentAsPrinted ? [{ kind: 'status', text: text(
        `The ${report.year} report prints this finding as “Current”. That is its status when the report was printed, not today’s status.`,
        `El informe de ${report.year} imprime este hallazgo como “Current”. Es su estado cuando se imprimió el informe, no el estado de hoy.`,
      ) }] : [],
      upstream, uncertain: [], methods: [method],
    }]
  })
}

/** The legacy "year:index" key for a finding, so saved drafts keep working. */
export const legacyReportKey = (issueId: string) => {
  const match = /^adh:.+:(\d{4}):(\d+)$/.exec(issueId)
  return match ? `${match[1]}:${match[2]}` : undefined
}
