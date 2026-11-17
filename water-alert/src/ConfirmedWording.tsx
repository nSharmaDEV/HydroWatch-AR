import { useState, type ReactNode } from 'react'
import type { HelpDraft } from './help-requests'
import { LOW_PRESSURE_REQUEST } from './help-outputs'
import { Icon, type IconName } from './icons'

const reports = {
  service: [['No water', 'No hay agua'], ['Lower pressure than usual', 'Menos presión de lo habitual'], ['Service keeps stopping', 'El servicio se interrumpe repetidamente']],
  billing: [['A charge I do not recognize', 'Un cargo que no reconozco'], ['A charge appears more than once', 'Un cargo aparece más de una vez'], ['The amount differs from what I expected', 'El importe difiere de lo esperado']],
  quality: [['An unusual color', 'Un color inusual'], ['An unusual smell', 'Un olor inusual'], ['Particles in the water', 'Partículas en el agua']],
  advisory: [['My usual water use is affected', 'Mi uso habitual del agua se ve afectado'], ['I am unsure whether the advisory covers my location', 'No sé si el aviso incluye mi ubicación']],
  other: [], legal: [], report: [],
}
const requests = {
  service: [['Restore service', 'Restablecer el servicio'], ['Share an update', 'Compartir una actualización'], ['Explain what is happening', 'Explicar qué está pasando'], LOW_PRESSURE_REQUEST as unknown as [string, string]],
  billing: [['Review the charge', 'Revisar el cargo'], ['Explain the bill', 'Explicar la factura'], ['Explain available next steps', 'Explicar los próximos pasos disponibles']],
  quality: [['Investigate the reported concern', 'Investigar la inquietud reportada'], ['Clarify applicable water-use instructions', 'Aclarar las instrucciones aplicables de uso del agua'], ['Share an update', 'Compartir una actualización']],
  advisory: [['Clarify the instructions', 'Aclarar las instrucciones'], ['Share an update', 'Compartir una actualización'], ['Explain where the advisory applies', 'Explicar dónde se aplica el aviso']],
  other: [['Explain the next step', 'Explicar el próximo paso']],
  legal: [['Explain available help options', 'Explicar opciones de ayuda disponibles']],
  report: [['Tell me whether this has been resolved', 'Decirme si esto ya se resolvió'], ['Send me a copy of any notice about it', 'Enviarme una copia de cualquier aviso al respecto']],
}
/** The usual requests, ticked on first entering context and action. Observations are never preselected. */
export function defaultRequests(issue: keyof typeof requests, language: 'en' | 'es', observations: string[] = []): Record<string, string> {
  const keys = ['first', 'second'], i = language === 'es' ? 1 : 0
  const lowPressure = observations.filter(o => ['Lower pressure than usual', 'Menos presión de lo habitual'].includes(o))
  // Low pressure alone gets one plain request; mixed reports retain the usual service requests too.
  if (issue === 'service' && lowPressure.length === observations.length && lowPressure.length) return { fourth: LOW_PRESSURE_REQUEST[i] }
  const defaults = Object.fromEntries(requests[issue].slice(0, issue === 'quality' ? 1 : 2).map(([en, es], n) => [keys[n], [en, es][i]]))
  return issue === 'service' && lowPressure.length ? { ...defaults, fourth: LOW_PRESSURE_REQUEST[i] } : defaults
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
  return <fieldset className="request-wording"><legend className="sr-only">{section === 'report' ? es ? '¿Qué observaste? Selecciona solo lo que corresponda.' : 'What did you observe? Select only what applies.' : es ? '¿Qué te gustaría que hicieran? (opcional)' : 'What would you like them to do? (optional)'}</legend>{section === 'response' && draft.issue === 'advisory' && Object.values(draft.wording?.report ?? {}).some(v => ['I am unsure whether the advisory covers my location', 'No sé si el aviso incluye mi ubicación'].includes(v)) ? <p role="note">{es ? 'Si deseas preguntar dónde se aplica el aviso, puedes seleccionar esa solicitud abajo.' : 'If you want to ask where the advisory applies, you can select that request below.'}</p> : null}{section === 'response' && draft.answers?.ongoing === 'No' && Object.values(selected).some(v => ['Restore service', 'Restablecer el servicio'].includes(v)) ? <p role="note">{es ? 'Indicó que el problema ya terminó. Revise si todavía desea solicitar el restablecimiento del servicio.' : 'You indicated the issue has ended. Check whether you still want to request restoration of service.'}</p> : null}<div className="request-wording-grid">{options.map(([en, spanish], index) => {
    const base = index === options.length - 1 ? 'other' : ['first', 'second', 'third', 'fourth'][index], key = `${prefix}${base}`, label = es ? spanish : en, checked = Object.hasOwn(selected, key)
    const icons: IconName[] = section === 'report' ? ['water', 'gauge', 'refresh-cw', 'info'] : ['wrench', 'mail', 'info', 'gauge']
    return <div className={`request-wording-choice${base === 'other' && options.length + (extra ? 1 : 0) !== 4 ? ' is-other' : ''}${checked ? ' is-selected' : ''}`} key={key}><label className="checkbox-row"><input type="checkbox" checked={checked} onChange={e => { change(key, e.target.checked ? base === 'other' ? '' : selected[key] ?? label : undefined); if (editable && e.target.checked && base === 'other') setEditing(key) }} /><Icon className="wording-icon" name={base === 'other' ? 'ellipsis' : icons[index]} size={24} /><span className="wording-label">{checked && selected[key] && (editable || base !== 'other') ? selected[key] : label}</span>{checked ? <span className="wording-selected-mark" aria-hidden="true"><Icon name="circle-check" size={20} /></span> : null}</label>{checked && editable ? <button className="action-chip request-edit-wording" aria-label={`${es ? 'Editar texto' : 'Edit wording'}: ${label}`} onClick={() => setEditing(editing === key ? null : key)}><Icon name={editing === key ? 'check' : 'edit'} size={16} />{editing === key ? es ? 'Listo' : 'Done' : es ? 'Editar texto' : 'Edit wording'}</button> : null}{checked && editable && editing === key ? <input aria-label={`${es ? 'Editar' : 'Edit'} ${section === 'report' ? es ? 'reporte' : 'report' : es ? 'solicitud' : 'request'}: ${label}`} value={selected[key]} maxLength={1000} onChange={e => change(key, e.target.value)} /> : null}</div>
  })}{extra}</div></fieldset>
}
