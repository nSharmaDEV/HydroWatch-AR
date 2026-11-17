import type { Language } from './domain.js'
import type { HelpOutcome, HelpOutcomeKind, HelpRequest, HelpRoute } from './help-requests.js'
import { closedKind, CONTACT_KINDS, contacted, localDate } from './help-outcomes.js'
import { helpStep } from './help-flow.js'
import { supplierDisplayName } from './help-format.js'

/**
 * What History shows for one saved request. Everything here is derived from what the
 * resident recorded or what WAVE itself sent; WAVE never observes calls, replies,
 * delivery outside its own sender, or what the utility is doing.
 */

const locale = (language: Language) => language === 'es' ? 'es' : 'en-US'
const say = (language: Language, en: string, es: string) => language === 'es' ? es : en

function dateOnly(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : undefined
}
/** "Nov 12", or "Nov 12, 2025" outside the current year. Date-only values never shift time zone. */
export function shortDate(value: string, language: Language, today = localDate()): string {
  const d = dateOnly(value)
  if (!d) return value
  const year = value.slice(0, 4) !== today.slice(0, 4)
  return new Intl.DateTimeFormat(locale(language), { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(d)
}
export function dateTime(at: number, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(at)
}
/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const a = dateOnly(from), b = dateOnly(to)
  return a && b ? Math.round((b.getTime() - a.getTime()) / 86400000) : 0
}
/** "in 7 days", "7 days ago", "today" — formatted for the locale. */
export function relativeDays(days: number, language: Language): string {
  return new Intl.RelativeTimeFormat(locale(language), { numeric: 'auto' }).format(days, 'day')
}

export type ContactMethod = 'emailed' | 'called' | 'form' | 'wave'
export interface LastContact { method: ContactMethod; on: string; route: HelpRoute; name: string; at?: number }

/** The latest contact the resident recorded, or the latest message WAVE accepted for sending. */
export function lastContact(r: HelpRequest): LastContact | undefined {
  const recorded = contacted(r.draft)
  const sent = r.messages.filter(m => m.direction === 'outgoing' && (m.delivery === 'sent' || m.delivery === 'delivered')).at(-1)
  const fromRecord: LastContact | undefined = recorded ? { method: recorded.kind as ContactMethod, on: recorded.on, route: recorded.route, name: recorded.name } : undefined
  const fromSend: LastContact | undefined = sent ? { method: 'wave', on: localDate(new Date(sent.at)), route: r.draft.route, name: r.draft.place.name, at: sent.at } : undefined
  if (!fromRecord) return fromSend
  if (!fromSend) return fromRecord
  return fromSend.on > fromRecord.on ? fromSend : fromRecord
}

const lastOf = (r: HelpRequest, kinds: readonly HelpOutcomeKind[]): HelpOutcome | undefined => [...(r.draft.outcomes ?? [])].reverse().find(o => kinds.includes(o.kind))

export type RequestKind = 'draft' | 'ready' | 'send-problem' | 'due' | 'waiting' | 'reply' | 'unreachable' | 'resolved' | 'closed'
export type Tone = 'amber' | 'teal' | 'green' | 'slate'
export type PrimaryAction = 'continue' | 'follow-up' | 'update' | 'record'
export type Group = 'needs' | 'progress' | 'closed'

export interface RequestState {
  kind: RequestKind; group: Group; tone: Tone
  /** Short status for a list chip. */
  chip: string
  title: string; detail: string
  action?: PrimaryAction
  contact?: LastContact
  /** When this state started, for the timeline and closed headline. */
  on?: string
}

function contactSentence(c: LastContact, language: Language, today: string): string {
  const when = shortDate(c.on, language, today)
  switch (c.method) {
    case 'emailed': return say(language, `You emailed them ${when}.`, `Les enviaste un correo el ${when}.`)
    case 'called': return say(language, `You called them ${when}.`, `Los llamaste el ${when}.`)
    case 'form': return say(language, `You sent their form ${when}.`, `Enviaste su formulario el ${when}.`)
    case 'wave': return say(language, `You sent it through WAVE ${when}.`, `Lo enviaste por WAVE el ${when}.`)
  }
}

export function requestState(r: HelpRequest, language: Language, today = localDate()): RequestState {
  const s = (en: string, es: string) => say(language, en, es)
  const closed = closedKind(r.draft), status = lastOf(r, ['resolved', 'closed'])
  if (closed === 'resolved') {
    const note = status?.note
    return { kind: 'resolved', group: 'closed', tone: 'green', chip: s('Resolved', 'Resuelto'), on: status?.on,
      title: status ? s(`Resolved ${shortDate(status.on, language, today)}`, `Resuelto el ${shortDate(status.on, language, today)}`) : s('Resolved', 'Resuelto'),
      detail: note ?? s('You marked this resolved.', 'Lo marcaste como resuelto.') }
  }
  if (closed === 'closed' || r.status === 'closed') {
    const on = closed === 'closed' ? status?.on : undefined
    return { kind: 'closed', group: 'closed', tone: 'slate', chip: s('Closed', 'Cerrado'), on,
      title: on ? s(`Closed ${shortDate(on, language, today)}`, `Cerrado el ${shortDate(on, language, today)}`) : s('Closed', 'Cerrado'),
      detail: (closed === 'closed' ? status?.note : undefined) ?? s('You stopped pursuing this. You can reopen it at any time.', 'Dejaste de darle seguimiento. Puedes reabrirlo cuando quieras.') }
  }
  const contact = lastContact(r)
  const attempt = lastOf(r, [...CONTACT_KINDS, 'unreachable'])
  const problem = r.messages.filter(m => m.direction === 'outgoing').at(-1)
  const problemOn = problem ? localDate(new Date(problem.at)) : ''
  if (problem && ['failed', 'unknown', 'sending'].includes(problem.delivery) && (!contact || contact.on < problemOn || (contact.at !== undefined && contact.at < problem.at))) {
    return { kind: 'send-problem', group: 'needs', tone: 'amber', chip: s('Send not confirmed', 'Envío sin confirmar'), action: 'record', contact,
      title: problem.delivery === 'failed' ? s('Your message didn’t go through', 'Tu mensaje no se envió') : s('Send not confirmed', 'Envío sin confirmar'),
      detail: s(`WAVE could not confirm the message from ${shortDate(localDate(new Date(problem.at)), language, today)}. Check it before sending again.`, `WAVE no pudo confirmar el mensaje del ${shortDate(localDate(new Date(problem.at)), language, today)}. Revísalo antes de volver a enviar.`) }
  }
  if (attempt?.kind === 'unreachable' && (!contact || attempt.on >= contact.on)) {
    return { kind: 'unreachable', group: 'needs', tone: 'amber', chip: s('Couldn’t reach them', 'No pudiste comunicarte'), action: 'follow-up', contact, on: attempt.on,
      title: s('Couldn’t reach them', 'No pudiste comunicarte'),
      detail: s(`You tried ${shortDate(attempt.on, language, today)}. Try again, or reach another office.`, `Lo intentaste el ${shortDate(attempt.on, language, today)}. Inténtalo de nuevo o contacta otra oficina.`) }
  }
  if (!contact) {
    const ready = !!r.draft.body.trim() && ['review', 'send'].includes(helpStep(r.draft))
    return ready
      ? { kind: 'ready', group: 'progress', tone: 'teal', chip: s('Ready to send', 'Listo para enviar'), action: 'continue', title: s('Ready to send', 'Listo para enviar'), detail: s('You haven’t contacted them yet.', 'Aún no te has comunicado con ellos.') }
      : { kind: 'draft', group: 'progress', tone: 'teal', chip: s('Not sent yet', 'Aún no enviado'), action: 'continue', title: s('Finish your message', 'Termina tu mensaje'), detail: s('You haven’t contacted them yet.', 'Aún no te has comunicado con ellos.') }
  }
  const reply = lastOf(r, ['reply'])
  const incoming = r.messages.filter(m => m.direction === 'incoming').at(-1)
  const replyOn = [reply?.on, incoming ? localDate(new Date(incoming.at)) : undefined].filter((v): v is string => !!v && v >= contact.on).sort().at(-1)
  if (replyOn) {
    return { kind: 'reply', group: 'progress', tone: 'teal', chip: s('Reply recorded', 'Respuesta registrada'), action: 'update', contact, on: replyOn,
      title: s('Reply recorded', 'Respuesta registrada'),
      detail: s(`You recorded a reply on ${shortDate(replyOn, language, today)}. Mark it resolved when the problem is fixed.`, `Registraste una respuesta el ${shortDate(replyOn, language, today)}. Márcalo como resuelto cuando se solucione.`) }
  }
  const follow = r.draft.followUpOn
  if (follow && today >= follow) {
    const late = daysBetween(follow, today)
    return { kind: 'due', group: 'needs', tone: 'amber', chip: s('Follow-up suggested', 'Seguimiento sugerido'), action: 'follow-up', contact,
      title: late === 0 ? s('Follow-up suggested today', 'Seguimiento sugerido para hoy') : s(`Follow-up suggested ${relativeDays(-late, language)}`, `Seguimiento sugerido ${relativeDays(-late, language)}`),
      detail: `${contactSentence(contact, language, today)} ${s('No reply recorded yet.', 'Aún no hay respuesta registrada.')}` }
  }
  return { kind: 'waiting', group: 'progress', tone: 'teal', chip: s('No reply recorded', 'Sin respuesta registrada'), action: 'update', contact,
    title: s('Waiting for a reply', 'Esperando respuesta'), detail: contactSentence(contact, language, today) }
}

export type StageKey = 'prepared' | 'contacted' | 'followup' | 'closed'
/** done = teal, current = teal ring (the resident's next step), due = amber ring, attention = amber, todo = gray. */
export type StageState = 'done' | 'current' | 'due' | 'attention' | 'todo'
export interface Stage { key: StageKey; label: string; detail: string; state: StageState }
export const STAGE_LABELS: Record<StageKey, [string, string]> = {
  prepared: ['Prepared', 'Preparada'], contacted: ['Contacted', 'Contactado'], followup: ['Follow up', 'Seguimiento'], closed: ['Closed', 'Cerrada'],
}
const METHOD: Record<ContactMethod, [string, string]> = { emailed: ['email', 'correo'], called: ['call', 'llamada'], form: ['form', 'formulario'], wave: ['WAVE', 'WAVE'] }

/** The same four stages everywhere; a date appears only when one was recorded. */
export function requestStages(r: HelpRequest, language: Language, today = localDate()): Stage[] {
  const state = requestState(r, language, today), i = language === 'es' ? 1 : 0, dash = '—'
  const label = (k: StageKey) => STAGE_LABELS[k][i], d = (v: string) => shortDate(v, language, today)
  const c = state.contact
  // Requests do not store when they were prepared, so a completed Prepared stage says so
  // rather than borrowing the last-saved time or showing a bare dash.
  const prepared: Stage = { key: 'prepared', label: label('prepared'), state: 'done', detail: state.kind === 'draft' ? say(language, 'In progress', 'En curso') : say(language, 'Date not recorded', 'Fecha no registrada') }
  if (state.kind === 'draft') prepared.state = 'current'
  let contactedStage: Stage = { key: 'contacted', label: label('contacted'), state: 'todo', detail: dash }
  if (c) contactedStage = { ...contactedStage, state: 'done', detail: `${d(c.on)} · ${METHOD[c.method][i]}` }
  if (state.kind === 'unreachable') contactedStage = { ...contactedStage, state: 'attention', detail: `${d(state.on!)} · ${say(language, 'no answer', 'sin respuesta')}` }
  if (state.kind === 'send-problem') contactedStage = { ...contactedStage, state: 'attention', detail: say(language, 'Not confirmed', 'Sin confirmar') }
  if (state.kind === 'ready') contactedStage.state = 'current'
  let followup: Stage = { key: 'followup', label: label('followup'), state: 'todo', detail: dash }
  const replyOn = state.kind === 'reply' ? state.on : undefined
  if (replyOn) followup = { ...followup, state: 'done', detail: `${d(replyOn)} · ${say(language, 'reply', 'respuesta')}` }
  else if (state.group !== 'closed' && c && r.draft.followUpOn) followup = { ...followup, state: state.kind === 'due' ? 'due' : 'todo', detail: d(r.draft.followUpOn) }
  const closedStage: Stage = state.group === 'closed'
    ? { key: 'closed', label: label('closed'), state: 'done', detail: state.on ? `${d(state.on)} · ${state.kind === 'resolved' ? say(language, 'resolved', 'resuelto') : say(language, 'not pursuing', 'sin seguimiento')}` : state.kind === 'resolved' ? say(language, 'Resolved', 'Resuelto') : say(language, 'Closed', 'Cerrado') }
    : { key: 'closed', label: label('closed'), state: 'todo', detail: dash }
  if (state.group === 'closed' && contactedStage.state === 'todo') contactedStage.detail = dash
  return [prepared, contactedStage, followup, closedStage]
}

export interface TimelineItem { id: string; label: string; when: string; note?: string; future: boolean; sort: string }

/** Newest first; future suggestions after past events. Only stored times are shown. */
export function requestTimeline(r: HelpRequest, language: Language, today = localDate()): TimelineItem[] {
  const s = (en: string, es: string) => say(language, en, es), d = (v: string) => shortDate(v, language, today)
  const name = (o: { name: string }) => supplierDisplayName(o.name)
  const items: TimelineItem[] = []
  const outcomeText: Record<HelpOutcomeKind, (o: HelpOutcome) => string> = {
    emailed: o => s(`You emailed ${name(o)}`, `Enviaste un correo a ${name(o)}`),
    called: o => s(`You called ${name(o)}`, `Llamaste a ${name(o)}`),
    form: o => s(`You sent a form to ${name(o)}`, `Enviaste un formulario a ${name(o)}`),
    unreachable: o => s(`You couldn’t reach ${name(o)}`, `No pudiste comunicarte con ${name(o)}`),
    reply: o => s(`You recorded a reply from ${name(o)}`, `Registraste una respuesta de ${name(o)}`),
    resolved: () => s('You marked this resolved', 'Lo marcaste como resuelto'),
    unresolved: () => s('You marked this not resolved', 'Lo marcaste como no resuelto'),
    closed: () => s('You stopped pursuing this', 'Dejaste de darle seguimiento'),
    reopened: () => s('You reopened this', 'Lo reabriste'),
  }
  if (r.draft.priorContact) items.push({ id: 'prior', label: s(`Earlier contact with ${name(r.draft.priorContact)}`, `Contacto anterior con ${name(r.draft.priorContact)}`), when: d(r.draft.priorContact.on), note: r.draft.priorContact.reference ? `${s('Ref.', 'Ref.')} ${r.draft.priorContact.reference}` : undefined, future: false, sort: r.draft.priorContact.on })
  ;(r.draft.outcomes ?? []).forEach((o, n) => items.push({ id: o.id, label: outcomeText[o.kind](o), when: d(o.on), note: [o.reference ? `${s('Ref.', 'Ref.')} ${o.reference}` : '', o.note ?? ''].filter(Boolean).join(' · ') || undefined, future: false, sort: `${o.on}~${String(n).padStart(3, '0')}` }))
  const delivery = { sending: s('sending', 'enviando'), sent: s('sent', 'enviado'), delivered: s('delivered', 'entregado'), failed: s('failed', 'fallido'), unknown: s('outcome unknown', 'resultado desconocido') }
  for (const m of r.messages) items.push(m.direction === 'outgoing'
    ? { id: m.id, label: s(`Sent through WAVE — ${delivery[m.delivery]}`, `Enviado por WAVE — ${delivery[m.delivery]}`), when: dateTime(m.at, language), future: false, sort: `${localDate(new Date(m.at))}T${new Date(m.at).toISOString()}` }
    : { id: m.id, label: s('Reply received by email', 'Respuesta recibida por correo'), when: dateTime(m.at, language), future: false, sort: `${localDate(new Date(m.at))}T${new Date(m.at).toISOString()}` })
  for (const e of r.events) if (e.kind === 'open' || e.kind === 'closed') items.push({ id: e.id, label: e.kind === 'closed' ? s('Request closed', 'Solicitud cerrada') : s('Request reopened', 'Solicitud reabierta'), when: dateTime(e.at, language), future: false, sort: `${localDate(new Date(e.at))}T${new Date(e.at).toISOString()}` })
  const state = requestState(r, language, today)
  if (r.draft.followUpOn && state.group !== 'closed' && state.kind !== 'reply' && state.contact) items.push({ id: 'follow', label: s('Follow-up suggested', 'Seguimiento sugerido'), when: d(r.draft.followUpOn), future: r.draft.followUpOn > today, sort: `${r.draft.followUpOn}~~` })
  const past = items.filter(i => !i.future).sort((a, b) => b.sort.localeCompare(a.sort))
  return [...past, ...items.filter(i => i.future)]
}

export const GROUP_ORDER: Group[] = ['needs', 'progress', 'closed']
export const GROUP_LABELS: Record<Group, [string, string]> = { needs: ['Needs you', 'Te necesita'], progress: ['In progress', 'En curso'], closed: ['Closed', 'Cerradas'] }
export function groupRequests(records: HelpRequest[], language: Language, today = localDate()): Record<Group, HelpRequest[]> {
  const out: Record<Group, HelpRequest[]> = { needs: [], progress: [], closed: [] }
  for (const r of [...records].sort((a, b) => b.updatedAt - a.updatedAt)) out[requestState(r, language, today).group].push(r)
  return out
}
