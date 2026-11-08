import { useState } from 'react'
import { Icon } from './icons'
import type { Language } from './domain'
import type { HelpDraft, HelpOutcomeKind } from './help-requests'
import { callScript, mailtoUrl, sendOptions, type SendOption } from './send-options'
import { readableDate } from './help-format'
import { contacted, outcomeLabel, recordOutcome } from './help-outcomes'

interface Props { draft: HelpDraft; language: Language; sample: boolean; blocked: boolean; copy: () => Promise<boolean>; record?: (patch: Pick<HelpDraft, 'outcomes' | 'followUpOn'>) => void }

/** Resident-initiated handoffs only: an email app, a phone call or an official form. */
export function SendOptions({ draft, language, sample, blocked, copy, record }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const { primary, next } = sendOptions(draft)
  const last = contacted(draft)
  const [status, setStatus] = useState('')
  const [asked, setAsked] = useState<{ o: SendOption; kind: HelpOutcomeKind } | null>(null)
  const [reference, setReference] = useState('')
  const ask = (o: SendOption, kind: HelpOutcomeKind) => { if (record && !sample) { setAsked({ o, kind }); setReference('') } }
  function answer(kind: HelpOutcomeKind | null) {
    if (!asked || !record) return
    if (kind) {
      const patch = recordOutcome(draft, kind, asked.o.route, asked.o.name, { reference })
      record(patch)
      setStatus(kind === 'unreachable'
        ? say(`Recorded that you couldn’t reach ${asked.o.name}. Try another option below.`, `Se registró que no pudiste comunicarte con ${asked.o.name}. Prueba otra opción.`)
        : say(`Recorded. History will show a follow-up reminder on ${readableDate(patch.followUpOn, language)} if you haven’t recorded a reply.`, `Registrado. Historial mostrará un recordatorio el ${readableDate(patch.followUpOn, language)} si no has registrado una respuesta.`))
    } else setStatus(say('Nothing recorded. Your draft is saved.', 'No se registró nada. Tu borrador está guardado.'))
    setAsked(null)
  }
  async function openForm(o: SendOption) {
    ask(o, 'form')
    const copied = await copy()
    setStatus(copied ? say(`Message copied. Paste it into the ${o.name} form. Nothing was submitted.`, `Mensaje copiado. Pégalo en el formulario de ${o.name}. No se envió nada.`) : say('Copy unavailable. Select the message text before opening the form.', 'No se pudo copiar. Selecciona el texto del mensaje antes de abrir el formulario.'))
    window.open?.(o.formUrl, '_blank', 'noopener,noreferrer')
  }
  const source = (o: SendOption) => {
    const s = o.emailSource
    const label = (src: 'ADH' | 'EPA') => src === 'ADH' ? say('ADH directory', 'directorio de ADH') : say('EPA water-system record', 'registro federal de la EPA')
    return <p className="quiet-note send-option-source">
      {o.sourceUrl && (o.dial || o.route !== 'provider') ? <>{say('Phone', 'Teléfono')}: <a href={o.sourceUrl} target="_blank" rel="noreferrer">{o.route === 'provider' ? label(o.phoneSource ?? 'ADH') : say('official page', 'página oficial')}</a>{o.checkedOn ? `, ${say('checked', 'revisado')} ${readableDate(o.checkedOn, language)}` : ''}.</> : null}
      {s ? <> {say('Email', 'Correo')}: <a href={s.url} target="_blank" rel="noreferrer">{label(s.source)}</a>, {say('checked', 'revisado')} {readableDate(s.checkedOn, language)}.</> : null}
      {o.otherListings?.map(l => <span key={l.email}> {say(`The ${l.source === 'ADH' ? 'ADH directory' : 'EPA record'} lists a different address (${l.email}); WAVE does not use it.`, `El ${l.source === 'ADH' ? 'directorio de ADH' : 'registro de la EPA'} indica otra dirección (${l.email}); WAVE no la usa.`)}</span>)}
    </p>
  }
  function row(o: SendOption, escalation = false) {
    const mail = !sample && o.email ? mailtoUrl(o.email, draft.subject, draft.body) : undefined
    const script = callScript(draft, language)
    return <article key={o.route} className={`send-option${o.recommended ? ' send-option-recommended' : ''}`} aria-label={o.name}>
      {o.recommended ? <p className="send-option-badge">★ {say('Recommended', 'Recomendado')}</p> : escalation ? <p className="send-option-badge send-option-badge-next">{say('If this isn’t resolved', 'Si no se resuelve')}</p> : null}
      <h3>{o.name}</h3>
      <p className="send-option-contact">{[o.email, o.phone].filter(Boolean).join(' · ') || (o.formUrl ? say('Official online form', 'Formulario oficial en línea') : say('No checked contact on file', 'Sin contacto verificado'))}{o.emailKind === 'staff' ? <span className="quiet-note"> — {say('a staff member’s listed address', 'dirección de un empleado listada')}</span> : null}</p>
      {sample ? <p className="quiet-note request-sample">{say('Sample — sending disabled.', 'Ejemplo — envío desactivado.')}</p> : <div className="send-option-actions">
        {o.email ? mail && !blocked ? <a className="primary" href={mail.url} onClick={() => ask(o, 'emailed')}><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</a> : <button className="primary" disabled><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</button> : null}
        {o.dial ? blocked ? <button className="secondary" disabled><Icon name="phone" size={18} />{say('Call', 'Llamar')}</button> : <a className="secondary" href={`tel:${o.dial}`} onClick={() => ask(o, 'called')} aria-label={`${say('Call', 'Llamar')} ${o.phone}`}><Icon name="phone" size={18} />{say('Call', 'Llamar')}</a> : null}
        {o.formUrl ? <button className="secondary" disabled={blocked} onClick={() => void openForm(o)}><Icon name="external-link" size={18} />{say('Copy message & open form', 'Copiar mensaje y abrir formulario')}</button> : null}
      </div>}
      {!sample && o.email && mail && !mail.full ? <p className="quiet-note">{say('This message is too long for an email link. Copy it and paste it into the email.', 'El mensaje es demasiado largo para un enlace de correo. Cópialo y pégalo en el correo.')}</p> : null}
      {!sample && o.email && draft.attachments.length ? <p className="quiet-note">{say('Attach your photos or documents in your email app; email links cannot include files.', 'Adjunta tus fotos o documentos en tu app de correo; los enlaces de correo no incluyen archivos.')}</p> : null}
      {o.route === 'provider' && !o.email && !sample ? <p className="quiet-note">{o.dial ? say('No checked email on file — WAVE will not guess one. Call, or copy the message for their website or office.', 'No hay correo verificado; WAVE no lo adivina. Llama o copia el mensaje para su sitio web u oficina.') : say('WAVE has no checked contact for this system yet. Check your bill for the customer-service number.', 'WAVE aún no tiene un contacto verificado para este sistema. Revisa tu factura para el número de servicio al cliente.')}</p> : null}
      {o.dial && !sample ? <details className="send-option-script"><summary>{say('Show call script', 'Mostrar guion de llamada')}</summary><ol>{script.map(line => <li key={line}>{line}</li>)}</ol></details> : null}
      {escalation ? <p className="quiet-note">{say('Your message is addressed to your current recipients. To contact this office, add it in To and update the draft first.', 'Tu mensaje está dirigido a los destinatarios actuales. Para contactar esta oficina, añádela en Para y actualiza el borrador.')}</p> : null}
      {source(o)}
    </article>
  }
  return <section className="send-options" aria-labelledby="send-options-heading">
    <h2 id="send-options-heading">{say('Where to send it', 'Dónde enviarlo')}</h2>
    <p className="quiet-note">{say('You send it yourself. WAVE does not send, call or file anything, and cannot confirm delivery or a reply.', 'Tú lo envías. WAVE no envía, llama ni presenta nada, y no puede confirmar la entrega ni una respuesta.')}</p>
    {blocked ? <p className="quiet-note">{say('Finish the subject and message first; replace any bracketed placeholders.', 'Primero completa el asunto y el mensaje; reemplaza los campos entre corchetes.')}</p> : null}
    {/* While the resident answers "Did you send it?", the question replaces the cards so the screen never scrolls. */}
    {asked ? <div className="send-confirm" role="group" aria-labelledby="send-confirm-heading">
      <h3 id="send-confirm-heading">{asked.kind === 'called' ? say(`Did you reach ${asked.o.name}?`, `¿Pudiste hablar con ${asked.o.name}?`) : say(`Did you send it to ${asked.o.name}?`, `¿Lo enviaste a ${asked.o.name}?`)}</h3>
      <p className="quiet-note">{say('WAVE can’t see your email app, phone or the form, so it only saves what you tell it here.', 'WAVE no puede ver tu app de correo, teléfono ni el formulario; solo guarda lo que nos digas aquí.')}</p>
      <label>{say('Reference or ticket number (optional)', 'Número de referencia o caso (opcional)')}<input value={reference} maxLength={100} onChange={e => setReference(e.target.value)} /></label>
      <div className="send-option-actions">
        <button className="primary" onClick={() => answer(asked.kind)}>{asked.kind === 'called' ? say('Yes, I talked to them', 'Sí, hablé con ellos') : say('Yes, I sent it', 'Sí, lo envié')}</button>
        <button className="secondary" onClick={() => answer(null)}>{say('Not yet', 'Todavía no')}</button>
        <button className="secondary" onClick={() => answer('unreachable')}>{say('I couldn’t reach them', 'No pude comunicarme')}</button>
      </div>
    </div> : <div className="send-option-grid">{primary.map(o => row(o))}{next ? row(next, true) : null}</div>}
    {!sample && record && !asked && primary[0] ? <button className="text-button send-record-other" onClick={() => ask(primary[0], 'emailed')}>{say('Sent it another way? Record it', '¿Lo enviaste de otra forma? Regístralo')}</button> : null}
    {last ? <p className="quiet-note send-last">{say('Last recorded', 'Último registro')}: {outcomeLabel(last, language)}, {readableDate(last.on, language)}{last.reference ? ` (${say('ref.', 'ref.')} ${last.reference})` : ''}.{draft.followUpOn ? ` ${say('Follow-up reminder', 'Recordatorio de seguimiento')}: ${readableDate(draft.followUpOn, language)}.` : ''}</p> : null}
    {status ? <p role="status">{status}</p> : null}
  </section>
}
