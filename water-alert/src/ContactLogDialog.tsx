import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './icons'
import type { Language } from './domain'
import type { HelpOutcomeKind } from './help-requests'
import { addBusinessDays, FOLLOW_UP_BUSINESS_DAYS, localDate } from './help-outcomes'
import { supplierDisplayName } from './help-format'
import { reviewLabel } from './review-labels'

export interface ContactLogEntry { kind: HelpOutcomeKind; on: string; reference: string; note: string; followUpOn: string }
interface Props { name: string; language: Language; onCancel: () => void; onSave: (entry: ContactLogEntry) => void }

/** Resident-reported contact attempt, shown as a native modal over Review. WAVE records only what is entered here. */
export function ContactLogDialog({ name, language, onCancel, onSave }: Props) {
  const say = (en: string, es: string) => language === 'es' ? es : en
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), firstField = useRef<HTMLInputElement>(null)
  const [on, setOn] = useState(localDate()), [method, setMethod] = useState<HelpOutcomeKind>('emailed')
  const [reference, setReference] = useState(''), [note, setNote] = useState('')
  const [followOn, setFollowOn] = useState(addBusinessDays(localDate(), FOLLOW_UP_BUSINESS_DAYS)), [followEdited, setFollowEdited] = useState(false)
  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
    firstField.current?.focus()
    return () => { if (d?.open) d.close() }
  }, [])
  const invalid = !on || on > localDate()
  const save = (kind: HelpOutcomeKind) => { if (!invalid) onSave({ kind, on, reference, note, followUpOn: followOn }) }
  return <dialog ref={dialog} className="contact-log-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`}
    onCancel={e => { e.preventDefault(); onCancel() }}
    onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() } }}>
    <form className="contact-log-form" onSubmit={e => { e.preventDefault(); save(method) }}>
      <header className="contact-log-head">
        <div><h2 id={`${id}-title`}>{reviewLabel('logContact', language)}</h2><p className="contact-log-supplier">{supplierDisplayName(name)}</p></div>
        <button type="button" className="contact-log-close" aria-label={say('Close', 'Cerrar')} onClick={onCancel}><Icon name="x" size={22} /></button>
      </header>
      <p id={`${id}-note`} className="contact-log-note">{say('WAVE only records what you tell it; it cannot see your email, calls, or form submissions.', 'WAVE solo guarda lo que le indicas; no puede ver tus correos, llamadas ni envíos de formularios.')}</p>
      <div className="contact-log-grid">
        <div className="contact-log-field"><label htmlFor={`${id}-on`}>{say('Contact date', 'Fecha de contacto')}</label><input id={`${id}-on`} ref={firstField} type="date" value={on} max={localDate()} required onChange={e => { const value = e.target.value; setOn(value); if (!followEdited) setFollowOn(value ? addBusinessDays(value, FOLLOW_UP_BUSINESS_DAYS) : '') }} /></div>
        <div className="contact-log-field"><label htmlFor={`${id}-how`}>{say('How did you try?', '¿Cómo lo intentaste?')}</label><select id={`${id}-how`} value={method} onChange={e => setMethod(e.target.value as HelpOutcomeKind)}><option value="emailed">{say('Email or message', 'Correo o mensaje')}</option><option value="called">{say('Phone call', 'Llamada')}</option><option value="form">{say('Online form', 'Formulario en línea')}</option></select></div>
        <div className="contact-log-field"><label htmlFor={`${id}-ref`}>{say('Reference or ticket number', 'Número de referencia o caso')}</label><input id={`${id}-ref`} value={reference} maxLength={100} placeholder={say('e.g., case #12345', 'p. ej., caso n.º 12345')} onChange={e => setReference(e.target.value)} /></div>
        <div className="contact-log-field"><label htmlFor={`${id}-follow`}>{say('When should you follow up?', '¿Cuándo debes dar seguimiento?')}</label><input id={`${id}-follow`} type="date" value={followOn} onChange={e => { setFollowEdited(true); setFollowOn(e.target.value) }} /></div>
        <div className="contact-log-field contact-log-wide"><label htmlFor={`${id}-told`}>{say('What did they tell you? (optional)', '¿Qué te dijeron? (opcional)')}</label><textarea id={`${id}-told`} rows={2} maxLength={500} value={note} placeholder={say('e.g., They said a crew would investigate tomorrow.', 'p. ej., Dijeron que un equipo investigaría mañana.')} onChange={e => setNote(e.target.value)} /></div>
      </div>
      <div className="contact-log-actions">
        <button type="button" className="secondary contact-log-unreachable" disabled={invalid} onClick={() => save('unreachable')}><Icon name="triangle-alert" size={18} />{say('Couldn’t reach them', 'No pude comunicarme')}</button>
        <button type="button" className="secondary" onClick={onCancel}><Icon name="x" size={18} />{say('Cancel', 'Cancelar')}</button>
        <button type="submit" className="primary" disabled={invalid}><Icon name="check" size={18} />{say('Save', 'Guardar')}</button>
      </div>
    </form>
  </dialog>
}
