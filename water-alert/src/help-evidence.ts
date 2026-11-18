import type { Language, Place } from './domain'
import { savedEchoRecords } from './echo-check'
import { legacyReportKey } from './evidence-adh'
import { issueDocumentCount, periodLabel, type EvidenceIssue } from './evidence-model'
import { helpReports } from './help-report-facts'
import type { HelpFact, HelpFactRecord, HelpSource } from './help-requests'
import { providerEvidence, type ProviderEvidence } from './provider-evidence'

/**
 * The bridge from the shared evidence model to the Help flow.
 *
 * Provider information, answer review and the generated email all read the
 * same grouped issues, so a resident never sees one count on the card and a
 * different set of findings in their letter. Saved drafts keep their own
 * evidence snapshot: a later record check never rewrites a message a resident
 * has already prepared.
 */

/** The same evidence the provider panel shows, for one supplier on this device. */
export function helpEvidence(place: Place, sample: boolean): ProviderEvidence {
  const echo = savedEchoRecords(place.id, sample)
  return providerEvidence({ place, sample, reports: helpReports(place, sample), ...(echo ? { echo } : {}) })
}

/**
 * A finding's draft key. An issue led by an annual-report row keeps the
 * long-standing `year:index` key, so saved drafts, saved sources and "Ask
 * about this" keep working exactly as before.
 */
export const factIdForIssue = (issue: EvidenceIssue) => legacyReportKey(issue.id) ?? issue.id

const hasAnnualReport = (issue: EvidenceIssue) => issue.citations.some(citation => citation.documentId.startsWith('adh:report:'))

function methodFor(issue: EvidenceIssue): HelpFactRecord['sourceMethod'] {
  if (issue.methods.includes('humanReviewed')) return 'reviewed'
  if (issue.methods.includes('aiSummarized')) return 'aiSummarized'
  if (issue.methods.includes('autoRead')) return 'autoRead'
  if (issue.methods.includes('structuredRecord')) return 'structuredRecord'
  return undefined
}

/**
 * The record's own latest documented action or status, with its date. Never a
 * conclusion WAVE reached: an issue with no documented outcome says so.
 */
export function latestStatusText(issue: EvidenceIssue, language: Language) {
  const es = language === 'es'
  if (issue.resolution) {
    const on = issue.resolution.on
    return es
      ? `Resolución documentada: “${issue.resolution.label.es}”${on ? ` (${on})` : ''}`
      : `Documented resolution: “${issue.resolution.label.en}”${on ? ` (${on})` : ''}`
  }
  if (issue.printedStatus) {
    const on = issue.printedStatus.on
    return es
      ? `Estado registrado: “${issue.printedStatus.label.es}”${on ? ` (${on})` : ''}`
      : `Recorded status: “${issue.printedStatus.label.en}”${on ? ` (${on})` : ''}`
  }
  const action = issue.actions.find(entry => !entry.predatesPeriod)
  if (action) {
    return es
      ? `Acción indicada: “${action.label.es}”${action.on ? ` (${action.on})` : ''}`
      : `Reported action: “${action.label.en}”${action.on ? ` (${action.on})` : ''}`
  }
  return es ? 'Sin resultado documentado en estos registros' : 'No documented outcome in these records'
}

/** The annual-report sentence, kept word for word as WAVE has always written it. */
function annualProse(issue: EvidenceIssue, language: Language) {
  const es = language === 'es'
  const citation = issue.citations.find(entry => entry.documentId.startsWith('adh:report:'))
  if (!citation) return ''
  const year = /:(\d{4})$/.exec(citation.documentId)?.[1] ?? ''
  const action = issue.actions.find(entry => entry.citation.documentId === citation.documentId)
  const verified = citation.quoteVerified
  return [
    verified
      ? (es ? `El informe de ${year} (página ${citation.page}) registra: “${issue.title.es}”.` : `The ${year} report (page ${citation.page}) records: “${issue.title.en}”.`)
      : (es ? `La lectura automática de WAVE del informe de ${year} (página ${citation.page}) indica: ${issue.title.es}. Una persona no ha verificado esta interpretación.` : `WAVE’s automated reading of the ${year} report (page ${citation.page}) indicates: ${issue.title.en}. A person has not verified this interpretation.`),
    issue.period.from ? (es ? `El período indicado comienza el ${issue.period.from}.` : `The reported period begins ${issue.period.from}.`) : '',
    issue.period.currentAsPrinted
      ? (es ? 'El documento imprime “Current”; no es el estado actual.' : 'The document prints “Current”; this is not current status.')
      : issue.period.through ? (es ? `El período indicado termina el ${issue.period.through}.` : `The reported period ends ${issue.period.through}.`) : '',
    action
      ? verified
        ? (es ? `La acción indicada en ese documento es: “${action.label.es}”.` : `The action reported in that document is: “${action.label.en}”.`)
        : (es ? `La lectura automática indica esta acción: ${action.label.es}.` : `The automated reading indicates this action: ${action.label.en}.`)
      : (es ? 'El documento no enumera una acción correctiva.' : 'The document lists no corrective action.'),
  ].filter(Boolean).join(' ')
}

/** The federal record's own account, added beside the report's, never instead of it. */
function recordProse(issue: EvidenceIssue, language: Language) {
  const es = language === 'es'
  const federal = issue.citations.filter(entry => entry.documentId.startsWith('echo:'))
  if (!federal.length) return ''
  const references = federal.map(entry => entry.recordRef).filter(Boolean)
  const reference = references.length ? references.join(', ') : ''
  const lead = es
    ? `WAVE relaciona el registro federal${reference ? ` ${reference}` : ''} con este requisito: ${issue.requirement.es}; período ${periodLabel(issue.period, 'es')}.`
    : `WAVE associates the federal record${reference ? ` ${reference}` : ''} with this requirement: ${issue.requirement.en}; period ${periodLabel(issue.period, 'en')}.`
  return [lead, `${latestStatusText(issue, language)}.`].join(' ')
}

export function evidenceFactText(issue: EvidenceIssue, language: Language) {
  const es = language === 'es'
  const closing = es ? 'Es información histórica, no una evaluación del estado actual.' : 'This is historical information, not an assessment of current status.'
  const annual = annualProse(issue, language)
  const federal = annual ? '' : recordProse(issue, language)
  const both = annual && issue.citations.some(entry => entry.documentId.startsWith('echo:')) ? recordProse(issue, language) : ''
  return [annual || federal, both, closing].filter(Boolean).join(' ')
}

function factSources(issue: EvidenceIssue, factId: string, language: Language, retrieved: Map<string, string>): HelpSource[] {
  const es = language === 'es'
  const seen = new Set<string>()
  return issue.citations.flatMap(citation => {
    const url = citation.url
    if (!url || seen.has(url)) return []
    seen.add(url)
    const on = retrieved.get(citation.documentId)
    const how = citation.method === 'humanReviewed' ? (es ? 'revisado' : 'reviewed')
      : citation.method === 'structuredRecord' ? (es ? 'registro publicado' : 'published record')
      : (es ? 'leído' : 'read')
    const parts = [
      citation.documentId.startsWith('adh:report:') ? /:(\d{4})$/.exec(citation.documentId)?.[1] : undefined,
      citation.page ? `${es ? 'página' : 'page'} ${citation.page}` : undefined,
      citation.recordRef && !citation.documentId.startsWith('adh:') ? `${es ? 'registro' : 'record'} ${citation.recordRef}` : undefined,
      on ? `${how} ${on}` : how,
    ].filter(Boolean)
    return [{ recordId: factId, url, label: parts.join(' · ').slice(0, 300) }]
  })
}

export function evidenceFactRecord(issue: EvidenceIssue, language: Language): HelpFactRecord {
  const method = methodFor(issue)
  const federal = issue.citations.some(citation => citation.documentId.startsWith('echo:'))
  const action = issue.actions.find(entry => !entry.predatesPeriod)
  return {
    agency: hasAnnualReport(issue) ? 'Annual water-quality report' : 'Official records',
    date: issue.period.from ?? '',
    problem: issue.title[language],
    area: issue.requirement[language],
    status: latestStatusText(issue, language),
    verified: false,
    ...(issue.period.from && /\d{4}$/.test(issue.period.from) ? { year: issue.period.from.slice(-4) } : {}),
    ...(method ? { sourceMethod: method } : {}),
    ...(federal ? { evidence: {
      period: periodLabel(issue.period, language),
      action: action ? `${action.label[language]}${action.on ? ` (${action.on})` : ''}` : '',
      resolution: issue.resolution ? latestStatusText(issue, language) : '',
      conflicts: issue.conflicts.map(conflict => conflict.text[language]).join(' '),
      federal,
    } } : {}),
  }
}

/**
 * One fact per distinct historical issue, matching the provider panel exactly.
 *
 * Findings an annual report documents keep their long-standing keys and stay
 * selected. Federal findings are historical context too, not a claim that they
 * relate to a resident's concern. The draft layer applies storage limits.
 */
export function evidenceFacts(place: Place, sample: boolean, language: Language): HelpFact[] {
  if (sample || place.kind !== 'system') return []
  const { issues, documents } = helpEvidence(place, sample)
  const retrieved = new Map(documents.map(document => [document.id, document.retrievedOn]))
  const fromReports = issues.filter(hasAnnualReport)
  const recordsOnly = issues.filter(issue => !hasAnnualReport(issue))
  return [...fromReports, ...recordsOnly].map((issue): HelpFact => {
    const id = factIdForIssue(issue)
    return {
      id, kind: 'historical', included: true,
      text: evidenceFactText(issue, language),
      sources: factSources(issue, id, language, retrieved),
      record: evidenceFactRecord(issue, language),
    }
  })
}

/** The supporting-record count for a draft fact, for "2 records" in the panel and review. */
export const factRecordCount = (issue: EvidenceIssue) => issueDocumentCount(issue)

/** The opening sentence for "Ask about this finding", quoting what was verified. */
export function evidenceQuestion(place: Place, key: string, language: 'en' | 'es', sample = false): string | undefined {
  if (sample || place.kind !== 'system') return undefined
  const { issues } = helpEvidence(place, sample)
  const issue = issues.find(entry => factIdForIssue(entry) === key || entry.id === key)
  if (!issue) return undefined
  const es = language === 'es'
  const verified = issue.citations.find(citation => citation.method === 'humanReviewed' && citation.documentId.startsWith('adh:report:') && citation.quoteVerified && citation.quote)
  const period = periodLabel(issue.period, language)
  if (verified?.quote) {
    const year = /:(\d{4})$/.exec(verified.documentId)?.[1]
    return es
      ? `Su informe anual del agua${year ? ` de ${year}` : ''}${verified.page ? ` (página ${verified.page})` : ''} indica: “${verified.quote.es}” (${period}).`
      : `Your${year ? ` ${year}` : ''} annual water report${verified.page ? ` (page ${verified.page})` : ''} lists: “${verified.quote.en}” (${period}).`
  }
  // No verified quotation, so nothing is presented as the agency's exact words.
  const reference = issue.citations.find(citation => citation.recordRef)?.recordRef
  return es
    ? `Un registro oficial${reference ? ` (registro ${reference})` : ''} describe lo siguiente para su sistema (${period}): ${issue.title.es}. WAVE lo leyó automáticamente y una persona no lo ha verificado; confírmenme qué dice el registro.`
    : `An official record${reference ? ` (record ${reference})` : ''} describes the following for your system (${period}): ${issue.title.en}. WAVE read this automatically and a person has not checked it; please confirm what the record says.`
}
