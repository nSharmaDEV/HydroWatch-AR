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
  if (o.kind === 'resolved' || o.kind === 'unresolved') return label
  return `${label} ${o.name}`
}

export function contacted(d: HelpDraft): HelpOutcome | undefined {
  return [...(d.outcomes ?? [])].reverse().find(o => CONTACT_KINDS.includes(o.kind))
}
export function isResolved(d: HelpDraft): boolean {
  const last = [...(d.outcomes ?? [])].reverse().find(o => o.kind === 'resolved' || o.kind === 'unresolved')
  return last?.kind === 'resolved'
}
export type FollowUpState = 'none' | 'waiting' | 'due' | 'resolved'
export function followUpState(d: HelpDraft, today = localDate()): FollowUpState {
  if (isResolved(d)) return 'resolved'
  if (!contacted(d) || !d.followUpOn) return 'none'
  const replied = (d.outcomes ?? []).some(o => o.kind === 'reply' && o.on >= contacted(d)!.on)
  if (replied) return 'none'
  return today >= d.followUpOn ? 'due' : 'waiting'
}

let counter = 0
export function outcomeId(): string { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `outcome-${Date.now()}-${counter++}` }

/** Append a resident-reported outcome; contact outcomes (re)start the follow-up reminder. */
export function recordOutcome(d: HelpDraft, kind: HelpOutcomeKind, route: HelpRoute, name: string, extra: { reference?: string; note?: string; on?: string } = {}): Pick<HelpDraft, 'outcomes' | 'followUpOn'> {
  const on = extra.on ?? localDate()
  const outcome: HelpOutcome = { id: outcomeId(), kind, route, name: name.slice(0, 200), on, ...(extra.reference?.trim() ? { reference: extra.reference.trim().slice(0, 100) } : {}), ...(extra.note?.trim() ? { note: extra.note.trim().slice(0, 500) } : {}) }
  const outcomes = [...(d.outcomes ?? []), outcome].slice(-30)
  const followUpOn = CONTACT_KINDS.includes(kind) ? addBusinessDays(on, FOLLOW_UP_BUSINESS_DAYS) : kind === 'resolved' ? undefined : d.followUpOn
  return { outcomes, followUpOn }
}
