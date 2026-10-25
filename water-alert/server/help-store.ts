import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID, randomBytes } from 'node:crypto'
import type { StateCell } from './postgres.js'
import { sendDestinations, hasReport, type HelpDraft, type HelpRequest, type HelpMessage, type Delivery, type HelpSource } from '../src/help-requests.js'
import { QUESTIONS, type AnswerKey } from '../src/help-questions.js'
export interface HelpState { requests: HelpRequest[] }
export const emptyHelp = (): HelpState => ({ requests: [] })
const uuid = /^[a-f0-9-]{36}$/i
function validate(d: HelpDraft) {
  if (!d || !uuid.test(d.id) || !d.place || !/^ADH:[a-f0-9]{64}$/.test(d.place.id) || d.place.kind !== 'system' || typeof d.place.name !== 'string' || d.place.name.length > 200 || !['service', 'quality', 'billing', 'legal', 'advisory', 'other'].includes(d.issue) || !['provider', 'adh', 'ag', 'legal'].includes(d.route)) throw new Error('Invalid request')
  for (const [key, max] of [['description', 6000], ['dates', 1000], ['subject', 200], ['body', 24000], ['context', 16000]] as const) if (typeof d[key] !== 'string' || d[key].length > max || (key === 'subject' && /[\r\n]/.test(d[key]))) throw new Error('Invalid text')
  if (![1, 2, 3].includes(d.stage) || !Array.isArray(d.evidence) || d.evidence.length > 30 || d.evidence.some(k => typeof k !== 'string' || k.length > 100) || !Array.isArray(d.attachments) || d.attachments.length > 3) throw new Error('Invalid draft')
  let size = 0
  for (const a of d.attachments) {
    if (!uuid.test(a.id) || typeof a.name !== 'string' || !a.name || a.name.length > 120 || /[\x00-\x1f/\\]/.test(a.name) || !['text/plain', 'image/png', 'image/jpeg', 'application/pdf'].includes(a.type) || typeof a.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.data)) throw new Error('Invalid attachment')
    const b = Buffer.from(a.data, 'base64'); size += b.length
    if (!b.length || (a.type === 'application/pdf' && b.subarray(0, 5).toString() !== '%PDF-') || (a.type === 'image/png' && b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') || (a.type === 'image/jpeg' && b.subarray(0, 3).toString('hex') !== 'ffd8ff') || (a.type === 'text/plain' && b.includes(0))) throw new Error('Invalid attachment content')
  }
  if (size > 1024 * 1024) throw new Error('Attachments exceed 1 MB')
  if (typeof d.place.county !== 'string' || d.place.county.length > 200) throw new Error('Invalid county')
  const { id, issue, description, dates, route, subject, body, stage, evidence, context } = d
  for (const key of ['subjectEdited', 'bodyEdited'] as const) if (d[key] !== undefined && typeof d[key] !== 'boolean') throw new Error('Invalid email edit metadata')
  for (const [key, max] of [['residentName', 120], ['replyContact', 200], ['generatedFrom', 128]] as const) if (d[key] !== undefined && (typeof d[key] !== 'string' || d[key]!.length > max || /[\r\n\x00-\x1f]/.test(d[key]!))) throw new Error('Invalid resident metadata')
  if (d.answers !== undefined && (!d.answers || typeof d.answers !== 'object' || Array.isArray(d.answers) || Object.keys(d.answers).length > Object.keys(QUESTIONS).length)) throw new Error('Invalid answers')
  const answers: Partial<Record<AnswerKey, string>> = {}
  for (const key of Object.keys(QUESTIONS) as AnswerKey[]) {
    const value = d.answers?.[key]
    if (value !== undefined) { if (typeof value !== 'string' || value.length > 1000) throw new Error('Invalid answer'); answers[key] = value }
  }
  if (d.sources !== undefined && (!Array.isArray(d.sources) || d.sources.length > 60)) throw new Error('Invalid sources')
  const sourceValue = (source: HelpSource): HelpSource => {
    if (!source || typeof source.recordId !== 'string' || source.recordId.length > 200 || typeof source.label !== 'string' || source.label.length > 300 || typeof source.url !== 'string' || source.url.length > 2000) throw new Error('Invalid source')
    const url = new URL(source.url)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid source URL')
    return { recordId: source.recordId, url: source.url, label: source.label }
  }
  const sources = d.sources?.map(sourceValue)
  if (d.locations !== undefined && (!Array.isArray(d.locations) || d.locations.length > 10 || d.locations.some(s => typeof s !== 'string' || !s.trim() || s.length > 200 || /[\r\n\x00-\x1f]/.test(s)) || new Set(d.locations).size !== d.locations.length)) throw new Error('Invalid locations')
  if (d.flowStep !== undefined && !['choose', 'billing', 'timing', 'experience', 'response', 'records', 'review', 'confirm'].includes(d.flowStep)) throw new Error('Invalid progress')
  if (d.recipientRoutes !== undefined && (!Array.isArray(d.recipientRoutes) || d.recipientRoutes.length > 4 || new Set(d.recipientRoutes).size !== d.recipientRoutes.length || d.recipientRoutes.some(r => !['provider', 'adh', 'ag', 'legal'].includes(r)))) throw new Error('Invalid recipients')
  let wording: HelpDraft['wording']
  if (d.wording !== undefined) {
    wording = { report: {}, response: {} }
    for (const section of ['report', 'response'] as const) {
      const value = d.wording?.[section]
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 8) throw new Error('Invalid wording')
      for (const [key, text] of Object.entries(value)) {
        if (!['first', 'second', 'third', 'other', 'servicefirst', 'servicesecond', 'servicethird', 'serviceother'].includes(key) || typeof text !== 'string' || text.length > 1000) throw new Error('Invalid wording')
        wording[section][key] = text
      }
    }
  }
  if (d.facts !== undefined && (!Array.isArray(d.facts) || d.facts.length > 60)) throw new Error('Invalid facts')
  let factSize = 0, recordSize = 0
  const facts = d.facts?.map(f => {
    if (!f || typeof f.id !== 'string' || f.id.length > 220 || typeof f.text !== 'string' || !['active', 'saved', 'historical'].includes(f.kind) || typeof f.included !== 'boolean' || !Array.isArray(f.sources) || f.sources.length > 60) throw new Error('Invalid fact')
    factSize += f.text.length
    if (factSize > 16000) throw new Error('Facts exceed limit')
    let record: typeof f.record
    if (f.record !== undefined) {
      const r = f.record
      if (!r || typeof r !== 'object' || Array.isArray(r) || typeof r.verified !== 'boolean') throw new Error('Invalid fact record')
      for (const key of ['agency', 'date', 'problem', 'area', 'status'] as const) if (typeof r[key] !== 'string' || r[key].length > (key === 'problem' ? 8000 : 1000)) throw new Error('Invalid fact record')
      if (r.year !== undefined && (typeof r.year !== 'string' || !/^\d{4}$/.test(r.year))) throw new Error('Invalid fact record year')
      recordSize += r.agency.length + r.date.length + r.problem.length + r.area.length + r.status.length
      if (recordSize > 16000) throw new Error('Facts exceed limit')
      record = { agency: r.agency, date: r.date, problem: r.problem, area: r.area, status: r.status, verified: r.verified, ...(r.year ? { year: r.year } : {}) }
    }
    return { id: f.id, text: f.text, kind: f.kind, included: f.included, sources: f.sources.map(sourceValue), ...(record ? { record } : {}) }
  })
  return { id, ...(d.subjectEdited !== undefined ? { subjectEdited: d.subjectEdited } : {}), ...(d.bodyEdited !== undefined ? { bodyEdited: d.bodyEdited } : {}), place: { id: d.place.id, name: d.place.name, kind: d.place.kind, county: d.place.county }, issue, description, dates, route, subject, body, stage, evidence: [...evidence], context, answers, ...(d.residentName !== undefined ? { residentName: d.residentName } : {}), ...(d.replyContact !== undefined ? { replyContact: d.replyContact } : {}), ...(d.generatedFrom ? { generatedFrom: d.generatedFrom } : {}), ...(d.locations ? { locations: [...d.locations] } : {}), ...(wording ? { wording } : {}), ...(d.recipientRoutes ? { recipientRoutes: [...d.recipientRoutes] } : {}), ...(sources ? { sources } : {}), ...(facts ? { facts } : {}), ...(d.flowStep ? { flowStep: d.flowStep } : {}), attachments: d.attachments.map(({ id, name, type, data }) => ({ id, name, type, data })) } satisfies HelpDraft
}
/** Private bounded aggregate, atomic locally and row-locked in PostgreSQL. Never part of public observations. */
export class HelpStore {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private storage: string | StateCell<HelpState>, private clock = Date.now) {}
  private async read(): Promise<HelpState> {
    if (typeof this.storage !== 'string') return this.storage.read()
    try { return JSON.parse(await readFile(join(this.storage, 'help-requests.json'), 'utf8')) } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return emptyHelp(); throw e }
  }
  private update<T>(fn: (s: HelpState) => T): Promise<T> {
    const bounded = (s: HelpState) => { const result = fn(s); if (Buffer.byteLength(JSON.stringify(s)) > 64 * 1024 * 1024) throw new Error('Request storage full'); return structuredClone(result) }
    if (typeof this.storage !== 'string') return this.storage.update(bounded)
    const directory = this.storage
    const work = this.queue.then(async () => { const s = await this.read(), result = bounded(s); await mkdir(directory, { recursive: true, mode: 0o700 }); const temp = join(directory, `help-${randomUUID()}.tmp`); await writeFile(temp, JSON.stringify(s), { mode: 0o600 }); await rename(temp, join(directory, 'help-requests.json')); return result })
    this.queue = work.catch(() => {}); return work
  }
  private owned(s: HelpState, owner: string, id: string) { const r = s.requests.find(r => r.id === id && r.owner === owner); if (!r) throw new Error('Request not found'); return r }
  async list(owner: string) { await this.queue; return structuredClone((await this.read()).requests.filter(r => r.owner === owner).sort((a, b) => b.updatedAt - a.updatedAt)) }
  async save(owner: string, draft: HelpDraft, revision: number) {
    draft = validate(draft)
    return this.update(s => {
      let r = s.requests.find(r => r.id === draft.id)
      if (r && r.owner !== owner) throw new Error('Request not found')
      if (!r) { if (revision !== 0 || s.requests.filter(r => r.owner === owner).length >= 20) throw new Error('Request limit or conflict'); r = { id: draft.id, owner, draft, revision: 0, status: 'open', updatedAt: this.clock(), messages: [], events: [], replyToken: randomBytes(24).toString('hex') }; s.requests.push(r) }
      if (r.revision !== revision) throw new Error('Draft conflict; reload before editing')
      // Attachment bytes are always supplied inside this owned draft, never looked up by a caller's foreign id.
      r.draft = structuredClone(draft); r.revision++; r.updatedAt = this.clock(); return r
    })
  }
  prepare(owner: string, id: string, revision: number) {
    return this.update(s => {
      const r = this.owned(s, owner, id), existing = r.messages.find(m => m.direction === 'outgoing' && (m.draftRevision === revision || (m.subject === r.draft.subject && m.body === r.draft.body && JSON.stringify([...(m.destinations ?? [m.destination])].sort()) === JSON.stringify(sendDestinations(r.draft).sort()) && JSON.stringify(m.attachments) === JSON.stringify(r.draft.attachments))))
      if (existing) return { request: r, message: existing, send: false }
      if (r.status !== 'open' || r.revision !== revision) throw new Error('Draft conflict or closed request')
      const d = r.draft, destinations = sendDestinations(d), destination = destinations[0]
      if (!destination) throw new Error('No supported email destination for every selected recipient')
      if (!hasReport(d) || !d.subject.trim() || !d.body.trim() || /\[[A-Z_ ][A-Z_ ]{2,}\]/.test(d.body)) throw new Error('Complete missing information before sending')
      if (r.messages.some(m => m.delivery === 'sending' || m.delivery === 'unknown')) throw new Error('Previous send outcome unknown; do not send again')
      if (r.messages.length >= 50) throw new Error('Conversation limit')
      const message: HelpMessage = { id: randomUUID(), subject: d.subject, body: d.body, attachments: structuredClone(d.attachments), ...(d.sources ? { sources: structuredClone(d.sources) } : {}), destination, destinations, at: this.clock(), delivery: 'sending', direction: 'outgoing', draftRevision: revision }
      r.original ??= structuredClone(d); r.messages.push(message); r.updatedAt = this.clock(); r.events.push({ id: randomUUID(), at: this.clock(), kind: 'sending' }); return { request: r, message, send: true }
    })
  }
  retry(owner: string, id: string, messageId: string) {
    return this.update(s => { const r = this.owned(s, owner, id), m = r.messages.find(m => m.id === messageId && m.direction === 'outgoing'); if (!m || !['unknown', 'sending'].includes(m.delivery) || this.clock() - m.at > 23 * 3600000) throw new Error('Send outcome unknown; contact support instead of resending'); if (this.clock() - r.updatedAt < 30000) throw new Error('Wait before checking send again'); r.updatedAt = this.clock(); return { request: r, message: m, send: true } })
  }
  accept(owner: string, id: string, messageId: string, providerId: string) { return this.update(s => { const r = this.owned(s, owner, id), m = r.messages.find(m => m.id === messageId)!; m.providerId = providerId; if (['sending', 'unknown'].includes(m.delivery)) m.delivery = 'sent'; r.updatedAt = this.clock(); r.events.push({ id: randomUUID(), at: this.clock(), kind: 'sent' }); return r }) }
  uncertain(owner: string, id: string, messageId: string) { return this.update(s => { const r = this.owned(s, owner, id), m = r.messages.find(m => m.id === messageId)!; if (m.delivery === 'sending') m.delivery = 'unknown'; return r }) }
  setStatus(owner: string, id: string, status: 'open' | 'closed') { return this.update(s => { const r = this.owned(s, owner, id); if (!['open', 'closed'].includes(status)) throw new Error('Invalid status'); if (r.status !== status) { r.status = status; r.updatedAt = this.clock(); r.events.push({ id: randomUUID(), at: this.clock(), kind: status }) }; return r }) }
  delivery(providerId: string, status: Delivery, eventId: string) { return this.update(s => { for (const r of s.requests) { const m = r.messages.find(m => m.providerId === providerId && m.direction === 'outgoing'); if (!m) continue; if (r.events.some(e => e.id === eventId)) return true; if (!['delivered', 'failed'].includes(status)) return false; if (m.delivery !== 'delivered') m.delivery = status; r.updatedAt = this.clock(); r.events.push({ id: eventId, at: this.clock(), kind: status }); return true } return false }) }
   incoming(token: string, sender: string, message: Pick<HelpMessage, 'id' | 'subject' | 'body' | 'unsupportedAttachments'>) { return this.update(s => { const r = s.requests.find(r => r.replyToken === token && r.messages.some(m => m.direction === 'outgoing' && (m.destinations ?? [m.destination]).some(address => address.toLowerCase() === sender.toLowerCase()))); if (!r || r.messages.some(m => m.id === message.id) || r.messages.length >= 50) return; r.messages.push({ ...message, attachments: [], destination: sender, at: this.clock(), delivery: 'delivered', direction: 'incoming', draftRevision: 0 }); r.updatedAt = this.clock() }) }
  remove(owner: string, id?: string) { return this.update(s => { s.requests = s.requests.filter(r => r.owner !== owner || (id !== undefined && r.id !== id)) }) }
}
