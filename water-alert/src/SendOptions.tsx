import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'
import type { Language } from './domain'
import type { HelpDraft, HelpOutcomeKind } from './help-requests'
import { callScript, mailtoUrl, sendOptions, type SendOption } from './send-options'
import { readableDate } from './help-format'
import { addBusinessDays, contacted, FOLLOW_UP_BUSINESS_DAYS, localDate, outcomeLabel, recordOutcome, reminderIcs } from './help-outcomes'
import { downloadText } from './help-client'
import { supplierDisplayName } from './help-format'
import { NextContactGuidance } from './NextContactGuidance'
import { InfoButton } from './InfoButton'
import { IconAction } from './IconAction'
import { reviewLabel } from './review-labels'
import { ContactLogDialog, type ContactLogEntry } from './ContactLogDialog'

interface Props { draft: HelpDraft; language: Language; sample: boolean; blocked: boolean; copy: () => Promise<boolean>; record?: (patch: Pick<HelpDraft, 'outcomes' | 'followUpOn'>) => void; footerTarget?: HTMLElement | null; toolbarTarget?: HTMLElement | null; compact?: boolean; /** Opens History after a contact attempt is logged from the popup. */ onHistory?: () => void }

/** Resident-initiated handoffs only: an email app, a phone call or an official form. */
export function SendOptions({ draft, language, sample, blocked, copy, record, footerTarget, toolbarTarget, compact = false, onHistory }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const { primary, next } = sendOptions(draft)
  const last = contacted(draft)
  const [status, setStatus] = useState('')
  const [contactOn, setContactOn] = useState(localDate()), [followEdited, setFollowEdited] = useState(false)
  const [asked, setAsked] = useState<{ o: SendOption; kind: HelpOutcomeKind } | null>(null)
  const [reference, setReference] = useState(''), [told, setTold] = useState(''), [followOn, setFollowOn] = useState('')
  // Log a contact attempt opens a modal popup; the right column keeps its handoff cards.
  const [logging, setLogging] = useState<SendOption | null>(null), logButton = useRef<HTMLButtonElement>(null)
  const [showSources, setShowSources] = useState(false), [showHow, setShowHow] = useState(false)
  const sourcesButton = useRef<HTMLButtonElement>(null)
  const closeSources = () => { setShowSources(false); sourcesButton.current?.focus() }
   const ask = (o: SendOption, kind: HelpOutcomeKind) => { if (record && !sample) { setAsked({ o, kind }); setReference(''); setTold(''); setContactOn(localDate()); setFollowEdited(false); setFollowOn(addBusinessDays(localDate(), FOLLOW_UP_BUSINESS_DAYS)) } }
  function answer(kind: HelpOutcomeKind | null) {
    if (!asked || !record) return
    if (kind) {
       if (!contactOn || contactOn > localDate()) return
       const patch = recordOutcome(draft, kind, asked.o.route, asked.o.name, { on: contactOn, reference, note: told, followUpOn: followOn })
      record(patch)
      setStatus(kind === 'unreachable'
        ? say(`Recorded that you couldn’t reach ${asked.o.name}. Try another option below.`, `Se registró que no pudiste comunicarte con ${asked.o.name}. Prueba otra opción.`)
         : patch.followUpOn ? say(`Recorded. History will show a follow-up reminder on ${readableDate(patch.followUpOn, language)} if you haven’t recorded a reply.`, `Registrado. Historial mostrará un recordatorio el ${readableDate(patch.followUpOn, language)} si no has registrado una respuesta.`) : say('Recorded. No follow-up reminder set.', 'Registrado. No se programó un recordatorio.'))
    } else setStatus(say('Nothing recorded. Your draft is saved.', 'No se registró nada. Tu borrador está guardado.'))
    setAsked(null)
  }
  const openLog = (o: SendOption) => { if (record && !sample) { setStatus(''); setLogging(o) } }
  function cancelLog() { setLogging(null); queueMicrotask(() => logButton.current?.focus()) }
  function saveLog(entry: ContactLogEntry) {
    if (!logging || !record || !entry.on || entry.on > localDate()) return
    // Same resident-reported record as the inline prompt; WAVE never verifies the contact.
    const patch = recordOutcome(draft, entry.kind, logging.route, logging.name, { on: entry.on, reference: entry.reference, note: entry.note, followUpOn: entry.followUpOn })
    record(patch)
    setLogging(null)
    if (onHistory) { onHistory(); return }
    setStatus(entry.kind === 'unreachable' ? say(`Recorded that you couldn’t reach ${logging.name}.`, `Se registró que no pudiste comunicarte con ${logging.name}.`) : patch.followUpOn ? say(`Recorded. History will show a follow-up reminder on ${readableDate(patch.followUpOn, language)} if you haven’t recorded a reply.`, `Registrado. Historial mostrará un recordatorio el ${readableDate(patch.followUpOn, language)} si no has registrado una respuesta.`) : say('Recorded. No follow-up reminder set.', 'Registrado. No se programó un recordatorio.'))
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
      {o.sourceUrl && (o.dial || o.route !== 'provider') ? <>{o.dial ? say('Phone', 'Teléfono') : say('Form', 'Formulario')}: <a href={o.sourceUrl} target="_blank" rel="noreferrer">{o.route === 'provider' ? label(o.phoneSource ?? 'ADH') : say('official page', 'página oficial')}</a>{o.checkedOn ? `, ${say('checked', 'revisado')} ${readableDate(o.checkedOn, language)}` : ''}.</> : null}
      {s ? <> {say('Email', 'Correo')}: <a href={s.url} target="_blank" rel="noreferrer">{label(s.source)}</a>, {say('checked', 'revisado')} {readableDate(s.checkedOn, language)}.</> : null}
      {o.otherListings?.map(l => <span key={l.email}> {say(`The ${l.source === 'ADH' ? 'ADH directory' : 'EPA record'} lists a different address (${l.email}); WAVE does not use it.`, `El ${l.source === 'ADH' ? 'directorio de ADH' : 'registro de la EPA'} indica otra dirección (${l.email}); WAVE no la usa.`)}</span>)}
    </p>
  }
  // Contact provenance sits inside the lead contact card; the popup lists every recipient's sources.
  const sourcesLink = <p className="quiet-note send-options-note"><button ref={sourcesButton} className="action-chip" aria-expanded={showSources} aria-controls="send-contact-sources" onClick={() => setShowSources(!showSources)}><Icon name="info" size={16} />{say('Contact sources', 'Fuentes de contacto')}</button></p>
  function row(o: SendOption, escalation = false, lead = true) {
    const mail = !sample && o.email ? mailtoUrl(o.email, draft.subject, draft.body) : undefined
    const script = callScript(draft, language)
    const contactNote = <><div><b>{say('General utility contact', 'Contacto general de la empresa de agua')}</b> — {o.emailKind === 'staff' ? say('This is a staff member’s listed address. ', 'Esta es la dirección listada de un empleado. ') : ''}{draft.issue === 'billing' ? say('WAVE has not verified a published billing channel for this supplier. Your bill may list one.', 'WAVE no ha verificado un canal de facturación publicado para este proveedor. Tu factura puede indicar uno.') : say('WAVE has not verified a published service-issue channel for this supplier.', 'WAVE no ha verificado un canal publicado para problemas de servicio de este proveedor.')}</div>{sourcesLink}</>
    if (lead && !escalation) {
      // Wireframe order: Copy / Call side by side, then the contact card, then the call script.
      const emailAction = o.email && !footerTarget ? mail && !blocked ? <a className="primary" href={mail.url} onClick={() => ask(o, 'emailed')}><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</a> : <button className="primary" disabled><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</button> : null
      return <article key={o.route} className="send-lead" aria-label={o.name}>
        {!compact ? <div className="send-option-actions send-lead-actions">
          {sample && !footerTarget ? <button className="primary" disabled><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</button> : sample ? null : emailAction}
          <button className="secondary" disabled={blocked} onClick={() => void copy()}><Icon name="file-text" size={18} />{say('Copy message', 'Copiar mensaje')}</button>
          {!sample && o.dial ? blocked ? <button className="secondary" disabled><Icon name="phone" size={18} />{say('Call', 'Llamar')}</button> : <a className="secondary" href={`tel:${o.dial}`} onClick={() => ask(o, 'called')} aria-label={`${say('Call', 'Llamar')} ${o.phone}`}><Icon name="phone" size={18} />{say('Call', 'Llamar')}</a> : null}
          {!sample && o.formUrl ? <button className="secondary" disabled={blocked} onClick={() => void openForm(o)}><Icon name="external-link" size={18} />{say('Copy message & open form', 'Copiar mensaje y abrir formulario')}</button> : null}
        </div> : null}
        <div className={`send-option send-contact-card${o.recommended ? ' send-option-recommended' : ''}`}>
          <header className="send-contact-heading">{compact ? <span>{say('Send it yourself', 'Envíalo tú')}</span> : null}<h3>{supplierDisplayName(o.name)}</h3>{compact ? <InfoButton label={reviewLabel('contactInfo', language)}>{o.route === 'provider' && !sample && (o.email || o.phone) ? contactNote : <><NextContactGuidance route={o.route} language={language} />{sourcesLink}</>}</InfoButton> : null}</header>
          {compact ? <div className="send-contact-channels">
            {o.email ? <div className="send-contact-row"><Icon name="mail" size={18} /><div><span>{say('Email', 'Correo')}</span><strong>{o.email.toLowerCase()}</strong></div><IconAction label={reviewLabel('copyEmail', language)} icon="copy" disabled={sample} onClick={async () => { try { await navigator.clipboard.writeText(o.email!); setStatus(say('Email address copied. Nothing was sent.', 'Dirección de correo copiada. No se envió nada.')) } catch { setStatus(say('Select and copy the email address manually.', 'Selecciona y copia la dirección de correo manualmente.')) } }} /></div> : null}
            {o.phone ? <div className="send-contact-row"><Icon name="phone" size={18} /><div><span>{say('Phone', 'Teléfono')}</span><strong>{o.phone}</strong></div><IconAction label={reviewLabel(o.route === 'adh' ? 'callAdh' : 'callSupplier', language)} icon="phone" href={o.dial ? `tel:${o.dial}` : undefined} disabled={sample || blocked || !o.dial} onClick={() => ask(o, 'called')} /></div> : null}
            {o.formUrl ? <button className="secondary" disabled={sample || blocked} onClick={() => void openForm(o)}>{say('Copy message & open form', 'Copiar mensaje y abrir formulario')}</button> : null}
            {!o.email && !o.phone && !o.formUrl ? <p>{say('No checked contact on file', 'Sin contacto verificado')}</p> : null}
          </div> : <p className="send-option-contact">{o.email || o.phone ? [o.email?.toLowerCase(), o.phone].filter(Boolean).map(v => <span key={v} className="send-option-contact-item">{v}</span>) : (o.formUrl ? say('Official online form', 'Formulario oficial en línea') : say('No checked contact on file', 'Sin contacto verificado'))}</p>}
          {o.emailKind === 'staff' && !compact ? <p className="quiet-note send-staff-note">{say('This is a staff member’s listed address.', 'Esta es la dirección listada de un empleado.')}</p> : null}
          {!compact && o.route === 'provider' && !sample && (o.email || o.phone) ? <div className="send-channel-label">{contactNote}</div> : null}
          {o.confirmedOn ? <p className="quiet-note send-option-confirmed">{say(`Confirmed by WAVE on ${readableDate(o.confirmedOn, language)}`, `Confirmado por WAVE el ${readableDate(o.confirmedOn, language)}`)}</p> : null}
          {sample ? <p className="quiet-note request-sample">{say('Sample — sending disabled.', 'Ejemplo — envío desactivado.')}</p> : null}
          {!compact && (o.route !== 'provider' || sample || !o.email && !o.phone) ? sourcesLink : null}
          {!compact ? <NextContactGuidance route={o.route} language={language} /> : null}
        </div>
        {!sample && o.email && mail && !mail.full ? <p className="quiet-note">{say('This message is too long for an email link. Copy it and paste it into the email.', 'El mensaje es demasiado largo para un enlace de correo. Cópialo y pégalo en el correo.')}</p> : null}
        {!sample && o.email && draft.attachments.length ? <p className="quiet-note">{say('Attach your photos or documents in your email app; email links cannot include files.', 'Adjunta tus fotos o documentos en tu app de correo; los enlaces de correo no incluyen archivos.')}</p> : null}
        {o.route === 'provider' && !o.email && !sample ? <p className="quiet-note">{o.dial ? say('No checked email on file — WAVE will not guess one. Call, or copy the message for their website or office.', 'No hay correo verificado; WAVE no lo adivina. Llama o copia el mensaje para su sitio web u oficina.') : say('WAVE has no checked contact for this system yet. Check your bill for the customer-service number.', 'WAVE aún no tiene un contacto verificado para este sistema. Revisa tu factura para el número de servicio al cliente.')}</p> : null}
        {/* Review (compact) drops the call script; the full Send options view keeps it. */}
        {o.dial && !sample && !compact ? <details className="send-option-script"><summary>{say('What to say when you call', 'Qué decir cuando llames')}<Icon name="chevron-down" size={18} /></summary>{script.map(line => <p key={line}>{line}</p>)}</details> : null}
      </article>
    }
    if (escalation) return <article key={o.route} className="send-option send-option-next" aria-label={o.name}>
      <div className="send-other-heading"><p><span className="send-option-badge-next">{say('Another option', 'Otra opción')}</span><strong>{supplierDisplayName(o.name)}</strong></p>{compact ? <InfoButton label={reviewLabel('otherInfo', language)}><NextContactGuidance route={o.route} language={language} />{source(o)}</InfoButton> : null}</div>
      {o.phone ? <span className="send-other-phone">{o.phone}</span> : null}
       {!compact ? <NextContactGuidance route={o.route} language={language} /> : null}
       {sample ? null : <div className="send-option-actions">
        {o.dial ? compact ? <IconAction label={o.route === 'adh' ? reviewLabel('callAdh', language) : `${say('Call', 'Llamar')} ${o.name}`} icon="phone" href={`tel:${o.dial}`} disabled={blocked} onClick={() => ask(o, 'called')} /> : blocked ? <button className="action-chip" disabled><Icon name="phone" size={16} />{say('Call', 'Llamar')}</button> : <a className="action-chip" href={`tel:${o.dial}`} onClick={() => ask(o, 'called')} aria-label={`${say('Call', 'Llamar')} ${o.phone}`}><Icon name="phone" size={16} />{say('Call', 'Llamar')}</a> : null}
        {o.formUrl ? <button className="action-chip" disabled={blocked} onClick={() => void openForm(o)}><Icon name="external-link" size={16} />{say('Copy message & open form', 'Copiar mensaje y abrir formulario')}</button> : null}
      </div>}
    </article>
    return <article key={o.route} className={`send-option${o.recommended ? ' send-option-recommended' : ''}`} aria-label={o.name}>
      <h3>{supplierDisplayName(o.name)}</h3>
      <NextContactGuidance route={o.route} language={language} />
      {o.route === 'provider' && !sample && (o.email || o.phone) ? <p className="send-channel-label"><b>{say('General utility contact', 'Contacto general de la empresa de agua')}</b> — {draft.issue === 'billing' ? say('WAVE has not verified a published billing channel for this supplier. Your bill may list one.', 'WAVE no ha verificado un canal de facturación publicado para este proveedor. Tu factura puede indicar uno.') : say('WAVE has not verified a published service-issue channel for this supplier.', 'WAVE no ha verificado un canal publicado para problemas de servicio de este proveedor.')}</p> : null}
      <p className="send-option-contact">{o.email || o.phone ? [o.email?.toLowerCase(), o.phone].filter(Boolean).map((v, i) => <span key={v} className="send-option-contact-item">{i ? ' · ' : ''}{v}</span>) : (o.formUrl ? say('Official online form', 'Formulario oficial en línea') : say('No checked contact on file', 'Sin contacto verificado'))}{o.emailKind === 'staff' ? <span className="quiet-note"> — {say('a staff member’s listed address', 'dirección de un empleado listada')}</span> : null}</p>
      {o.confirmedOn ? <p className="quiet-note send-option-confirmed">{say(`Confirmed by WAVE on ${readableDate(o.confirmedOn, language)}`, `Confirmado por WAVE el ${readableDate(o.confirmedOn, language)}`)}</p> : null}
      {sample ? <><p className="quiet-note request-sample">{say('Sample — sending disabled.', 'Ejemplo — envío desactivado.')}</p><div className="send-option-actions">{!footerTarget ? <button className="primary" disabled><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</button> : null}{lead ? <button className="secondary" disabled={blocked} onClick={() => void copy()}><Icon name="file-text" size={18} />{say('Copy message', 'Copiar mensaje')}</button> : null}</div></> : <div className="send-option-actions">
        {o.email && (!lead || !footerTarget) ? mail && !blocked ? <a className={lead ? 'primary' : 'secondary'} href={mail.url} onClick={() => ask(o, 'emailed')}><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</a> : <button className={lead ? 'primary' : 'secondary'} disabled><Icon name="mail" size={18} />{say('Open in email app', 'Abrir en app de correo')}</button> : null}
        {lead ? <button className="secondary" disabled={blocked} onClick={() => void copy()}><Icon name="file-text" size={18} />{say('Copy message', 'Copiar mensaje')}</button> : null}
        {o.dial ? blocked ? <button className="secondary" disabled><Icon name="phone" size={18} />{say('Call', 'Llamar')}</button> : <a className="secondary" href={`tel:${o.dial}`} onClick={() => ask(o, 'called')} aria-label={`${say('Call', 'Llamar')} ${o.phone}`}><Icon name="phone" size={18} />{say('Call', 'Llamar')}</a> : null}
        {o.formUrl ? <button className="secondary" disabled={blocked} onClick={() => void openForm(o)}><Icon name="external-link" size={18} />{say('Copy message & open form', 'Copiar mensaje y abrir formulario')}</button> : null}
      </div>}
      {!sample && o.email && mail && !mail.full ? <p className="quiet-note">{say('This message is too long for an email link. Copy it and paste it into the email.', 'El mensaje es demasiado largo para un enlace de correo. Cópialo y pégalo en el correo.')}</p> : null}
      {!sample && o.email && draft.attachments.length ? <p className="quiet-note">{say('Attach your photos or documents in your email app; email links cannot include files.', 'Adjunta tus fotos o documentos en tu app de correo; los enlaces de correo no incluyen archivos.')}</p> : null}
      {o.route === 'provider' && !o.email && !sample ? <p className="quiet-note">{o.dial ? say('No checked email on file — WAVE will not guess one. Call, or copy the message for their website or office.', 'No hay correo verificado; WAVE no lo adivina. Llama o copia el mensaje para su sitio web u oficina.') : say('WAVE has no checked contact for this system yet. Check your bill for the customer-service number.', 'WAVE aún no tiene un contacto verificado para este sistema. Revisa tu factura para el número de servicio al cliente.')}</p> : null}
      {o.dial && !sample && !escalation && !compact ? <details className="send-option-script"><summary>{say('What to say when you call', 'Qué decir cuando llames')}</summary>{script.map(line => <p key={line}>{line}</p>)}</details> : null}
    </article>
  }
  return <section className="send-options" aria-labelledby="send-options-heading">
    <header className={compact ? 'send-options-head sr-only' : 'send-options-head'}>
      <h2 id="send-options-heading">{say('Send it yourself', 'Envíalo tú')}</h2>
      <p className="send-options-lead">{say('WAVE does not send, call or file anything, and can’t confirm delivery.', 'WAVE no envía, llama ni presenta nada, y no puede confirmar la entrega.')} <button className="action-chip send-how-toggle" aria-expanded={showHow} aria-controls="send-how-text" onClick={() => setShowHow(!showHow)}><Icon name="info" size={16} />{say('How this works', 'Cómo funciona')}</button></p>
      {showHow ? <p id="send-how-text" className="quiet-note send-how-text">{say('Open your email app, call, or use an official form yourself. Opening an app does not send your message. WAVE cannot confirm delivery or a reply.', 'Abre tu aplicación de correo, llama o usa un formulario oficial. Abrir una aplicación no envía tu mensaje. WAVE no puede confirmar la entrega ni una respuesta.')}</p> : null}
    </header>
    {blocked ? <p className="quiet-note">{say('Finish the subject and message first; replace any bracketed placeholders.', 'Primero completa el asunto y el mensaje; reemplaza los campos entre corchetes.')}</p> : null}
    {/* Replace handoff cards with the resident's explicit outcome question; opening an app records nothing. */}
    {asked ? <div className="send-confirm" role="group" aria-labelledby="send-confirm-heading">
      <h3 id="send-confirm-heading">{asked.kind === 'called' ? say(`Did you reach ${asked.o.name}?`, `¿Pudiste hablar con ${asked.o.name}?`) : say(`Did you send it to ${asked.o.name}?`, `¿Lo enviaste a ${asked.o.name}?`)}</h3>
       <p className="quiet-note">{say('WAVE can’t see your email app, phone or the form, so it only saves what you tell it here.', 'WAVE no puede ver tu app de correo, teléfono ni el formulario; solo guarda lo que nos digas aquí.')}</p>
       <label>{say('Contact date', 'Fecha de contacto')}<input type="date" value={contactOn} max={localDate()} required onChange={e => { const on = e.target.value; setContactOn(on); if (!followEdited) setFollowOn(on ? addBusinessDays(on, FOLLOW_UP_BUSINESS_DAYS) : '') }} /></label>
      <label>{say('Reference or ticket number (optional)', 'Número de referencia o caso (opcional)')}<input value={reference} maxLength={100} onChange={e => setReference(e.target.value)} /></label>
      <label>{say('What did they tell you? (optional)', '¿Qué te dijeron? (opcional)')}<textarea rows={2} maxLength={500} value={told} onChange={e => setTold(e.target.value)} /></label>
       <label>{say('When should you follow up?', '¿Cuándo debes dar seguimiento?')}<input type="date" value={followOn} onChange={e => { setFollowEdited(true); setFollowOn(e.target.value) }} /></label>
       <p className="quiet-note">{say(`Suggested: ${FOLLOW_UP_BUSINESS_DAYS} weekdays after contact; public holidays are not accounted for. Change or clear it. It is a check-in date, not a deadline for the provider, and WAVE will not send a notification.`, `Sugerido: ${FOLLOW_UP_BUSINESS_DAYS} días de lunes a viernes después del contacto; no se tienen en cuenta los feriados. Puedes cambiarlo o borrarlo. Es una fecha para revisar, no un plazo para el proveedor, y WAVE no enviará notificaciones.`)}</p>
      <div className="send-option-actions">
        <button className="primary" disabled={!contactOn || contactOn > localDate()} onClick={() => answer(asked.kind)}>{asked.kind === 'called' ? say('Yes, I talked to them', 'Sí, hablé con ellos') : say('Yes, I sent it', 'Sí, lo envié')}</button>
        <button className="secondary" onClick={() => answer(null)}>{say('Not yet', 'Todavía no')}</button>
        <button className="secondary" disabled={!contactOn || contactOn > localDate()} onClick={() => answer('unreachable')}>{say('I couldn’t reach them', 'No pude comunicarme')}</button>
      </div>
    </div> : <div className="send-option-grid">{primary.map((o, index) => row(o, false, index === 0))}{next && !compact ? row(next, true) : null}</div>}
    {!footerTarget && !sample && record && !asked && primary[0] ? <button ref={logButton} className="secondary send-record-other" aria-haspopup="dialog" onClick={() => openLog(primary[0])}>{reviewLabel('logContact', language)}</button> : null}
    {showSources ? <div id="send-contact-sources" role="dialog" aria-label={say('Contact sources', 'Fuentes de contacto')} className="request-citations-popup send-contact-sources" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeSources() } }}>
      <button autoFocus className="text-button" aria-label={say('Close contact sources', 'Cerrar fuentes de contacto')} onClick={closeSources}><Icon name="x" size={20} /></button>
      <h3>{say('Contact sources', 'Fuentes de contacto')}</h3>
      {[...primary, ...(next ? [next] : [])].map(o => <section key={o.route}><h4>{o.name}</h4>{source(o)}</section>)}
    </div> : null}
    {last && draft.followUpOn && !sample ? <button className="action-chip send-reminder" onClick={() => downloadText('wave-follow-up.ics', reminderIcs(draft, language) ?? '', 'text/calendar;charset=utf-8')}><Icon name="calendar" size={18} />{say('Add a reminder to my calendar', 'Añadir un recordatorio a mi calendario')}</button> : null}
    {last ? <p className="quiet-note send-last">{say('Last recorded', 'Último registro')}: {outcomeLabel(last, language)}, {readableDate(last.on, language)}{last.reference ? ` (${say('ref.', 'ref.')} ${last.reference})` : ''}.{draft.followUpOn ? ` ${say('Follow-up reminder', 'Recordatorio de seguimiento')}: ${readableDate(draft.followUpOn, language)}.` : ''}</p> : null}
    {status ? <p role="status">{status}</p> : null}
    {asked || !primary.length ? <footer className="send-fineprint">{sourcesLink}</footer> : null}
    {footerTarget && !asked ? createPortal(<button ref={logButton} className="primary" aria-haspopup="dialog" disabled={sample || !record || !primary[0]} onClick={() => openLog(primary[0])}>{reviewLabel('logContact', language)}<Icon name="arrow-right" size={18} /></button>, footerTarget) : null}
    {logging ? <ContactLogDialog name={logging.name} language={language} onCancel={cancelLog} onSave={saveLog} /> : null}
    {toolbarTarget ? createPortal((() => { const o = primary[0], mail = !sample && o?.email ? mailtoUrl(o.email, draft.subject, draft.body) : undefined; return <IconAction label={reviewLabel('openEmail', language)} icon="mail" href={mail?.url} disabled={!mail || blocked} onClick={() => ask(o, 'emailed')} /> })(), toolbarTarget) : null}
  </section>
}
