import type { Language, Notice, Place } from './domain'
import type { HelpDraft, HelpFact, HelpStep } from './help-requests'
import { advisoryFacts, advisorySources } from './help-facts'
import { reportEvidence, reportMessage, requiredReportEvidence } from './recovery-evidence'

export function helpPath(d: HelpDraft): HelpStep[] {
  return ['choose', 'timing', 'experience', 'response', 'review']
}
/** Billing/other reports have no inferred link to water-quality or service notices. */
export function relevantFacts(d: HelpDraft, sample = false): HelpFact[] {
  const required = new Set(requiredReportEvidence(d.place, sample).map(row => row.key))
  return (d.facts ?? []).flatMap(f => {
    if (required.has(f.id)) return [{ ...f, included: true }]
    if (d.issue === 'billing' || d.issue === 'other' || d.issue === 'legal') return []
    if (d.issue === 'service' && f.kind === 'historical') return []
    return [f]
  })
}
export function helpStep(d: HelpDraft): HelpStep {
  if (d.flowStep === 'billing') return 'experience'
  if (d.flowStep === 'confirm' || d.flowStep === 'records') return 'review'
  const fallback = d.stage >= 2 ? 'review' : 'choose'
  return d.flowStep && helpPath(d).includes(d.flowStep) ? d.flowStep : fallback
}
export function initialFacts(place: Place, notices: Notice[], current: boolean, sample: boolean, language: Language): HelpFact[] {
  const advisory = notices.flatMap(n => {
    const sources = advisorySources(place, [n])
    if (!sources.length) return []
    return (n.reason.split(/\n+/).filter(s => s.trim()).length ? n.reason.split(/\n+/).filter(s => s.trim()) : ['']).map((reason, i): HelpFact => ({
      id: `${n.id}:${i}`, text: advisoryFacts(place, [{ ...n, reason }], current, sample, language),
      kind: current && !n.lifted && n.liftStatus !== 'unknown' ? 'active' : 'saved', included: true, sources,
      record: { agency: n.agency, date: n.issued ?? '', problem: reason.trim(), area: n.area, status: n.lifted ? `Lift date recorded: ${n.lifted}` : n.liftStatus === 'unknown' ? 'Lift status unknown' : 'Notice listed; no lift date recorded', verified: current && n.liftStatus !== 'unknown' },
    }))
  })
  const required = new Set(requiredReportEvidence(place, sample).map(row => row.key))
  const historical = reportEvidence(place, sample).map(({ key, report, issue }): HelpFact => {
    const value = reportMessage(place, sample, [key], language)
    return { id: key, kind: 'historical', text: value.context, included: required.has(key), sources: value.sources, record: { agency: 'Annual water-quality report', date: issue.reportedFrom ?? '', year: String(report.year), problem: issue.title[language], area: '', status: issue.currentAsPrinted ? '“Current” as printed in the historical report; not current status' : issue.reportedThrough ? `Reported through ${issue.reportedThrough}` : 'End date not recorded', verified: false } }
  })
  // Keep complete quotations, not silently truncated agency wording. Source pages
  // remain authoritative; previews are bounded by the existing draft limits.
  let used = 0, metadata = 0
  return [...advisory, ...historical].filter(f => {
    const size = f.text.length + 2
    const r = f.record
    const recordSize = r ? r.agency.length + r.date.length + r.problem.length + r.area.length + r.status.length : 0
    if (used + size > 16000) return false
    if (metadata + recordSize > 16000 || r && (r.problem.length > 8000 || [r.agency, r.date, r.area, r.status].some(v => v.length > 1000))) delete f.record
    used += size
    metadata += f.record ? recordSize : 0
    return true
  }).slice(0, 60)
}
/** Upgrade saved prose without replacing it with a newer notice or changing edited email. */
export function savedFacts(d: HelpDraft, sample: boolean, language: Language): HelpFact[] {
  const requiredFacts = initialFacts(d.place, [], false, sample, language).filter(f => requiredReportEvidence(d.place, sample).some(row => row.key === f.id))
  const requiredById = new Map(requiredFacts.map(f => [f.id, f]))
  if (d.facts) {
    const existing = d.facts.map(f => {
      const required = requiredById.get(f.id)
      const saved = { ...f, ...(f.record ? { record: { ...f.record, verified: false } } : {}), ...(f.kind === 'active' ? { kind: 'saved' as const } : {}) }
      return required ? { ...required, ...saved, kind: 'historical' as const, included: true, text: saved.text.trim() ? saved.text : required.text, sources: saved.sources.length ? saved.sources : required.sources } : saved
    })
    const present = new Set(existing.map(f => f.id))
    return [...existing, ...requiredFacts.filter(f => !present.has(f.id))]
  }
  const requiredIds = new Set(requiredById.keys())
  const historical = reportMessage(d.place, sample, d.evidence.filter(id => !requiredIds.has(id)), language)
  return [
    ...(d.context.trim() ? [{ id: 'saved-context', text: d.context, kind: 'saved' as const, included: true, sources: (d.sources ?? []).filter(s => !/^\d{4}:\d+$/.test(s.recordId)) }] : []),
    ...(historical.context ? [{ id: 'saved-historical', text: historical.context, kind: 'historical' as const, included: true, sources: historical.sources }] : []),
    ...requiredFacts,
  ]
}
export function factPatch(facts: HelpFact[]): Pick<HelpDraft, 'facts' | 'context' | 'sources' | 'evidence'> {
  const included = facts.filter(f => f.included && f.text.trim())
  return { facts, context: included.map(f => f.text.trim()).join('\n\n'), sources: [...new Map(included.flatMap(f => f.sources).map(s => [`${s.recordId}:${s.url}`, s])).values()], evidence: [] }
}
