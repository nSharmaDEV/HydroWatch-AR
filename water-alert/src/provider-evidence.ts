import { ANNUAL_REPORTS, type AnnualReport } from './annual-reports'
import type { Language, Place } from './domain'
import { ECHO_SOURCE_LABEL, echoReportUrl, type EchoRecordSet } from './echo-records'
import { reportDocument, reportIssues } from './evidence-adh'
import { echoDocuments, echoIssues } from './evidence-echo'
import { groupEvidenceIssues } from './evidence-grouping'
import { text, type EvidenceDocument, type EvidenceIssue, type SystemIdentity, type Text } from './evidence-model'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { directorySystem } from './water-system-directory'

/**
 * One supplier's official-document evidence: the documents WAVE has, the
 * distinct historical issues they describe, and an honest account of what is
 * missing.
 *
 * This is historical evidence review. It never changes live advisory status,
 * never answers whether water is safe now, and never explains what caused a
 * household concern. A supplier with no retrieved records has no findings to
 * show — which is a gap in the records, not a clean result.
 */

export type SourceId = 'adhAnnualReport' | 'epaEcho'
export type SourceState = 'available' | 'notChecked' | 'none' | 'incomplete' | 'unsupported'
export interface EvidenceSourceState {
  id: SourceId
  label: Text
  state: SourceState
  checkedOn?: string
  detail: Text
  url?: string
}

export interface ProviderEvidence {
  system: SystemIdentity
  documents: EvidenceDocument[]
  /** Distinct historical issues in source order; views may sort by period. */
  issues: EvidenceIssue[]
  sources: EvidenceSourceState[]
  /** Record limitations: never presented as compliance findings. */
  limitations: { id: string; text: Text }[]
}

/** ADH prints its own public water system number in the report link. */
export function adhPwsNumber(reports: readonly AnnualReport[]) {
  for (const report of reports) {
    const url = report.state === 'unavailable' ? report.sourceUrl : report.url
    const match = url ? /[?&](?:P|ID)=([0-9A-Za-z]+)/.exec(url) : null
    if (match) return match[1]
  }
  return undefined
}

export function systemIdentity(place: Place, reports: readonly AnnualReport[] = []): SystemIdentity {
  const directory = directorySystem(place.id)
  return {
    placeId: place.id, name: place.name,
    ...(adhPwsNumber(reports) ? { adhPws: adhPwsNumber(reports) } : {}),
    ...(directory?.pwsid ? { federalPwsId: directory.pwsid } : {}),
  }
}

export interface EvidenceInput {
  place: Place
  sample: boolean
  /** Shipped and device-local annual reports, newest first. */
  reports?: readonly AnnualReport[]
  /** The saved EPA record set, when the resident has retrieved one. */
  echo?: EchoRecordSet
  /** The outcome of the last EPA lookup, when a saved set is not available. */
  echoState?: Exclude<SourceState, 'available'>
  echoCheckedOn?: string
  /** ISO day, used only for documents with no publisher date of their own. */
  today?: string
}

const NO_FINDINGS_FROM_ABSENCE = text(
  'Records WAVE has not retrieved cannot show findings. A short list here is not evidence that a system has few problems.',
  'Los registros que WAVE no ha obtenido no pueden mostrar hallazgos. Una lista corta aquí no es prueba de que un sistema tenga pocos problemas.',
)

export function providerEvidence(input: EvidenceInput): ProviderEvidence {
  const { place, sample, echo, today = new Date().toISOString().slice(0, 10) } = input
  const reports = sample || place.kind !== 'system'
    ? []
    : input.reports ?? (Object.hasOwn(ANNUAL_REPORTS, place.id) ? ANNUAL_REPORTS[place.id] : [])
  const system = systemIdentity(place, reports)
  const documents: EvidenceDocument[] = []
  const candidates: EvidenceIssue[] = []
  const limitations: { id: string; text: Text }[] = []

  for (const report of [...reports].sort((a, b) => b.year - a.year)) {
    const document = reportDocument(report, system, today)
    documents.push(document)
    candidates.push(...reportIssues(report, system))
    if (document.yearConflict) limitations.push({ id: `${document.id}:year`, text: document.yearConflict })
  }

  // EPA rows are only ever accepted for the exact federal system WAVE verified
  // for this supplier. A record set for any other id is not shown at all.
  const echoMatches = !!echo && !!system.federalPwsId && echo.pwsid === system.federalPwsId && !sample
  if (echo && !echoMatches && !sample) {
    limitations.push({ id: 'echo:identity', text: text(
      `A saved EPA record set does not match this supplier’s verified federal PWS ID${system.federalPwsId ? ` (${system.federalPwsId})` : ''}, so WAVE is not showing it.`,
      `Un conjunto guardado de registros de EPA no coincide con el ID federal verificado de este proveedor${system.federalPwsId ? ` (${system.federalPwsId})` : ''}, así que WAVE no lo muestra.`,
    ) })
  }
  if (echo && echoMatches) {
    documents.push(...echoDocuments(echo, system))
    candidates.push(...echoIssues(echo, system))
    if (echo.rejected > 0) limitations.push({ id: 'echo:rejected', text: text(
      `${echo.rejected} row${echo.rejected === 1 ? '' : 's'} in the EPA response could not be validated or matched to this exact system and ${echo.rejected === 1 ? 'was' : 'were'} not used.`,
      `${echo.rejected} fila${echo.rejected === 1 ? '' : 's'} de la respuesta de EPA no se pudo${echo.rejected === 1 ? '' : 'ieron'} validar o vincular con este sistema exacto y no se usó${echo.rejected === 1 ? '' : 'aron'}.`,
    ) })
    if (echo.truncated) limitations.push({ id: 'echo:truncated', text: text(
      'The EPA response was longer than WAVE reads in one lookup, so this list is incomplete. Open the EPA report for the full record.',
      'La respuesta de EPA fue más larga de lo que WAVE lee en una consulta, así que esta lista está incompleta. Abra el informe de EPA para el registro completo.',
    ) })
  }

  const issues = groupEvidenceIssues(candidates)

  const annualState: SourceState = !reports.length ? 'notChecked'
    : reports.some(report => report.state !== 'unavailable') ? 'available' : 'incomplete'
  const annualCheckedOn = reports.map(report => report.state === 'reviewed' ? report.reviewedOn : report.state === 'autoRead' ? report.readOn : report.state === 'aiSummarized' ? report.summarizedOn : undefined).find(Boolean)
  const echoState: SourceState = echoMatches ? 'available' : !system.federalPwsId ? 'unsupported' : input.echoState ?? 'notChecked'

  const sources: EvidenceSourceState[] = [
    {
      id: 'adhAnnualReport',
      label: text('ADH and utility annual water-quality reports', 'Informes anuales de calidad del agua de ADH y del proveedor'),
      state: annualState,
      ...(annualCheckedOn ? { checkedOn: annualCheckedOn } : {}),
      url: RECOVERY_RESOURCES.annualReports,
      detail: annualState === 'available'
        ? text('Dated published reports. Findings are what the document printed for that year.', 'Informes publicados con fecha. Los hallazgos son lo que el documento imprimió para ese año.')
        : annualState === 'incomplete'
          ? text('The annual report could not be retrieved. This does not establish that no report exists or that the system has no findings.', 'No se pudo obtener el informe anual. Esto no establece que no exista un informe ni que el sistema no tenga hallazgos.')
          : text('WAVE has not looked for an annual report for this supplier yet.', 'WAVE aún no ha buscado un informe anual para este proveedor.'),
    },
    {
      id: 'epaEcho',
      label: text('EPA ECHO drinking-water records', 'Registros de agua potable de EPA ECHO'),
      state: echoState,
      ...(input.echoCheckedOn ?? echo?.retrievedOn ? { checkedOn: input.echoCheckedOn ?? echo?.retrievedOn } : {}),
      ...(system.federalPwsId ? { url: echoReportUrl(system.federalPwsId) } : {}),
      detail: echoState === 'available'
        ? text(
          `Violation, inspection, enforcement and public-notice records for ${system.federalPwsId}${echo?.extractOn ? `, from the ${ECHO_SOURCE_LABEL} extract dated ${echo.extractOn}` : ''}.`,
          `Registros de infracciones, inspecciones, cumplimiento y avisos públicos de ${system.federalPwsId}${echo?.extractOn ? `, del extracto de ${ECHO_SOURCE_LABEL} con fecha ${echo.extractOn}` : ''}.`,
        )
        : echoState === 'unsupported'
          ? text('WAVE has no verified federal PWS ID for this supplier, so it cannot look these records up for you. Check the supplier name on your bill.', 'WAVE no tiene un ID federal verificado para este proveedor, así que no puede consultar estos registros. Verifique el nombre del proveedor en su factura.')
          : echoState === 'none'
            ? text('The EPA lookup completed and returned no records. That is not an all-clear, and it does not mean the system has no history.', 'La consulta a EPA se completó y no devolvió registros. Eso no es una señal de que todo esté bien ni significa que el sistema no tenga historial.')
            : echoState === 'incomplete'
              ? text('The EPA lookup could not be completed. Nothing was saved, and nothing changed.', 'No se pudo completar la consulta a EPA. No se guardó nada y nada cambió.')
              : text('Not retrieved yet. Check official records to look these up for this system.', 'Aún no obtenidos. Use “Revisar registros oficiales” para consultarlos para este sistema.'),
    },
  ]

  if (sources.some(source => source.state !== 'available')) limitations.push({ id: 'coverage', text: NO_FINDINGS_FROM_ABSENCE })

  return { system, documents, issues, sources, limitations }
}

/** Short, non-reassuring badge text for the collapsed provider header. */
export function evidenceBadge(evidence: ProviderEvidence, language: Language): string | undefined {
  const es = language === 'es'
  const count = evidence.issues.length
  const anyRecords = evidence.documents.some(document => document.availability !== 'unavailable')
  if (!anyRecords) return undefined
  // A zero is only ever shown as "none in the records WAVE has", never as an all-clear.
  if (!count) return evidence.documents.some(document => document.method === 'notReviewed') ? undefined : es ? 'No se encontraron problemas' : 'No problems found'
  return es ? `${count} ${count === 1 ? 'hallazgo histórico' : 'hallazgos históricos'}` : `${count} historical ${count === 1 ? 'finding' : 'findings'}`
}
