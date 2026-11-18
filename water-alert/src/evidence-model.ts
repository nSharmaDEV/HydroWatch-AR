import type { Language } from './domain'

/**
 * One shared evidence model for Provider information, answer review and email
 * generation.
 *
 * Everything here is **dated document evidence**: what an official record
 * printed, when it was published and when WAVE retrieved it. Nothing here is a
 * water test, a current safety assessment, a compliance determination, or proof
 * that a documented issue caused a household concern. Absence of a record is
 * never an all-clear, and a record WAVE could not retrieve is a record
 * limitation, not a finding.
 */

export type Text = Record<Language, string>
export const text = (en: string, es: string): Text => ({ en, es })

/** First release: official public documents only. No resident uploads, no crawling. */
export type DocumentType =
  | 'annualReport'       // ADH / utility annual water-quality report (CCR)
  | 'inspectionReport'   // Public inspection / sanitary-survey record
  | 'violationRecord'    // Violation notice / recorded violation
  | 'enforcementOrder'   // Enforcement order or penalty
  | 'correctiveAction'   // Corrective-action or closure record
  | 'publicNotice'       // Public notice record

/**
 * How the supporting text was obtained. Human review stays authoritative within
 * its verified scope; automated methods are disclosed wherever they are used,
 * without an alarming badge.
 */
export type ReviewMethod =
  | 'humanReviewed'      // A person read the document and transcribed it
  | 'autoRead'           // Fixed rules read the document's own tables, no AI
  | 'aiSummarized'       // AI summary that passed quote/page/date checks
  | 'structuredRecord'   // Field-for-field copy of a published structured record
  | 'notReviewed'        // Located but not read

export type Availability =
  | 'available'          // Retrieved and readable
  | 'incomplete'         // Retrieved, but part of it could not be read
  | 'ambiguous'          // Could not be tied to this exact system
  | 'unavailable'        // Not retrieved; see `retrieval`

export interface SystemIdentity {
  /** WAVE's exact supplier key. Never a city or county match. */
  placeId: string
  name: string
  /** ADH's own public water system number, as published. */
  adhPws?: string
  /** Verified federal PWS ID from the reviewed EPA directory snapshot. */
  federalPwsId?: string
}

export interface EvidenceDocument {
  /** Stable identity: same document, same id across sessions. */
  id: string
  system: SystemIdentity
  type: DocumentType
  title: Text
  /** Official URL. Absent when the record is not publicly linkable on its own. */
  url?: string
  /** Publication or record date, exactly as the source states it. */
  publishedOn?: string
  /** Reporting period the document covers, as printed. */
  period?: { from?: string; through?: string }
  /** When WAVE retrieved it (ISO day). */
  retrievedOn: string
  /** Version identity: the publisher's extract/version marker or review date. */
  version?: string
  method: ReviewMethod
  availability: Availability
  /** Page count, where WAVE actually counted the pages. */
  pages?: number
  /** Why a record is unavailable, incomplete, ambiguous or internally inconsistent. */
  note?: Text
  /** Accurate source/retrieval guidance when the record is not publicly obtainable. */
  retrieval?: Text
  /** A document whose printed year conflicts with the requested year. */
  yearConflict?: Text
}

export interface EvidenceCitation {
  documentId: string
  url?: string
  /** Page reference inside a paginated document. */
  page?: number
  /** The publisher's own record reference (for example an EPA violation ID). */
  recordRef?: string
  /** Exact source wording. Present only when the quotation was actually verified. */
  quote?: Text
  quoteVerified: boolean
  method: ReviewMethod
}

/** Something a record states was done. Never inferred from silence. */
export interface DocumentedAction {
  on?: string
  label: Text
  citation: EvidenceCitation
  /** True when WAVE summarized or categorized the wording rather than copying it. */
  interpreted: boolean
  /**
   * The record links this action to the issue, but its date falls before the
   * reported period began, so WAVE does not present it as a response.
   */
  predatesPeriod?: boolean
}

export type IssueCategory =
  | 'monitoring' | 'reporting' | 'monitoringOrReporting' | 'treatment' | 'licensing'
  | 'publicNotice' | 'consumerConfidence' | 'significantDeficiency' | 'waterQuality'
  | 'upstreamSupplier' | 'documentConflict' | 'other'

export type ConflictKind = 'date' | 'status' | 'wording' | 'unmatched' | 'recordLimitation'
export interface EvidenceConflict { kind: ConflictKind; text: Text }

export interface EvidenceIssue {
  /** Stable ID. Survives a re-check as long as the underlying records do. */
  id: string
  system: SystemIdentity
  category: IssueCategory
  /**
   * Normalized requirement key used for conservative grouping. Two records only
   * join on this key when they also agree on system and reported period.
   */
  requirementKey: string
  /** The requirement or category, in the sources' own terms. */
  requirement: Text
  title: Text
  /** The reported incident period, as printed. */
  period: { from?: string; through?: string; currentAsPrinted?: boolean }
  /** Supporting-document references. Every displayed detail traces to one of these. */
  citations: EvidenceCitation[]
  actions: DocumentedAction[]
  /**
   * Explicit resolution evidence only. Silence, disappearance, resumed
   * monitoring or planned work never establishes resolution.
   */
  resolution?: { on?: string; label: Text; citation: EvidenceCitation }
  /** The record's own latest status wording, printed as recorded. */
  printedStatus?: { label: Text; on?: string; citation: EvidenceCitation }
  conflicts: EvidenceConflict[]
  /** An upstream supplier's finding, kept separate from the resident's provider. */
  upstream: boolean
  /** Records that may describe the same issue but were not merged. */
  uncertain: { issueId: string; text: Text }[]
  methods: ReviewMethod[]
}

export const issueDocumentIds = (issue: EvidenceIssue) => [...new Set(issue.citations.map(c => c.documentId))]
export const issueDocumentCount = (issue: EvidenceIssue) => issueDocumentIds(issue).length

export function documentTypeLabel(type: DocumentType, language: Language) {
  const es = language === 'es'
  switch (type) {
    case 'annualReport': return es ? 'Informe anual de calidad del agua' : 'Annual water-quality report'
    case 'inspectionReport': return es ? 'Inspección / evaluación sanitaria' : 'Inspection / sanitary survey'
    case 'violationRecord': return es ? 'Registro de infracción' : 'Violation record'
    case 'enforcementOrder': return es ? 'Acción de cumplimiento' : 'Enforcement action'
    case 'correctiveAction': return es ? 'Acción correctiva o cierre' : 'Corrective action or closure'
    case 'publicNotice': return es ? 'Aviso público' : 'Public notice'
  }
}

export function methodLabel(method: ReviewMethod, language: Language) {
  const es = language === 'es'
  switch (method) {
    case 'humanReviewed': return es ? 'Revisado por una persona' : 'Reviewed by a person'
    case 'autoRead': return es ? 'Leído de las tablas del documento' : 'Read from the document’s tables'
    case 'aiSummarized': return es ? 'Resumen por IA, verificado contra el texto' : 'AI summary checked against the text'
    case 'structuredRecord': return es ? 'Campos copiados del registro publicado' : 'Fields copied from the published record'
    case 'notReviewed': return es ? 'Localizado, no leído' : 'Located, not read'
  }
}

/** Automated methods are disclosed; a human review of the same document outranks them. */
export const isAutomated = (method: ReviewMethod) => method === 'autoRead' || method === 'aiSummarized' || method === 'structuredRecord'

export function issueCategoryLabel(category: IssueCategory, language: Language) {
  const es = language === 'es'
  switch (category) {
    case 'monitoring': return es ? 'Monitoreo' : 'Monitoring'
    case 'reporting': return es ? 'Presentación de informes' : 'Reporting'
    case 'monitoringOrReporting': return es ? 'Monitoreo o informes' : 'Monitoring or reporting'
    case 'treatment': return es ? 'Técnica de tratamiento' : 'Treatment technique'
    case 'licensing': return es ? 'Licencia' : 'Licensing'
    case 'publicNotice': return es ? 'Aviso público' : 'Public notice'
    case 'consumerConfidence': return es ? 'Informe de confianza del consumidor' : 'Consumer confidence report'
    case 'significantDeficiency': return es ? 'Deficiencia significativa' : 'Significant deficiency'
    case 'waterQuality': return es ? 'Calidad del agua' : 'Water quality'
    case 'upstreamSupplier': return es ? 'Proveedor de origen' : 'Upstream supplier'
    case 'documentConflict': return es ? 'Contradicción del documento' : 'Document conflict'
    case 'other': return es ? 'Otro requisito' : 'Other requirement'
  }
}

/** `MM/DD/YYYY` or `YYYY-MM-DD` → `YYYY-MM`; anything else stays unmatched. */
export function periodMonth(printed: string | undefined): string | undefined {
  if (!printed) return undefined
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(printed.trim())
  if (us) return `${us[3]}-${us[1]}`
  const iso = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(printed.trim())
  return iso ? `${iso[1]}-${iso[2]}` : undefined
}

/** `MM/DD/YYYY` → a readable short date; any other printed form is kept exactly. */
export function readablePrinted(printed: string, language: Language) {
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(printed.trim())
  const iso = us ? `${us[3]}-${us[1]}-${us[2]}` : /^\d{4}-\d{2}-\d{2}$/.test(printed.trim()) ? printed.trim() : undefined
  if (!iso) return printed
  const value = new Date(`${iso}T12:00:00`)
  return Number.isNaN(value.getTime()) ? printed : value.toLocaleDateString(language === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Jul 1, 2025 – Jul 31, 2025", "since Oct 1, 2025", or an explicit not-stated label. */
export function periodLabel(period: EvidenceIssue['period'], language: Language) {
  const es = language === 'es'
  const from = period.from ? readablePrinted(period.from, language) : ''
  const through = period.through ? readablePrinted(period.through, language) : ''
  if (from && through) return `${from} – ${through}`
  if (from && period.currentAsPrinted) return es ? `desde ${from}; “Current” al imprimirse` : `since ${from}; “Current” as printed`
  if (from) return es ? `desde ${from}` : `since ${from}`
  if (through) return es ? `hasta ${through}` : `through ${through}`
  return es ? 'Período no indicado en el registro' : 'Period not stated in the record'
}

/**
 * The year a finding belongs to, for grouping and sorting. Uses the reported
 * period, never the retrieval date, so a fresh check never re-dates an old
 * finding.
 */
export function issueYear(issue: EvidenceIssue): number | undefined {
  const month = periodMonth(issue.period.from) ?? periodMonth(issue.period.through)
  return month ? Number(month.slice(0, 4)) : undefined
}

/** Newest reported period first; undated findings keep their source order at the end. */
export function byReportedPeriod(a: EvidenceIssue, b: EvidenceIssue) {
  const left = periodMonth(a.period.from) ?? periodMonth(a.period.through) ?? ''
  const right = periodMonth(b.period.from) ?? periodMonth(b.period.through) ?? ''
  if (left === right) return 0
  if (!left) return 1
  if (!right) return -1
  return right.localeCompare(left)
}
