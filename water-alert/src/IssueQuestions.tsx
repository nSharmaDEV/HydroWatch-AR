import { useId } from 'react'
import type { HelpDraft } from './help-requests'
import { QUESTIONS, questionKeys } from './help-questions'

const calendarDate = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
const startDate = (draft: HelpDraft) => draft.issue === 'quality' || draft.issue === 'advisory' ? draft.answers?.noticed : draft.answers?.began
export function invalidHelpDateRange(draft: HelpDraft) {
  const a = draft.answers ?? {}
  const start = startDate(draft)
  return a.ongoing === 'No' && calendarDate(start) && calendarDate(a.ended) && a.ended! < start!
}

export function IssueQuestions({ draft, es, onChange, section }: { draft: HelpDraft; es: boolean; onChange: (patch: Partial<HelpDraft>) => void; section: 'details' | 'experience' }) {
  const hint = useId(), error = useId(), invalid = invalidHelpDateRange(draft)
  const keys = (draft.issue === 'billing' && section === 'details' ? ['began', 'ongoing', 'ended'] as const : questionKeys(draft.issue)).filter(key => key !== 'area' && (key === 'tried' || key === 'response') === (section === 'experience'))
  function answer(key: keyof typeof QUESTIONS, value: string) {
    onChange({ answers: { ...draft.answers, [key]: value, ...(key === 'ongoing' && value !== 'No' ? { ended: '' } : {}) } })
  }
  return keys.length ? <div className={`request-question-grid request-questions-${section}`}>
    {keys.map(key => {
      const date = ['began', 'ended', 'noticed'].includes(key), value = draft.answers?.[key] ?? ''
      return <label key={key}>{QUESTIONS[key][es ? 1 : 0]}{key === 'ongoing' ? <select value={value} onChange={e => answer(key, e.target.value)}>
        <option value="">{es ? 'No especificado' : 'Not specified'}</option><option value="Yes">{es ? 'Sí' : 'Yes'}</option><option value="No">No</option><option value="Not sure">{es ? 'No sé' : 'Not sure'}</option>
      </select> : key === 'tried' || key === 'response' ? <textarea rows={2} value={value} maxLength={1000} onChange={e => answer(key, e.target.value)} /> : <>
        <input type={date ? 'date' : 'text'} min={key === 'ended' && calendarDate(startDate(draft)) ? startDate(draft) : undefined} value={date && !calendarDate(value) ? '' : value} maxLength={date ? undefined : 1000} aria-invalid={key === 'ended' && invalid ? true : undefined} aria-describedby={date ? `${hint}${key === 'ended' && invalid ? ` ${error}` : ''}` : undefined} onChange={e => answer(key, e.target.value)} aria-label={QUESTIONS[key][es ? 1 : 0]} />
        {date && value && !calendarDate(value) ? <small>{es ? 'Respuesta guardada' : 'Saved answer'}: {value}</small> : null}
      </>}</label>
    })}
    {keys.some(key => ['began', 'ended', 'noticed'].includes(key)) ? <p id={hint} className="quiet-note request-date-hint">{es ? 'Fechas opcionales: usa el calendario o el formato de fecha de tu navegador. Deja en blanco lo desconocido.' : 'Dates are optional: use the calendar or your browser’s date format. Leave unknown dates blank.'}</p> : null}
    {section === 'details' && invalid ? <p id={error} className="request-date-error" role="alert">{es ? 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.' : 'The end date must be on or after the start date.'}</p> : null}
  </div> : null
}
