import type { Language } from './domain.js'
import { providerContact, type EmailListing } from './provider-contacts.js'
import { ADH_ENGINEERING_SOURCE, RECOVERY_RESOURCES } from './recovery-resources.js'
import { ISSUE_LABELS } from './help-questions.js'
import { readableDate } from './help-format.js'
import { recipientRoutes, routeFor, type HelpDraft, type HelpRoute, type IssueType } from './help-requests.js'

/** Resident-initiated handoff channels. WAVE never sends, calls or files anything itself. */
export interface SendOption {
  route: HelpRoute; name: string; recommended: boolean
  email?: string; emailKind?: 'general' | 'staff'; emailSource?: EmailListing; otherListings?: EmailListing[]
  phone?: string; dial?: string; formUrl?: string; sourceUrl?: string; checkedOn?: string; phoneSource?: 'ADH' | 'EPA'
}

/** Where a resident might go next if the first contact does not resolve the issue. */
const ESCALATION: Record<IssueType, HelpRoute | undefined> = { service: 'adh', quality: 'adh', advisory: 'adh', other: 'adh', billing: 'ag', legal: undefined }

export function escalationRoute(issue: IssueType): HelpRoute | undefined { return ESCALATION[issue] }

/** A new draft to another (or the same) office that cites the earlier resident-reported contact. */
export function followUpDraft(d: HelpDraft, route: HelpRoute, id: string): HelpDraft {
  const last = [...(d.outcomes ?? [])].reverse().find(o => o.kind === 'emailed' || o.kind === 'called' || o.kind === 'form')
  const { outcomes: _o, followUpOn: _f, ...rest } = d
  return { ...rest, id, route, recipientRoutes: [route], flowStep: 'review', stage: 2, subject: '', body: '', subjectEdited: false, bodyEdited: false, generatedFrom: undefined, attachments: [],
    ...(last ? { priorContact: { name: last.name, on: last.on, ...(last.reference ? { reference: last.reference } : {}) } } : {}) }
}

const ADH_PHONE = '501-661-2623', ADH_DIAL = '+15016612623'

export function sendOption(draft: HelpDraft, route: HelpRoute, recommended: boolean): SendOption {
  const base = routeFor({ ...draft, route })
  if (route === 'provider') {
    const c = providerContact(draft.place.id)
    return { route, name: draft.place.name, recommended, email: c?.email, emailKind: c?.emailKind, emailSource: c?.emailSource, otherListings: c?.otherListings, phone: c?.phone || undefined, dial: c?.dial || undefined, sourceUrl: c?.sourceUrl, checkedOn: c?.verifiedOn, phoneSource: c ? c.phoneSource ?? 'ADH' : undefined }
  }
  if (route === 'adh') return { route, name: base.name, recommended, phone: ADH_PHONE, dial: ADH_DIAL, sourceUrl: ADH_ENGINEERING_SOURCE, checkedOn: '2026-10-14' }
  if (route === 'ag') return { route, name: base.name, recommended, formUrl: RECOVERY_RESOURCES.complaint, checkedOn: '2026-10-14' }
  return { route, name: base.name, recommended, formUrl: RECOVERY_RESOURCES.intake, checkedOn: '2026-10-14' }
}

/** Rows follow the message's selected recipients so the greeting always matches. */
export function sendOptions(draft: HelpDraft): { primary: SendOption[]; next?: SendOption } {
  const selected = recipientRoutes(draft)
  const escalation = ESCALATION[draft.issue]
  return {
    primary: selected.map(route => sendOption(draft, route, true)),
    next: escalation && !selected.includes(escalation) ? sendOption(draft, escalation, false) : undefined,
  }
}

/** Conservative mail-client limit; long messages keep To/Subject and ask for paste. */
export function mailtoUrl(email: string, subject: string, body: string): { url: string; full: boolean } | undefined {
  if (!email || /[\r\n,;?&]/.test(email)) return undefined
  const full = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return full.length <= 8000 ? { url: full, full: true } : { url: `mailto:${email}?subject=${encodeURIComponent(subject)}`, full: false }
}

/** A short spoken summary built only from the resident's confirmed answers. */
export function callScript(draft: HelpDraft, language: Language): string[] {
  const es = language === 'es', a = draft.answers ?? {}
  const say = (en: string, spanish: string) => es ? spanish : en
  const observed = [...Object.values(draft.wording?.report ?? {}), draft.description].map(v => v?.trim()).filter(Boolean).join('; ')
  const requested = [...Object.values(draft.wording?.response ?? {}), a.response].map(v => v?.trim()).filter(Boolean).join('; ')
  const began = readableDate(a.began || a.noticed, language)
  const ongoing = a.ongoing === 'Yes' ? say(' and is still happening', ' y continúa') : a.ongoing === 'No' ? say(' and has stopped', ' y ya terminó') : ''
  const where = [...(draft.locations ?? []), a.area].filter(Boolean).join('; ')
  return [
    say(`Hello, I'm calling to report: ${ISSUE_LABELS[draft.issue][0].toLowerCase()}.`, `Hola, llamo para reportar: ${ISSUE_LABELS[draft.issue][1].toLowerCase()}.`),
    observed ? say(`What I noticed: ${observed}.`, `Lo que noté: ${observed}.`) : '',
    began || ongoing ? say(`It started ${began ?? 'on a date I am not sure of'}${a.approximate === 'Yes' ? ' (approximately)' : ''}${ongoing}.`, `Empezó ${began ?? 'en una fecha que no sé'}${a.approximate === 'Yes' ? ' (aproximadamente)' : ''}${ongoing}.`) : '',
    where ? say(`Location: ${where}.`, `Lugar: ${where}.`) : '',
    requested ? say(`I'm asking for: ${requested}.`, `Solicito: ${requested}.`) : '',
    say('Could you give me a reference number for this report?', '¿Me puede dar un número de referencia para este reporte?'),
  ].filter(Boolean)
}
