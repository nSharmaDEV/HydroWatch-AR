import type { Language, Notice, Place } from './domain'
import type { HelpDraft, HelpFact, HelpStep } from './help-requests'
import { advisoryFacts, advisorySources } from './help-facts'
import { reportMessage, requiredReportEvidence } from './recovery-evidence'
import { evidenceFacts } from './help-evidence'
import { isReportFactId } from './help-requests'

/** Six one-column screens, then review: wrong → noticed → where/when → request → your details → anything else → send it. */
export function helpPath(_d: HelpDraft): HelpStep[] {
  return ['choose', 'noticed', 'details', 'request', 'response', 'anything', 'send']
}
/** Number of numbered form screens; the review screen follows them. */
export const HELP_FORM_STEPS = 6
/** Billing/other reports have no inferred link to water-quality or service notices. */
export function relevantFacts(d: HelpDraft, sample = false): HelpFact[] {
  const required = new Set(requiredReportEvidence(d.place, sample).map(row => row.key))
  return (d.facts ?? []).flatMap(f => {
    if (required.has(f.id)) return [{ ...f, included: true }]
    // Automatic document context does not imply a connection to personal observations.
    if (!sample && f.kind === 'historical' && isReportFactId(f.id)) return [{ ...f, included: true }]
    if (d.issue === 'billing' || d.issue === 'other' || d.issue === 'legal') return []
    if (d.issue === 'service' && f.kind === 'historical') return []
    return [f]
  })
}
/** Screen titles, shared by Help and History. */
export const HELP_STEP_TITLES: Partial<Record<HelpStep, [string, string]>> = {
  choose: ['What’s wrong?', '¿Qué pasa?'],
  noticed: ['What you noticed', 'Lo que notaste'],
  details: ['Where and when', 'Dónde y cuándo'],
  request: ['Your request', 'Tu solicitud'],
  reportQuestions: ['Report questions', 'Preguntas del informe'],
  response: ['Your details', 'Tus datos'],
  anything: ['Anything else', 'Algo más'],
  send: ['Review and contact your provider', 'Revisar y contactar a tu proveedor'],
}
/** Large heading for each screen (the short names above label the progress header). */
export const HELP_STEP_HEADINGS: Partial<Record<HelpStep, [string, string]>> = {
  ...HELP_STEP_TITLES,
  noticed: ['What have you noticed?', '¿Qué has notado?'],
  request: ['What would you like them to do?', '¿Qué te gustaría que hicieran?'],
  reportQuestions: ['What would you like to know about the report?', '¿Qué te gustaría saber sobre el informe?'],
  anything: ['Anything they should know?', '¿Algo que deban saber?'],
}
/** "Step 3 of 6 · Where and when" for a draft's current screen; the review screen has no number. */
export function stepLabel(d: HelpDraft, language: 'en' | 'es') {
  const path = helpPath(d), step = helpStep(d), n = path.indexOf(step) + 1, title = HELP_STEP_TITLES[step]![language === 'es' ? 1 : 0]
  if (step === 'send') return title
  return language === 'es' ? `Paso ${n} de ${path.length - 1} · ${title}` : `Step ${n} of ${path.length - 1} · ${title}`
}
export function helpStep(d: HelpDraft): HelpStep {
  if (d.flowStep === 'reportQuestions') return 'request'
  // Earlier drafts resume on the screen that now holds the same answers.
  if (d.flowStep === 'experience') return 'choose'
  if (d.flowStep && ['billing', 'timing', 'where'].includes(d.flowStep)) return 'details'
  if (d.flowStep && ['review', 'confirm', 'records'].includes(d.flowStep)) return 'send'
  const fallback = d.stage >= 2 ? 'send' : 'choose'
  return d.flowStep && helpPath(d).includes(d.flowStep) ? d.flowStep : fallback
}
export function initialFacts(place: Place, notices: Notice[], current: boolean, sample: boolean, language: Language, selected?: string): HelpFact[] {
  const advisory = notices.flatMap(n => {
    const sources = advisorySources(place, [n])
    if (!sources.length) return []
    return (n.reason.split(/\n+/).filter(s => s.trim()).length ? n.reason.split(/\n+/).filter(s => s.trim()) : ['']).map((reason, i): HelpFact => ({
      id: `${n.id}:${i}`, text: advisoryFacts(place, [{ ...n, reason }], current, sample, language),
      kind: current && !n.lifted && n.liftStatus !== 'unknown' ? 'active' : 'saved', included: true, sources,
      record: { agency: n.agency, date: n.issued ?? '', problem: reason.trim(), area: n.area, status: n.lifted ? `Lift date recorded: ${n.lifted}` : n.liftStatus === 'unknown' ? 'Lift status unknown' : 'Notice listed; no lift date recorded', verified: current && n.liftStatus !== 'unknown' },
    }))
  })
  // One fact per distinct historical issue, from the same grouped evidence the
  // provider panel shows: an annual-report row and a federal record describing
  // the same requirement and period arrive as one finding, not two.
  const historical = evidenceFacts(place, sample, language)
  const ordered = [...advisory, ...historical]
  if (selected) ordered.sort((a, b) => Number(b.id === selected) - Number(a.id === selected))
  return boundedFacts(ordered)
}
function boundedFacts(facts: HelpFact[]): HelpFact[] {
  // Keep complete quotations, not silently truncated agency wording. Source pages
  // remain authoritative; previews are bounded by the existing draft limits.
  let used = 0, metadata = 0
  return facts.map(f => ({ ...f })).filter(f => {
    const size = f.text.length + 2
    const r = f.record
    const recordSize = r ? r.agency.length + r.date.length + r.problem.length + r.area.length + r.status.length + (r.evidence ? JSON.stringify(r.evidence).length : 0) : 0
    if (used + size > 16000) return false
    if (metadata + recordSize > 16000 || r && (r.problem.length > 8000 || [r.agency, r.date, r.area, r.status].some(v => v.length > 1000) || r.evidence && [r.evidence.period, r.evidence.action, r.evidence.resolution, r.evidence.conflicts].some(v => v.length > 2000))) {
      // An automated finding without its method would silently lose the disclosure.
      if (r?.sourceMethod) return false
      delete f.record
    }
    used += size
    metadata += f.record ? recordSize : 0
    return true
  }).slice(0, 60)
}

/** Preview a deliberate source-snapshot update, without touching the saved draft. */
export function updatedEvidenceFacts(d: HelpDraft, sample: boolean, language: Language) {
  const existing = d.facts ?? []
  if (sample || !d.facts) return { facts: existing, changed: 0 }
  const fresh = new Map(evidenceFacts(d.place, sample, language).map(f => [f.id, f]))
  const snapshot = (f: HelpFact) => JSON.stringify([f.text, f.record, f.sources.map(s => s.url)])
  const merged = existing.map(old => {
    const next = fresh.get(old.id)
    fresh.delete(old.id)
    // Losing a cache/source is not evidence that a documented outcome vanished.
    if (!next || old.record?.evidence?.federal && !next.record?.evidence?.federal) return old
    return snapshot(old) === snapshot(next) ? old : next
  })
  const facts = boundedFacts([...merged, ...fresh.values()])
  const previous = new Map(existing.map(f => [f.id, snapshot(f)]))
  return { facts, changed: facts.filter(f => previous.get(f.id) !== snapshot(f)).length }
}
/** Upgrade saved prose without replacing it with a newer notice or changing edited email. */
export function savedFacts(d: HelpDraft, sample: boolean, language: Language): HelpFact[] {
  const available = initialFacts(d.place, [], false, sample, language)
  const requiredFacts = available.filter(f => requiredReportEvidence(d.place, sample).some(row => row.key === f.id))
  // Append within storage bounds, preserving snapshots and manually edited email.
  const append = (existing: HelpFact[]) => {
    const present = new Set(existing.map(f => f.id))
    let size = existing.reduce((n, f) => n + f.text.length + 2, 0)
    let metadata = existing.reduce((n, f) => n + (f.record ? f.record.agency.length + f.record.date.length + f.record.problem.length + f.record.area.length + f.record.status.length : 0), 0)
    return [...existing, ...available.filter(f => {
      if (present.has(f.id) || present.size >= 60 || size + f.text.length + 2 > 16000) return false
      const r = f.record, recordSize = r ? r.agency.length + r.date.length + r.problem.length + r.area.length + r.status.length : 0
      if (metadata + recordSize > 16000) return false
      size += f.text.length + 2; metadata += recordSize; present.add(f.id)
      return true
    })].slice(0, 60)
  }
  const requiredById = new Map(requiredFacts.map(f => [f.id, f]))
  if (d.facts) {
    const existing = d.facts.map(f => {
      const required = requiredById.get(f.id)
      const saved = { ...f, ...(!sample && f.kind === 'historical' && isReportFactId(f.id) ? { included: true } : {}), ...(f.record ? { record: { ...f.record, verified: false } } : {}), ...(f.kind === 'active' ? { kind: 'saved' as const } : {}) }
      return required ? { ...required, ...saved, kind: 'historical' as const, included: true, text: saved.text.trim() ? saved.text : required.text, sources: saved.sources.length ? saved.sources : required.sources } : saved
    })
    // Existing facts are a saved snapshot, including an intentionally empty one.
    // Checking another document must not silently change that snapshot on resume.
    return existing
  }
  const requiredIds = new Set(requiredById.keys())
  const historical = reportMessage(d.place, sample, d.evidence.filter(id => !requiredIds.has(id)), language)
  return append([
    ...(d.context.trim() ? [{ id: 'saved-context', text: d.context, kind: 'saved' as const, included: true, sources: (d.sources ?? []).filter(s => !isReportFactId(s.recordId)) }] : []),
    ...(historical.context ? [{ id: 'saved-historical', text: historical.context, kind: 'historical' as const, included: true, sources: historical.sources }] : []),
    ...requiredFacts,
  ])
}
export function factPatch(facts: HelpFact[]): Pick<HelpDraft, 'facts' | 'context' | 'sources' | 'evidence'> {
  const included = facts.filter(f => f.included && f.text.trim())
  return { facts, context: included.map(f => f.text.trim()).join('\n\n'), sources: [...new Map(included.flatMap(f => f.sources).map(s => [`${s.recordId}:${s.url}`, s])).values()], evidence: [] }
}
