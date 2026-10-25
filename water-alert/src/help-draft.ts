import type { Language } from './domain'
import type { HelpDraft, IssueType } from './help-requests'
import { generateMessage, recommendedRoute } from './help-requests'
import { answerFingerprint } from './help-outputs'

/** A different concern starts a fresh account; locations and supplied identity remain useful. */
export function categoryPatch(d: HelpDraft, issue: IssueType): Partial<HelpDraft> {
  if (d.issue === issue) return {}
  const route = recommendedRoute(issue)
  return { issue, route, recipientRoutes: [route], answers: d.answers?.area ? { area: d.answers.area } : {}, description: '', dates: '', wording: { report: {}, response: {} } }
}

/** Legacy saved email is treated as resident-edited, never guessed safe to replace. */
export function updateDraft(previous: HelpDraft, patch: Partial<HelpDraft>, language: Language): HelpDraft {
  const next = { ...previous, ...patch }
  const regenerated = patch.generatedFrom !== undefined
  next.subjectEdited = regenerated ? false : patch.subject !== undefined ? true : previous.subjectEdited ?? !!previous.subject
  next.bodyEdited = regenerated ? false : patch.body !== undefined ? true : previous.bodyEdited ?? !!previous.body
  if (regenerated) return next
  const changed = answerFingerprint(previous) !== answerFingerprint(next)
  if ((changed && (previous.body || previous.subject)) || (!next.body && next.flowStep === 'review' && !next.bodyEdited)) {
    const generated = generateMessage(next, language)
    if (!next.subjectEdited) next.subject = generated.subject
    if (!next.bodyEdited) next.body = generated.body
    if (!next.subjectEdited && !next.bodyEdited) next.generatedFrom = answerFingerprint(next)
    else next.generatedFrom ??= answerFingerprint(previous)
  }
  return next
}
