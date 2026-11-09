import { useState, type ReactNode } from 'react'
import type { HelpDraft } from './help-requests'

const reports = {
  service: [['No water', 'No hay agua'], ['Lower pressure than usual', 'Menos presión de lo habitual'], ['Service keeps stopping', 'El servicio se interrumpe repetidamente']],
  billing: [['A charge I do not recognize', 'Un cargo que no reconozco'], ['A charge appears more than once', 'Un cargo aparece más de una vez'], ['The amount differs from what I expected', 'El importe difiere de lo esperado']],
  quality: [['An unusual color', 'Un color inusual'], ['An unusual smell', 'Un olor inusual'], ['Particles in the water', 'Partículas en el agua']],
  advisory: [['My usual water use is affected', 'Mi uso habitual del agua se ve afectado'], ['I am unsure whether the advisory covers my location', 'No sé si el aviso incluye mi ubicación']],
  other: [], legal: [], report: [],
}
const requests = {
  service: [['Restore service', 'Restablecer el servicio'], ['Share an update', 'Compartir una actualización'], ['Explain what is happening', 'Explicar qué está pasando']],
  billing: [['Review the charge', 'Revisar el cargo'], ['Explain the bill', 'Explicar la factura'], ['Explain available next steps', 'Explicar los próximos pasos disponibles']],
  quality: [['Investigate the reported concern', 'Investigar la inquietud reportada'], ['Clarify applicable water-use instructions', 'Aclarar las instrucciones aplicables de uso del agua'], ['Share an update', 'Compartir una actualización']],
  advisory: [['Clarify the instructions', 'Aclarar las instrucciones'], ['Share an update', 'Compartir una actualización'], ['Explain where the advisory applies', 'Explicar dónde se aplica el aviso']],
  other: [['Explain the next step', 'Explicar el próximo paso']],
  legal: [['Explain available help options', 'Explicar opciones de ayuda disponibles']],
  report: [['Tell me whether this has been resolved', 'Decirme si esto ya se resolvió'], ['Send me a copy of any notice about it', 'Enviarme una copia de cualquier aviso al respecto']],
}
/** The usual requests, ticked on first entering context and action. Observations are never preselected. */
export function defaultRequests(issue: keyof typeof requests, language: 'en' | 'es'): Record<string, string> {
  const keys = ['first', 'second'], i = language === 'es' ? 1 : 0
  return Object.fromEntries(requests[issue].slice(0, issue === 'quality' ? 1 : 2).map(([en, es], n) => [keys[n], [en, es][i]]))
}
/** Only checked, editable wording enters generated prose. */
export function ConfirmedWording({ draft, section, es, edit, prefix = '', editable = true, extra }: { draft: HelpDraft; section: 'report' | 'response'; es: boolean; edit: (patch: Partial<HelpDraft>) => void; prefix?: string; editable?: boolean; extra?: ReactNode }) {
  const [editing, setEditing] = useState<string | null>(null)
  const options = [...(section === 'report' ? reports : requests)[draft.issue], ['Something else', 'Otra cosa']]
  const selected = draft.wording?.[section] ?? {}
  function change(key: string, value?: string) {
    const next = { ...selected }
    if (value === undefined) delete next[key]; else next[key] = value
    edit({ wording: { report: draft.wording?.report ?? {}, response: draft.wording?.response ?? {}, [section]: next } })
  }
  return <fieldset className="request-wording"><legend className="sr-only">{section === 'report' ? es ? '¿Qué observaste? Selecciona solo lo que corresponda.' : 'What did you observe? Select only what applies.' : es ? '¿Qué te gustaría que hicieran? (opcional)' : 'What would you like them to do? (optional)'}</legend><div className="request-wording-grid">{options.map(([en, spanish], index) => {
    const base = index === options.length - 1 ? 'other' : ['first', 'second', 'third'][index], key = `${prefix}${base}`, label = es ? spanish : en, checked = Object.hasOwn(selected, key)
    return <div className={`request-wording-choice${checked ? ' is-selected' : ''}`} key={key}><label className="checkbox-row"><input type="checkbox" checked={checked} onChange={e => { change(key, e.target.checked ? base === 'other' ? '' : selected[key] ?? label : undefined); if (e.target.checked && base === 'other') setEditing(key) }} /><span>{checked && selected[key] ? selected[key] : label}</span></label>{checked && (editable || base === 'other') ? <button className="text-button request-edit-wording" aria-label={`${es ? 'Editar texto' : 'Edit wording'}: ${label}`} onClick={() => setEditing(editing === key ? null : key)}>{editing === key ? es ? 'Listo' : 'Done' : es ? 'Editar texto' : 'Edit wording'}</button> : null}{checked && editing === key ? <input aria-label={`${es ? 'Editar' : 'Edit'} ${section === 'report' ? es ? 'reporte' : 'report' : es ? 'solicitud' : 'request'}: ${label}`} value={selected[key]} maxLength={1000} onChange={e => change(key, e.target.value)} /> : null}</div>
  })}{extra}</div></fieldset>
}
