import { isReportFactId, type HelpDraft } from './help-requests'

export function hasPersonalConcern(draft: HelpDraft) {
  return Object.values(draft.wording?.report ?? {}).some(value => value.trim()) || draft.issue !== 'report' && !!draft.description.trim()
}

export function hasSelectedReport(draft: HelpDraft) {
  return (draft.facts ?? []).some(f => f.kind === 'historical' && f.included && isReportFactId(f.id))
}

export const reportQuestions = [
  ['reportVerify', 'Verify this reading of the report and share supporting records', 'Verificar esta lectura del informe y compartir los documentos de respaldo'],
  ['reportAddressed', 'Explain whether the finding has been addressed', 'Explicar si se ha atendido el hallazgo'],
  ['reportRelationship', 'Explain whether it could relate to my concern', 'Explicar si podría relacionarse con mi inquietud'],
  ['reportInformation', 'Tell me what information is needed to investigate', 'Decirme qué información se necesita para investigar'],
  ['reportNext', 'Explain what I should do next', 'Explicar qué debo hacer ahora'],
] as const
