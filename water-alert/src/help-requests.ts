import type { Place } from './domain.js'
import { PROVIDER_CONTACTS } from './provider-contacts.js'
import { ADH_ENGINEERING_SOURCE, RECOVERY_RESOURCES } from './recovery-resources.js'
import type { AnswerKey } from './help-questions.js'
import { emailOutput } from './help-outputs.js'
export type HelpRoute = 'provider' | 'adh' | 'ag' | 'legal'
export type IssueType = 'service' | 'quality' | 'billing' | 'legal' | 'advisory' | 'other'
export interface HelpAttachment { id: string; name: string; type: string; data: string }
export interface HelpSource { recordId: string; url: string; label: string }
export type HelpStep = 'choose' | 'billing' | 'timing' | 'experience' | 'response' | 'records' | 'review' | 'confirm'
export interface HelpFactRecord { agency: string; date: string; problem: string; area: string; status: string; verified: boolean; year?: string }
export interface HelpFact { id: string; text: string; kind: 'active' | 'saved' | 'historical'; included: boolean; sources: HelpSource[]; record?: HelpFactRecord }
export interface HelpDraft {
  subjectEdited?: boolean; bodyEdited?: boolean;
  residentName?: string; replyContact?: string; generatedFrom?: string;
  locations?: string[];
  id: string; place: Place; issue: IssueType; description: string; dates: string; route: HelpRoute;
  subject: string; body: string; stage: number; attachments: HelpAttachment[]; evidence: string[]; context: string; answers?: Partial<Record<AnswerKey, string>>; sources?: HelpSource[]; flowStep?: HelpStep; facts?: HelpFact[];
  recipientRoutes?: HelpRoute[]; wording?: { report: Record<string, string>; response: Record<string, string> }
}
export type Delivery = 'sending' | 'sent' | 'delivered' | 'failed' | 'unknown'
export interface HelpMessage { id: string; subject: string; body: string; attachments: HelpAttachment[]; destination: string; destinations?: string[]; at: number; delivery: Delivery; providerId?: string; direction: 'outgoing' | 'incoming'; unsupportedAttachments?: number; draftRevision: number; sources?: HelpSource[] }
export interface HelpRequest { id: string; owner: string; draft: HelpDraft; revision: number; status: 'open' | 'closed'; updatedAt: number; original?: HelpDraft; messages: HelpMessage[]; events: { id: string; at: number; kind: string }[]; replyToken: string }
export function blankRequest(place: Place, context = ''): HelpDraft { return { id: crypto.randomUUID(), place, issue: 'service', description: '', dates: '', route: 'provider', subject: '', body: '', stage: 1, attachments: [], evidence: [], context } }
export function routeFor(d: HelpDraft) {
  const contact = Object.hasOwn(PROVIDER_CONTACTS, d.place.id) ? PROVIDER_CONTACTS[d.place.id] : undefined
  switch (d.route) {
    case 'provider': return { name: d.place.name, email: contact?.email, url: contact?.sourceUrl, phone: contact?.phone, checked: contact?.verifiedOn }
    case 'adh': return { name: 'Arkansas Department of Health', email: undefined, url: ADH_ENGINEERING_SOURCE, phone: '501-661-2623' }
    case 'ag': return { name: 'Arkansas Attorney General', email: undefined, url: RECOVERY_RESOURCES.complaint }
    case 'legal': return { name: 'Arkansas Law Help', email: undefined, url: RECOVERY_RESOURCES.intake }
  }
}
export function recommendedRoute(issue: IssueType): HelpRoute { return issue === 'quality' ? 'adh' : 'provider' }
export function recipientRoutes(d: HelpDraft): HelpRoute[] { return d.recipientRoutes ?? [d.route] }
export function selectedRecipients(d: HelpDraft) { return recipientRoutes(d).map(route => ({ route, ...routeFor({ ...d, route }) })) }
/** Resolve exclusively from the directory; never accept caller-provided addresses. */
export function sendDestinations(d: HelpDraft): string[] {
  const rows = selectedRecipients(d)
  return rows.length && rows.every(r => r.email) ? [...new Set(rows.map(r => r.email!))] : []
}
export function hasReport(d: HelpDraft) { return !!(d.description.trim() || Object.values(d.wording?.report ?? {}).some(v => v.trim())) }
export function generateMessage(d: HelpDraft, language: 'en' | 'es', appendix = '') {
  return emailOutput(d, language, appendix)
}
