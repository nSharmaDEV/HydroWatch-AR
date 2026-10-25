import { useState, type RefObject } from 'react'
export function RequestPrompts({ es, response, target }: { es: boolean; response?: boolean; target: RefObject<HTMLTextAreaElement | null> }) {
  const [hint, setHint] = useState('')
  const prompts = response ? [['Ask when to expect an update', 'Pregunta cuándo esperar una actualización', 'Describe the update you would like and ask about timing, without assuming a deadline.', 'Describe la actualización que deseas y pregunta cuándo, sin suponer un plazo.'], ['Ask how to report it if it happens again', 'Pregunta cómo reportarlo si ocurre de nuevo', 'Ask for a reporting channel without claiming this has happened before.', 'Pregunta cómo reportarlo sin afirmar que ya ocurrió antes.']] : [
    ['Describe how often it happens', 'Describe con qué frecuencia ocurre', 'If you know, describe how often you personally observed the issue.', 'Si lo sabes, describe con qué frecuencia observaste el problema.'],
    ['Explain what changed in your usual water use', 'Explica qué cambió en tu uso habitual del agua', 'Describe what changed from your usual experience. Leave unknown causes out.', 'Describe qué cambió de tu experiencia habitual. Omite causas desconocidas.'],
    ['Identify which location it affects', 'Identifica qué lugar afecta', 'Clarify a location only if your observation differs between the places you selected.', 'Aclara el lugar solo si tu observación difiere entre los lugares seleccionados.'],
  ]
  return <div className="request-writing-prompts"><div className="request-actions">{prompts.map(([en, spanish, help, ayuda]) => <button key={en} className="text-button" onClick={() => { setHint(es ? ayuda : help); target.current?.focus() }}>{es ? spanish : en}</button>)}</div>{hint ? <p role="status" className="quiet-note">{hint}</p> : null}</div>
}
