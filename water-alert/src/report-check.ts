import { useCallback, useEffect, useState } from 'react'
import type { Language } from './domain'
import type { AnnualReport, AnnualReportIssue } from './annual-reports'

/**
 * One device's on-demand annual-report lookups. These only ever record that a
 * document was found, parsed, or that a search returned nothing. Device-local
 * results do not overwrite a shipped, hand-reviewed report in the UI.
 */
export const REPORT_CHECK_KEY = 'wave:report-check:v1'

export interface StoredCheck {
  state: 'aiSummarized' | 'autoRead' | 'unreviewed' | 'unavailable'; year: number; url?: string; checkedAt: string
  note?: Record<Language, string>
  summarizedOn?: string; readOn?: string; model?: string; issues?: readonly AnnualReportIssue[]
}
export type CheckStatus = 'idle' | 'checking' | 'checked' | 'ambiguous' | 'incomplete'
export interface ReportCheckState { report?: AnnualReport; status: CheckStatus; check: () => void }

/** Device-local results, keyed by place. Shared with the water-system check. */
export function readChecks<T>(key: string): Record<string, T> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, T> : {}
  } catch { return {} }
}

export function writeCheck<T>(key: string, placeId: string, record: T) {
  try { localStorage.setItem(key, JSON.stringify({ ...readChecks<T>(key), [placeId]: record })) }
  catch { /* storage full or blocked: the result still shows for this view */ }
}

const storedChecks = () => readChecks<StoredCheck>(REPORT_CHECK_KEY)
const saveCheck = (placeId: string, record: StoredCheck) => writeCheck(REPORT_CHECK_KEY, placeId, record)

const longDate = (iso: string, language: Language) => language === 'es'
  ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' })
  : new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * Wording claims only what was checked: that ADH's search for that year
 * returned this document, never what year is printed inside it and never
 * anything about the water itself.
 */
function note(record: StoredCheck): Record<Language, string> {
  const en = longDate(record.checkedAt, 'en'), es = longDate(record.checkedAt, 'es')
  return record.state !== 'unavailable' ? {
    en: `ADH’s ${record.year} report search returned this document on ${en}. WAVE has not read it — open the PDF to see what it says.`,
    es: `La búsqueda de informes de ${record.year} de ADH devolvió este documento el ${es}. WAVE no lo ha leído: abra el PDF para ver su contenido.`,
  } : {
    en: `Checked ${en}: ADH’s ${record.year} report search returned no matching document. This is not proof the system has no report, and not a finding about its water.`,
    es: `Revisado el ${es}: la búsqueda de informes de ${record.year} de ADH no devolvió ningún documento coincidente. Esto no prueba que el sistema no tenga informe ni es un hallazgo sobre su agua.`,
  }
}

export function deviceReport(record: StoredCheck): AnnualReport {
  if (record.state === 'aiSummarized' && record.url && record.issues && record.summarizedOn && record.model) {
    return { year: record.year, state: 'aiSummarized', url: record.url, summarizedOn: record.summarizedOn, model: record.model, issues: record.issues }
  }
  if (record.state === 'autoRead' && record.url && record.issues && record.readOn) {
    return { year: record.year, state: 'autoRead', url: record.url, readOn: record.readOn, issues: record.issues }
  }
  if (record.state === 'unreviewed' && record.url && record.note) return { year: record.year, state: 'unreviewed', url: record.url, note: record.note }
  return record.state !== 'unavailable' && record.url
    ? { year: record.year, state: 'unreviewed', url: record.url, note: note(record) }
    : { year: record.year, state: 'unavailable', note: note(record) }
}

export function useReportCheck(placeId: string, enabled: boolean): ReportCheckState {
  const [record, setRecord] = useState<StoredCheck>()
  const [status, setStatus] = useState<CheckStatus>('idle')
  useEffect(() => {
    setRecord(enabled ? storedChecks()[placeId] : undefined)
    setStatus('idle')
  }, [placeId, enabled])
  const check = useCallback(async () => {
    setStatus('checking')
    try {
      const response = await fetch('/api/annual-report/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }), signal: AbortSignal.timeout(40_000),
      })
      if (!response.ok) { setStatus('incomplete'); return }
      const result = await response.json() as StoredCheck & { state: StoredCheck['state'] | 'ambiguous' | 'incomplete' }
      // Only a completed search is recorded. A failure must never read as
      // "no report found", and never as an all-clear.
      if (result.state === 'aiSummarized' || result.state === 'autoRead' || result.state === 'unreviewed' || result.state === 'unavailable') {
        const saved: StoredCheck = {
          state: result.state, year: result.year, checkedAt: result.checkedAt,
          ...(result.url ? { url: result.url } : {}), ...(result.note ? { note: result.note } : {}),
          ...(result.summarizedOn ? { summarizedOn: result.summarizedOn } : {}), ...(result.readOn ? { readOn: result.readOn } : {}), ...(result.model ? { model: result.model } : {}),
          ...(result.issues ? { issues: result.issues } : {}),
        }
        saveCheck(placeId, saved); setRecord(saved); setStatus('checked')
      } else setStatus(result.state === 'ambiguous' ? 'ambiguous' : 'incomplete')
    } catch { setStatus('incomplete') }
  }, [placeId])
  return { report: enabled && record ? deviceReport(record) : undefined, status, check }
}
