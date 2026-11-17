import type { Language } from './domain'
import type { HelpRequest } from './help-requests'
import { requestStages, type StageState } from './history-view'

const STATE_TEXT: Record<StageState, [string, string]> = {
  done: ['done', 'completado'], current: ['next step', 'siguiente paso'], due: ['suggested now', 'sugerido ahora'], attention: ['needs attention', 'necesita atención'], todo: ['not yet', 'pendiente'],
}

/** Prepared → Contacted → Follow up → Closed: what the resident did and recorded, never the utility's own process. */
export function ProgressTracker({ request, language, compact = false }: { request: HelpRequest; language: Language; compact?: boolean }) {
  const es = language === 'es'
  return <ol className={`history-stepper${compact ? ' history-stepper--compact' : ''}`} aria-label={es ? 'Tu progreso' : 'Your progress'}>
    {requestStages(request, language).map(step => <li key={step.key} className={`history-step is-${step.state}`}>
      <span className="history-step-dot" aria-hidden="true" />
      <b className="history-step-label">{step.label}<span className="sr-only"> ({STATE_TEXT[step.state][es ? 1 : 0]})</span></b>
      <span className="history-step-detail">{step.detail === '—' ? <><span aria-hidden="true">—</span><span className="sr-only">{es ? 'sin fecha' : 'no date yet'}</span></> : step.detail}</span>
    </li>)}
  </ol>
}
