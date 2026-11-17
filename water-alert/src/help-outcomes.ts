import type { Language } from './domain.js'
import type { HelpDraft, HelpOutcome, HelpOutcomeKind, HelpRoute } from './help-requests.js'

/** Resident-reported only. WAVE never observes delivery, calls, replies or resolution. */
export const OUTCOME_LABELS: Record<HelpOutcomeKind, [string, string]> = {
  emailed: ['You emailed', 'Enviaste un correo a'],
  called: ['You called', 'Llamaste a'],
  form: ['You submitted a form to', 'Enviaste un formulario a'],
  unreachable: ['You couldn’t reach', 'No pudiste comunicarte con'],
  reply: ['Reply received from', 'Respuesta recibida de'],
  resolved: ['You marked this resolved', 'Marcaste esto como resuelto'],
  unresolved: ['You marked this not resolved', 'Marcaste esto como no resuelto'],
  closed: ['You closed this without a resolution', 'Cerraste esto sin resolución'],
  reopened: ['You reopened this', 'Reabriste esto'],
}
export const CONTACT_KINDS: readonly HelpOutcomeKind[] = ['emailed', 'called', 'form']
export const FOLLOW_UP_BUSINESS_DAYS = 5

/** Local calendar date (YYYY-MM-DD) without timezone drift. */
export function localDate(at = new Date()): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}
/** Weekdays only; public holidays are not modelled. */
export function addBusinessDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`)
  let left = days
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left-- }
  return localDate(d)
}

export function outcomeLabel(o: HelpOutcome, language: Language): string {
  const [en, es] = OUTCOME_LABELS[o.kind]
  const label = language === 'es' ? es : en
  if (['resolved', 'unresolved', 'closed', 'reopened'].includes(o.kind)) return label
  return `${label} ${o.name}`
}

export function contacted(d: HelpDraft): HelpOutcome | undefined {
  return [...(d.outcomes ?? [])].reverse().find(o => CONTACT_KINDS.includes(o.kind))
}
const STATUS_KINDS: readonly HelpOutcomeKind[] = ['resolved', 'unresolved', 'closed', 'reopened']
/** How the resident last closed the request, if they have not reopened it since. */
export function closedKind(d: HelpDraft): 'resolved' | 'closed' | undefined {
  const last = [...(d.outcomes ?? [])].reverse().find(o => STATUS_KINDS.includes(o.kind))
  return last?.kind === 'resolved' || last?.kind === 'closed' ? last.kind : undefined
}
export function isResolved(d: HelpDraft): boolean { return closedKind(d) === 'resolved' }
export function isClosed(d: HelpDraft): boolean { return closedKind(d) !== undefined }
export type FollowUpState = 'none' | 'waiting' | 'due' | 'resolved'
export function followUpState(d: HelpDraft, today = localDate()): FollowUpState {
  if (isClosed(d)) return 'resolved'
  if (!contacted(d) || !d.followUpOn) return 'none'
  const replied = (d.outcomes ?? []).some(o => o.kind === 'reply' && o.on >= contacted(d)!.on)
  if (replied) return 'none'
  return today >= d.followUpOn ? 'due' : 'waiting'
}

let counter = 0
export function outcomeId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `outcome-${Date.now()}-${counter++}` }

/** Append a resident-reported outcome; contact outcomes (re)start the follow-up reminder. */
export function recordOutcome(d: HelpDraft, kind: HelpOutcomeKind, route: HelpRoute, name: string, extra: { reference?: string; note?: string; on?: string; followUpOn?: string } = {}): Pick<HelpDraft, 'outcomes' | 'followUpOn'> {
  const on = extra.on ?? localDate()
  const outcome: HelpOutcome = { id: outcomeId(), kind, route, name: name.slice(0, 200), on, ...(extra.reference?.trim() ? { reference: extra.reference.trim().slice(0, 100) } : {}), ...(extra.note?.trim() ? { note: extra.note.trim().slice(0, 500) } : {}) }
  const outcomes = [...(d.outcomes ?? []), outcome].slice(-30)
  // The suggested date is five business days out; a date the resident types replaces it, and a blank clears it.
  const suggested = addBusinessDays(on, FOLLOW_UP_BUSINESS_DAYS)
  const chosen = extra.followUpOn === undefined ? suggested : /^\d{4}-\d{2}-\d{2}$/.test(extra.followUpOn) ? extra.followUpOn : undefined
  const followUpOn = CONTACT_KINDS.includes(kind) ? chosen : kind === 'resolved' || kind === 'closed' ? undefined : kind === 'reply' && extra.followUpOn !== undefined ? chosen : d.followUpOn
  return { outcomes, followUpOn }
}
/** An all-day calendar event (RFC 5545) for the follow-up date; downloaded, never synced. */
export function reminderIcs(d: HelpDraft, language: Language): string | undefined {
  if (!d.followUpOn || !/^\d{4}-\d{2}-\d{2}$/.test(d.followUpOn)) return undefined
  const es = language === 'es', escape = (t: string) => t.replace(/[\\;,]/g, m => `\\${m}`).replace(/\r?\n/g, '\\n')
  const day = (date: string) => date.replaceAll('-', '')
  const next = new Date(`${d.followUpOn}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1)
  const name = contacted(d)?.name ?? d.place.name
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WAVE//Help follow-up//EN', 'BEGIN:VEVENT',
    `UID:wave-followup-${d.id}@wave`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`,
    `DTSTART;VALUE=DATE:${day(d.followUpOn)}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replaceAll('-', '')}`,
    `SUMMARY:${escape(es ? `Dar seguimiento a ${name}` : `Follow up with ${name}`)}`,
    `DESCRIPTION:${escape(es ? `¿Respondieron? Regístralo en Historial de WAVE.` : 'Did they reply? Record it in WAVE History.')}`,
    'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n')
}

/** Edit the latest contact's ticket number, what they said and the follow-up date. Blank clears a field. */
export function updateContact(d: HelpDraft, edit: { reference: string; note: string; followUpOn: string; on?: string }): Pick<HelpDraft, 'outcomes' | 'followUpOn'> {
  const last = contacted(d)
  const outcomes = (d.outcomes ?? []).map(o => o !== last ? o : { id: o.id, kind: o.kind, route: o.route, name: o.name, on: edit.on ?? o.on, ...(edit.reference.trim() ? { reference: edit.reference.trim().slice(0, 100) } : {}), ...(edit.note.trim() ? { note: edit.note.trim().slice(0, 500) } : {}) })
  return { outcomes, followUpOn: /^\d{4}-\d{2}-\d{2}$/.test(edit.followUpOn) ? edit.followUpOn : undefined }
}

