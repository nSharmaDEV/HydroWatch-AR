/**
 * Dated EPA ECHO drinking-water records for one exact public water system.
 *
 * These are published federal records (SDWIS, surfaced through ECHO's detailed
 * facility report). They are **historical records**, not a water test, not a
 * current safety or compliance assessment and never an all-clear: an empty
 * response means the query returned no rows, not that a system has no history.
 *
 * Every row carries the publisher's own system id. Rows for any other system
 * are rejected, never renamed onto the resident's provider.
 */

export interface EchoEnforcementRecord {
  id?: string
  /** Printed MM/DD/YYYY, exactly as published. */
  on?: string
  /** "Formal", "Informal" or "Resolving", as published. */
  type?: string
  /** The publisher's own action wording. */
  action?: string
  agency?: string
}

export interface EchoViolationRecord {
  /** The publisher's violation id: the reference number used for grouping. */
  id: string
  rule?: string
  contaminant?: string
  categoryCode?: string
  category?: string
  from?: string
  through?: string
  /** The publisher's own status wording ("Resolved", "Addressed", "Archived"). */
  status?: string
  /** The date the record itself carries as resolved. Printed, not interpreted. */
  resolvedOn?: string
  measure?: string
  stateMcl?: string
  federalMcl?: string
  actions: EchoEnforcementRecord[]
}

export interface EchoSurveyArea { key: string; flagged: boolean; detail?: string }

export interface EchoSurveyRecord {
  id: string
  /** Visit date, printed MM/DD/YYYY. */
  on: string
  type?: string
  agency?: string
  areas: EchoSurveyArea[]
}

export interface EchoNoticeRecord { id: string; on?: string; action?: string; agency?: string; official: boolean }
export interface EchoFormalAction { id: string; on?: string; action?: string; agency?: string; penalty?: string }

export interface EchoRecordSet {
  pwsid: string
  systemName?: string
  /** ISO day WAVE retrieved the records. */
  retrievedOn: string
  /** The publisher's data-extract date: this record set's version identity. */
  extractOn?: string
  violations: EchoViolationRecord[]
  surveys: EchoSurveyRecord[]
  notices: EchoNoticeRecord[]
  formalActions: EchoFormalAction[]
  /** Rows the response carried for some other system. Counted, never displayed. */
  rejected: number
  /** True when WAVE stopped reading at its own row limits. */
  truncated: boolean
}

export type EchoCheck =
  | { state: 'retrieved'; records: EchoRecordSet }
  /** The query completed and returned no rows. Never an all-clear. */
  | { state: 'none'; pwsid: string; retrievedOn: string; extractOn?: string }
  /** The lookup could not be completed. Never recorded as "no records". */
  | { state: 'incomplete' }
  /** No verified federal PWS ID for this supplier, so no query was made. */
  | { state: 'unsupported' }

export const ECHO_RECORD_KEY = 'wave:echo-records:v1'
export const ECHO_SOURCE_LABEL = 'EPA ECHO (SDWIS)'
/** The public report a resident can open to see the same records. */
export const echoReportUrl = (pwsid: string) => `https://echo.epa.gov/detailed-facility-report?fid=${encodeURIComponent(pwsid)}&sys=SDWIS`

/** Survey/inspection areas, in the publisher's field order. */
export const ECHO_SURVEY_AREAS = ['Source', 'Treatment', 'Distribution', 'FinishedWaterStorage', 'Pumps', 'ManagementOperation', 'MonitoringReportingDataVerification', 'DataVerification', 'OperatorCompliance', 'Security', 'Financial', 'OtherEvaluation'] as const

export function surveyAreaLabel(key: string, language: 'en' | 'es') {
  const es = language === 'es'
  const labels: Record<string, [string, string]> = {
    Source: ['Source', 'Fuente'],
    Treatment: ['Treatment', 'Tratamiento'],
    Distribution: ['Distribution', 'Distribución'],
    FinishedWaterStorage: ['Finished water storage', 'Almacenamiento de agua tratada'],
    Pumps: ['Pumps', 'Bombas'],
    ManagementOperation: ['Management and operation', 'Gestión y operación'],
    MonitoringReportingDataVerification: ['Monitoring, reporting and data verification', 'Monitoreo, informes y verificación de datos'],
    DataVerification: ['Data verification', 'Verificación de datos'],
    OperatorCompliance: ['Operator compliance', 'Cumplimiento del operador'],
    Security: ['Security', 'Seguridad'],
    Financial: ['Financial', 'Finanzas'],
    OtherEvaluation: ['Other evaluation', 'Otra evaluación'],
  }
  const label = labels[key]
  return label ? label[es ? 1 : 0] : key
}

/** Areas a survey actually flagged. A survey with none flagged is not a finding. */
export const flaggedAreas = (survey: EchoSurveyRecord) => survey.areas.filter(area => area.flagged)
