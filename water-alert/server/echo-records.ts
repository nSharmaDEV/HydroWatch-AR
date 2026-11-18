// One on-demand EPA ECHO drinking-water record lookup for a single system.
//
// Bounded and defensive by construction:
//  * exactly one trusted host and path; the PWS ID is the only input, and it
//    must already be in WAVE's reviewed EPA directory snapshot;
//  * redirects are refused rather than followed, so the response can only come
//    from the host we asked;
//  * the body is read with a hard size and time budget;
//  * every row must carry the requested system's own id, or it is rejected;
//  * every field is copied as published, truncated to a safe length and never
//    interpreted as markup, a URL or an instruction. Document content is data.
//
// A failed lookup is `incomplete`. It is never recorded as "no records", and
// "no records" is never an all-clear.
import type { EchoCheck, EchoEnforcementRecord, EchoFormalAction, EchoNoticeRecord, EchoRecordSet, EchoSurveyArea, EchoSurveyRecord, EchoViolationRecord } from '../src/echo-records.js'
import { ECHO_SURVEY_AREAS } from '../src/echo-records.js'

const ECHO_HOST = 'echodata.epa.gov'
const ECHO_PATH = '/echo/dfr_rest_services.get_dfr'
/** ECHO's detailed facility report for a small system is tens of kilobytes. */
const MAX_BYTES = 4_000_000
const MAX_ROWS = 400

export const todayIso = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

const str = (value: unknown, max = 300) => {
  if (typeof value !== 'string') return undefined
  // Control characters are stripped; the wording itself is never edited.
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, max) : undefined
}
/** Dates are kept exactly as printed when they are a plain MM/DD/YYYY. */
const printedDate = (value: unknown) => { const v = str(value, 10); return v && /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v : undefined }
const id = (value: unknown) => { const v = str(value, 40); return v && /^[A-Za-z0-9._-]+$/.test(v) ? v : undefined }

function enforcement(value: unknown): EchoEnforcementRecord | undefined {
  const row = value as Record<string, unknown> | null
  if (!row || typeof row !== 'object') return undefined
  const record: EchoEnforcementRecord = {
    ...(id(row.EnforcementId) ? { id: id(row.EnforcementId) } : {}),
    ...(printedDate(row.EnforcementDate) ? { on: printedDate(row.EnforcementDate) } : {}),
    ...(str(row.EnforcementType, 40) ? { type: str(row.EnforcementType, 40) } : {}),
    ...(str(row.EnforcementActionTypeDesc) ? { action: str(row.EnforcementActionTypeDesc) } : {}),
    ...(str(row.Agency, 60) ? { agency: str(row.Agency, 60) } : {}),
  }
  return record.id || record.on || record.action ? record : undefined
}

function violation(value: unknown, pwsid: string, rows: (value: unknown, max?: number) => unknown[]): EchoViolationRecord | 'rejected' | undefined {
  const row = value as Record<string, unknown> | null
  if (!row || typeof row !== 'object') return undefined
  const source = str(row.SourceID, 20)
  if (source !== pwsid) return 'rejected'
  const reference = id(row.ViolationID)
  // A row with no violation id carries no reference number of its own. It is
  // kept only through the enforcement actions it lists, elsewhere in the set.
  if (!reference) return undefined
  return {
    id: reference,
    ...(str(row.FederalRule) ? { rule: str(row.FederalRule) } : {}),
    ...(str(row.ContaminantName) ? { contaminant: str(row.ContaminantName) } : {}),
    ...(str(row.ViolationCategoryCode, 10) ? { categoryCode: str(row.ViolationCategoryCode, 10) } : {}),
    ...(str(row.ViolationCategoryDesc) ? { category: str(row.ViolationCategoryDesc) } : {}),
    ...(printedDate(row.CompliancePeriodBeginDate) ? { from: printedDate(row.CompliancePeriodBeginDate) } : {}),
    ...(printedDate(row.CompliancePeriodEndDate) ? { through: printedDate(row.CompliancePeriodEndDate) } : {}),
    ...(str(row.Status, 40) ? { status: str(row.Status, 40) } : {}),
    ...(printedDate(row.ResolvedDate) ? { resolvedOn: printedDate(row.ResolvedDate) } : {}),
    ...(str(row.ViolationMeasure, 60) ? { measure: str(row.ViolationMeasure, 60) } : {}),
    ...(str(row.StateMCL, 60) ? { stateMcl: str(row.StateMCL, 60) } : {}),
    ...(str(row.FederalMCL, 60) ? { federalMcl: str(row.FederalMCL, 60) } : {}),
    actions: rows(row.EnforcementActions, 40).flatMap(a => { const value = enforcement(a); return value ? [value] : [] }),
  }
}

function survey(value: unknown, pwsid: string): EchoSurveyRecord | 'rejected' | undefined {
  const row = value as Record<string, unknown> | null
  if (!row || typeof row !== 'object') return undefined
  const source = str(row.SourceID, 20)
  if (source !== pwsid) return 'rejected'
  const on = printedDate(row.VisitDate)
  if (!on) return undefined
  const areas: EchoSurveyArea[] = ECHO_SURVEY_AREAS.flatMap(key => {
    const flag = str(row[key], 4)
    if (flag !== 'Y' && flag !== 'N') return []
    const detail = str(row[`${key}Desc`], 600)
    return [{ key, flagged: flag === 'Y', ...(detail ? { detail } : {}) }]
  })
  const type = str(row.VisitType) ?? str(row.VisitReason)
  return {
    id: `${pwsid}:${on}:${(type ?? 'visit').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}`,
    on, ...(type ? { type } : {}), ...(str(row.Agency, 60) ? { agency: str(row.Agency, 60) } : {}), areas,
  }
}

function notice(value: unknown, pwsid: string): EchoNoticeRecord | 'rejected' | undefined {
  const row = value as Record<string, unknown> | null
  if (!row || typeof row !== 'object') return undefined
  const source = str(row.SourceID, 20)
  if (source !== pwsid) return 'rejected'
  const on = printedDate(row.NoticeDate)
  const reference = id(row.EnfIdentifier)
  if (!on && !reference) return undefined
  return {
    id: reference ?? `${pwsid}:notice:${on}`,
    ...(on ? { on } : {}),
    ...(str(row.ActionType) ? { action: str(row.ActionType) } : {}),
    ...(str(row.LeadAgency, 60) ? { agency: str(row.LeadAgency, 60) } : {}),
    official: str(row.OfficialFlag, 4) === 'Y',
  }
}

function formal(value: unknown, pwsid: string, index: number): EchoFormalAction | 'rejected' | undefined {
  const row = value as Record<string, unknown> | null
  if (!row || typeof row !== 'object') return undefined
  const source = str(row.SourceID, 20)
  if (source !== pwsid) return 'rejected'
  const on = printedDate(row.ActionDate)
  const action = str(row.ActionType)
  if (!on && !action) return undefined
  return {
    id: `${pwsid}:formal:${on ?? 'undated'}:${index}`,
    ...(on ? { on } : {}),
    ...(action ? { action } : {}),
    ...(str(row.LeadAgency, 60) ? { agency: str(row.LeadAgency, 60) } : {}),
    ...(str(row.PenaltyAmount, 40) ? { penalty: str(row.PenaltyAmount, 40) } : {}),
  }
}

/** Reads the response body with a hard ceiling instead of trusting its length. */
async function boundedText(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) return undefined
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        size += value.byteLength
        if (size > MAX_BYTES) { await reader.cancel(); return undefined }
        chunks.push(value)
      }
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8')
}

export function normalizeEcho(payload: unknown, pwsid: string, retrievedOn: string): EchoCheck {
  const results = (payload as { Results?: Record<string, unknown> } | null)?.Results
  if (!results || typeof results !== 'object') return { state: 'incomplete' }
  if (typeof results.Message === 'string' && results.Message !== 'Success') return { state: 'incomplete' }
  if (results.Error) return { state: 'incomplete' }
  let overflowed = false
  let rejected = 0
  const rows = (value: unknown, max = MAX_ROWS): unknown[] => {
    if (value === undefined || value === null) return []
    if (!Array.isArray(value)) { rejected++; return [] }
    if (value.length > max) overflowed = true
    return value.slice(0, max)
  }
  const nested = (value: unknown, key: string): unknown[] => {
    if (value === undefined || value === null) return []
    const sources = (value as { Sources?: unknown })?.Sources
    if (!Array.isArray(sources)) { rejected++; return [] }
    return rows(rows(sources).flatMap(source => {
      const entries = (source as Record<string, unknown>)?.[key]
      if (!Array.isArray(entries)) { rejected++; return [] }
      return rows(entries)
    }))
  }
  const take = <T>(value: T | 'rejected' | undefined): T[] => { if (value === 'rejected') { rejected++; return [] } return value ? [value] : [] }

  const violationRows = nested(results.ViolationsEnforcementActions, 'Violations')
  const violations = violationRows.flatMap(row => take(violation(row, pwsid, rows)))
  const surveyRows = nested(results.SanitarySurveys, 'SanitarySurvey')
  const visitRows = nested(results.SiteVisits, 'SiteVisit')
  const surveys: EchoSurveyRecord[] = []
  for (const row of [...surveyRows, ...visitRows]) {
    for (const value of take(survey(row, pwsid))) if (!surveys.some(existing => existing.id === value.id)) surveys.push(value)
  }
  const notices = rows((results.Notices as { Notice?: unknown })?.Notice).flatMap(row => take(notice(row, pwsid)))
  const formalActions = rows((results.FormalActions as { Action?: unknown })?.Action).flatMap((row, index) => take(formal(row, pwsid, index)))

  const extract = rows((results.SystemExtractDates as { Dates?: unknown })?.Dates)
    .map(row => row as Record<string, unknown>)
    .find(row => str(row.EPASystem, 30) === 'SDWIS')
  const extractOn = printedDate(extract?.SystemExtractDate)
  const permit = rows(results.Permits).map(row => row as Record<string, unknown>).find(row => str(row.SourceID, 20) === pwsid)
  const systemName = str(permit?.FacilityName, 200)

  const truncated = overflowed

  if (!violations.length && !surveys.length && !notices.length && !formalActions.length) {
    const sections = [results.ViolationsEnforcementActions, results.SanitarySurveys, results.SiteVisits]
    const hasEmptySection = sections.some(section => Array.isArray((section as { Sources?: unknown })?.Sources))
      || Array.isArray((results.Notices as { Notice?: unknown })?.Notice)
      || Array.isArray((results.FormalActions as { Action?: unknown })?.Action)
    if (!permit || !hasEmptySection || rejected || truncated || violationRows.length || surveyRows.length || visitRows.length) return { state: 'incomplete' }
    return { state: 'none', pwsid, retrievedOn, ...(extractOn ? { extractOn } : {}) }
  }
  const records: EchoRecordSet = {
    pwsid, retrievedOn, violations, surveys, notices, formalActions, rejected, truncated,
    ...(systemName ? { systemName } : {}), ...(extractOn ? { extractOn } : {}),
  }
  return { state: 'retrieved', records }
}

export async function checkEchoRecords(pwsid: string, doFetch: typeof fetch = fetch, retrievedOn = todayIso()): Promise<EchoCheck> {
  if (!/^[A-Z]{2}[0-9A-Z]{7}$/.test(pwsid)) return { state: 'unsupported' }
  const url = new URL(`https://${ECHO_HOST}${ECHO_PATH}`)
  url.searchParams.set('p_id', pwsid)
  url.searchParams.set('output', 'JSON')
  let response: Response
  try {
    response = await doFetch(url, {
      // A redirect would move the answer off the one host WAVE trusts.
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
  } catch { return { state: 'incomplete' } }
  if (!response.ok) return { state: 'incomplete' }
  if (response.redirected || new URL(response.url || url).host !== ECHO_HOST) return { state: 'incomplete' }
  const body = await boundedText(response).catch(() => undefined)
  if (body === undefined) return { state: 'incomplete' }
  let payload: unknown
  try { payload = JSON.parse(body) } catch { return { state: 'incomplete' } }
  return normalizeEcho(payload, pwsid, retrievedOn)
}
