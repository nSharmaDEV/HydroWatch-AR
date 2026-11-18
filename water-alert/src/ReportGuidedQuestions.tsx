import type { Language } from './domain'
import type { HelpDraft } from './help-requests'
import { hasPersonalConcern, hasSelectedReport, reportQuestions } from './report-questions'
import { Icon, type IconName } from './icons'

export function ReportGuidedQuestions({ draft, language, edit }: { draft: HelpDraft; language: Language; edit: (patch: Partial<HelpDraft>) => void }) {
  if (!hasSelectedReport(draft)) return null
  const es = language === 'es', selected = draft.wording?.response ?? {}
  const icons: Record<string, IconName> = { reportVerify: 'file-text', reportAddressed: 'circle-check', reportRelationship: 'info', reportInformation: 'search', reportNext: 'arrow-right' }
  const labels: Record<string, [string, string]> = { reportVerify: ['Verify & share records', 'Verificar y compartir registros'], reportAddressed: ['Has it been addressed?', '¿Se ha atendido?'], reportRelationship: ['Could it relate to my concern?', '¿Podría relacionarse con mi inquietud?'], reportInformation: ['What information would help?', '¿Qué información ayudaría?'], reportNext: ['What should I do next?', '¿Qué debo hacer ahora?'] }
  return <fieldset className="request-wording"><legend className="sr-only">{es ? 'Preguntas sobre el informe (opcional)' : 'Questions about the report (optional)'}</legend>
    <div className="request-wording-grid">{reportQuestions.filter(([key]) => key !== 'reportRelationship' || hasPersonalConcern(draft)).map(([key, en, spanish], index, rows) => <div key={key} className={`request-wording-choice${rows.length % 2 && index === rows.length - 1 ? ' is-other' : ''}${selected[key] ? ' is-selected' : ''}`}><label className="checkbox-row"><input type="checkbox" aria-label={`${labels[key][es ? 1 : 0]} — ${es ? spanish : en}`} checked={!!selected[key]} onChange={event => { const response = { ...selected }; if (event.target.checked) response[key] = es ? spanish : en; else if (key === 'reportVerify') response[key] = ''; else delete response[key]; edit({ wording: { report: draft.wording?.report ?? {}, response } }) }} /><Icon className="wording-icon" name={icons[key]} size={24} /><span className="wording-label">{labels[key][es ? 1 : 0]}</span>{selected[key] ? <span className="wording-selected-mark" aria-hidden="true"><Icon name="circle-check" size={20} /></span> : null}</label></div>)}</div>
  </fieldset>
}
