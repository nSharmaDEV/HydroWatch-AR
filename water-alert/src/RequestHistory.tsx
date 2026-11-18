import { useEffect, useId, useState } from 'react'
import { Icon, type IconName } from './icons'
import type { Language } from './domain'
import { HelpAccount } from './HelpAccount'
import { downloadText, helpApi, listRequests, removeRequest, saveRequest } from './help-client'
import type { HelpAttachment, HelpOutcomeKind, HelpRequest, HelpRoute } from './help-requests'
import { selectedRecipients } from './help-requests'
import './requests.css'
import './history.css'
import { RequestSources } from './RequestSources'
import { addBusinessDays, contacted, FOLLOW_UP_BUSINESS_DAYS, isClosed, localDate, recordOutcome, reminderIcs, updateContact } from './help-outcomes'
import { ProgressTracker } from './ProgressTracker'
import { escalationRoute, followUpDraft, mailtoUrl, sendOption } from './send-options'
import { supplierDisplayName } from './help-format'
import { stepLabel } from './help-flow'
import { ISSUE_LABELS } from './help-questions'
import { NextContactGuidance } from './NextContactGuidance'
import { IconAction } from './IconAction'
import { HistoryDialog } from './HistoryDialog'
import { dateTime, GROUP_LABELS, GROUP_ORDER, groupRequests, requestState, requestTimeline, type PrimaryAction, type RequestState } from './history-view'

/**
 * History opens on the request itself when there is one, and becomes a grouped list
 * only when there are two or more. Everything shown is what the resident recorded or
 * what WAVE itself sent; WAVE cannot see calls, replies elsewhere or the utility's work.
 */
export function RequestHistory({ language, sample, requestId, onResume, onStart }: { language: Language; sample: boolean; requestId?: string; onResume: (request: HelpRequest) => void; onStart?: () => void }) {
  return <div className="request-history narrow-page history-page">{sample
    ? <History language={language} sample requestId={requestId} onResume={onResume} onStart={onStart} deviceOnly={false} />
    : <HelpAccount language={language}>{s => <History key={s.user?.id ?? 'device'} language={language} sample={false} requestId={requestId} onResume={onResume} onStart={onStart} email={s.user?.email} delivery={s.delivery} deviceOnly={!s.user} />}</HelpAccount>}</div>
}

function attachment(a: HelpAttachment) {
  const bytes = Uint8Array.from(atob(a.data), c => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: a.type }))
  const link = document.createElement('a'); link.href = url; link.download = a.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type RecordKind = 'follow-up' | 'update' | 'details' | 'resolved' | 'closed' | 'reopened'
const STRIP_ICON: Record<RequestState['kind'], IconName> = { draft: 'edit', ready: 'mail', 'send-problem': 'triangle-alert', due: 'bell', waiting: 'mail', reply: 'mail', unreachable: 'triangle-alert', resolved: 'circle-check', closed: 'check' }
/** Long enough that the clipped preview hides something. */
const isLong = (body: string) => body.length > 280 || body.split('\n').length > 6

interface Props { language: Language; sample: boolean; requestId?: string; onResume: (request: HelpRequest) => void; onStart?: () => void; email?: string; delivery?: boolean; deviceOnly: boolean }

function History({ language, sample, requestId, onResume, onStart, email, delivery, deviceOnly }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const [records, setRecords] = useState<HelpRequest[]>([]), [selected, setSelected] = useState<string | undefined>(requestId)
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('')
  const [noting, setNoting] = useState<RecordKind | null>(null), [method, setMethod] = useState<HelpOutcomeKind>('called')
  const [recordOn, setRecordOn] = useState(localDate()), [noteText, setNoteText] = useState(''), [refText, setRefText] = useState(''), [followText, setFollowText] = useState('')
  const [messageOpen, setMessageOpen] = useState(false), [closedOpen, setClosedOpen] = useState(false), [fullRecord, setFullRecord] = useState(false)
  const ids = useId()
  const today = localDate()

  async function load() {
    try { setRecords(await listRequests(sample, deviceOnly)); setLoaded(true); setError('') }
    catch { setError(say('Could not load History. Sign in again if your session expired. Nothing was deleted.', 'No se pudo cargar Historial. Inicia sesión de nuevo si caducó. No se eliminó nada.')) }
  }
  useEffect(() => { void load(); if (sample) return; const timer = setInterval(() => void load(), 20000); return () => clearInterval(timer) }, [sample])
  async function action(work: () => Promise<unknown>) {
    setBusy(true); setError('')
    try { await work(); await load() } catch { setError(say('Could not complete this action. Reload before trying again.', 'No se pudo completar la acción. Recarga antes de reintentar.')) } finally { setBusy(false) }
  }

  // One request opens directly; a stale or missing selection falls back to the list.
  const chosen = records.find(r => r.id === selected) ?? (records.length === 1 ? records[0] : undefined)
  function open(id?: string) {
    setSelected(id); setNoting(null); setFullRecord(false); setMessageOpen(false); setStatus('')
    window.history.replaceState(null, '', id ? `#request=${id}` : window.location.pathname + window.location.search)
    window.scrollTo?.({ top: 0 })
  }
  const dateTimeFull = (at: number) => new Intl.DateTimeFormat(es ? 'es' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(at)
  const category = (r: HelpRequest) => ISSUE_LABELS[r.draft.issue][es ? 1 : 0]
  const subjectOf = (r: HelpRequest) => r.original?.subject || r.draft.subject || say('Water issue', 'Problema de agua')
  const saved = (r: HelpRequest) => <time dateTime={new Date(r.updatedAt).toISOString()}>{say('Saved', 'Guardado')} {dateTimeFull(r.updatedAt)}</time>

  function startRecord(r: HelpRequest, kind: RecordKind) {
    const last = contacted(r.draft)
    setRecordOn(kind === 'details' ? last?.on ?? today : today)
    setNoteText(kind === 'details' ? last?.note ?? '' : ''); setRefText(kind === 'details' ? last?.reference ?? '' : '')
    setMethod(kind === 'update' ? 'reply' : 'called')
    setFollowText(kind === 'details' ? r.draft.followUpOn ?? '' : kind === 'follow-up' ? addBusinessDays(today, FOLLOW_UP_BUSINESS_DAYS) : kind === 'update' ? r.draft.followUpOn ?? '' : '')
    setFullRecord(false); setNoting(kind)
  }
  function saveRecord(r: HelpRequest, state: RequestState) {
    if (!noting || !recordOn || recordOn > today) return
    const last = contacted(r.draft)
    const route = last?.route ?? state.contact?.route ?? r.draft.route, name = last?.name ?? state.contact?.name ?? r.draft.place.name
    const kind: HelpOutcomeKind = noting === 'follow-up' || noting === 'update' ? method : noting === 'details' ? 'emailed' : noting
    const tracked = ['emailed', 'called', 'form', 'unreachable', 'reply'].includes(kind)
    const patch = noting === 'details' && last
      ? updateContact(r.draft, { on: recordOn, reference: refText, note: noteText, followUpOn: followText })
      : recordOutcome(r.draft, kind, route, name, { on: recordOn, note: noteText, ...(tracked ? { reference: refText, followUpOn: followText } : {}) })
    void action(async () => { await saveRequest(sample, { ...r.draft, ...patch }, r.revision, deviceOnly); setNoting(null); setStatus(say('Saved to your record.', 'Guardado en tu registro.')) })
  }
  function writeFollowUp(r: HelpRequest, route: HelpRoute) {
    void action(async () => { const next = await saveRequest(sample, followUpDraft(r.draft, route, crypto.randomUUID()), 0, deviceOnly); onResume(next) })
  }
  function remove(r: HelpRequest, draft: boolean) {
    const ask = draft ? say('Delete this draft and its stored attachments?', '¿Borrar este borrador y sus archivos guardados?') : say('Delete this request and its stored attachments? Sent emails cannot be recalled.', '¿Borrar esta solicitud y sus archivos guardados? No se pueden retirar correos enviados.')
    if (window.confirm(ask)) void action(async () => { await removeRequest(sample, r.id, deviceOnly); open(undefined) })
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setStatus(say('Copied.', 'Copiado.')) } catch { setStatus(say('Could not copy. Select the text instead.', 'No se pudo copiar. Selecciona el texto.')) }
  }

  const primaryLabel: Record<PrimaryAction, string> = { continue: say('Continue draft', 'Continuar borrador'), 'follow-up': say('Log a follow-up', 'Registrar un seguimiento'), update: say('Log an update', 'Registrar una novedad'), record: say('Check the send', 'Revisar el envío') }
  function runPrimary(r: HelpRequest, act: PrimaryAction) {
    if (act === 'continue') { onResume(r); return }
    if (chosen?.id !== r.id) open(r.id)
    if (act === 'record') { setFullRecord(true); return }
    startRecord(r, act === 'follow-up' ? 'follow-up' : 'update')
  }
  const primaryButton = (r: HelpRequest, state: RequestState) => state.action
    ? <button className={`primary history-primary${state.action === 'continue' ? ' request-resume' : ''} tone-${state.tone}`} disabled={busy} onClick={e => { e.stopPropagation(); runPrimary(r, state.action!) }}>{primaryLabel[state.action]}<Icon name="arrow-right" size={18} /></button>
    : null

  // The page's single privacy line. Nothing else on the page repeats it.
  const privacyNote = sample
    ? say('Sample requests are fictional and stay on this device. This page shows only what you log here; nothing is sent, and no real messages or replies are involved.', 'Las solicitudes de ejemplo son ficticias y se quedan en este dispositivo. Esta página solo muestra lo que registras aquí; no se envía nada y no hay mensajes ni respuestas reales.')
    : deviceOnly
      ? say('This page shows only what you log here. WAVE can’t see your calls, emails or any reply, and nothing is sent to WAVE or saved to an account — it stays on this device.', 'Esta página solo muestra lo que registras aquí. WAVE no puede ver tus llamadas, correos ni ninguna respuesta, y no se envía nada a WAVE ni se guarda en una cuenta: se queda en este dispositivo.')
      : say('This page shows only what you log here and the messages WAVE sent for you. WAVE can’t see your calls or any reply that arrives elsewhere. Your requests are saved privately in your WAVE account.', 'Esta página solo muestra lo que registras aquí y los mensajes que WAVE envió por ti. WAVE no puede ver tus llamadas ni las respuestas que lleguen por otros medios. Tus solicitudes se guardan de forma privada en tu cuenta de WAVE.')

  const footer = <>
    <p className="history-footnote">{privacyNote}</p>
    {email ? <details className="request-account-tools"><summary>{email}</summary><p>{say('Saved requests and attachments are stored privately by WAVE. Sent copies remain with recipients and the email processor after you delete History. Incoming attachments are not imported. Device-data deletion does not delete your account History.', 'WAVE guarda las solicitudes y archivos de forma privada. Las copias enviadas permanecen con los destinatarios y el procesador de correo después de borrar Historial. No se importan adjuntos recibidos. Borrar datos del dispositivo no borra el Historial de la cuenta.')}</p><button className="secondary" onClick={() => void action(async () => { await helpApi('/session', undefined, 'DELETE'); window.location.reload() })}>{say('Sign out', 'Cerrar sesión')}</button><button className="danger" disabled={busy} onClick={() => { if (window.confirm(say('Delete all your WAVE requests, drafts and attachments? Sent emails cannot be recalled. This does not delete your managed account.', '¿Borrar todas tus solicitudes, borradores y archivos de WAVE? No se pueden retirar correos enviados. Esto no elimina tu cuenta.'))) void action(() => removeRequest(false)) }}>{say('Delete all History', 'Borrar todo el Historial')}</button></details> : null}
    <p className="sr-only" role="status">{status}</p>
    {error ? <p className="history-error" role="alert">{error}</p> : null}
  </>
  const refresh = (label: string) => <button className="text-button history-refresh" disabled={busy} onClick={() => void load()}><Icon name="refresh-cw" size={16} />{label}</button>

  if (!loaded) return <><p role="status">{say('Loading History…', 'Cargando Historial…')}</p>{footer}</>

  if (!records.length) return <>
    <section className="history-empty" aria-labelledby={`${ids}-empty`}>
      <span className="history-empty-icon" aria-hidden="true"><Icon name="history" size={26} /></span>
      <h1 id={`${ids}-empty`}>{say('History', 'Historial')}</h1>
      <p>{sample ? say('Sample requests you save appear here, on this device only.', 'Las solicitudes de ejemplo que guardes aparecen aquí, solo en este dispositivo.') : deviceOnly ? say('Requests you save appear here. They stay on this device.', 'Las solicitudes que guardes aparecen aquí. Se quedan en este dispositivo.') : say('Requests you save to your account appear here.', 'Las solicitudes que guardes en tu cuenta aparecen aquí.')}</p>
      {onStart ? <button className="primary" onClick={onStart}>{say('Get help with a water issue', 'Obtener ayuda con un problema de agua')}<Icon name="arrow-right" size={18} /></button> : null}
    </section>
    {footer}
  </>

  if (chosen) return <>{detail(chosen)}{footer}</>

  // Two or more: grouped list.
  const groups = groupRequests(records, language, today)
  return <>
    <header className="history-list-head">
      <div><h1>{say('History', 'Historial')}</h1><p>{say(`${records.length} saved requests`, `${records.length} solicitudes guardadas`)}</p></div>
      {refresh(say('Refresh History', 'Actualizar Historial'))}
    </header>
    {GROUP_ORDER.filter(g => groups[g].length).map(g => {
      const items = groups[g], collapsible = g === 'closed' && items.length > 3
      const heading = <h2 className="history-group-title" id={`${ids}-${g}`}>{GROUP_LABELS[g][es ? 1 : 0]} <span>{items.length}</span></h2>
      const list = <ul className="history-rows" aria-labelledby={`${ids}-${g}`}>{items.map(row)}</ul>
      return <section key={g} className={`history-group history-group--${g}`}>
        {collapsible ? <details className="history-closed" open={closedOpen} onToggle={e => setClosedOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>{heading}<Icon name="chevron-down" size={18} /></summary>{list}</details> : <>{heading}{list}</>}
      </section>
    })}
    {onStart ? <div className="history-list-start"><button className="history-start" onClick={onStart}>{say('Start another request', 'Empezar otra solicitud')}<Icon name="arrow-right" size={16} /></button></div> : null}
    {footer}
  </>

  function row(r: HelpRequest) {
    const state = requestState(r, language, today), latest = requestTimeline(r, language, today).find(i => !i.future && i.id !== 'follow')
    const unsent = state.kind === 'draft' || state.kind === 'ready'
    const activity = latest ? `${latest.label} · ${latest.when}` : unsent ? `${say('You stopped at', 'Te quedaste en')} ${stepLabel(r.draft, language)}` : ''
    return <li key={r.id} className={`history-row tone-${state.tone}`} onClick={e => { if (!(e.target as HTMLElement).closest('button, a, summary, input, select, textarea')) open(r.id) }}>
      <div className="history-row-top"><span className={`history-chip tone-${state.tone}`}>{state.chip}</span>{saved(r)}</div>
      <h3 className="history-row-title"><button title={subjectOf(r)} onClick={e => { e.stopPropagation(); open(r.id) }}>{subjectOf(r)}</button></h3>
      <p className="history-row-meta">{supplierDisplayName(r.draft.place.name)} · {category(r)}</p>
      {state.group !== 'closed' ? <ProgressTracker request={r} language={language} compact /> : null}
      {activity ? <p className="history-row-foot">{activity}</p> : null}
    </li>
  }

  /** The log form: one dialog for every kind of resident-recorded update. */
  function recordDialog(r: HelpRequest, state: RequestState) {
    if (!noting) return null
    const tracked = noting === 'follow-up' || noting === 'update', followField = tracked || noting === 'details'
    const title: Record<RecordKind, string> = { 'follow-up': say('Log a follow-up', 'Registrar un seguimiento'), update: say('Log an update', 'Registrar una novedad'), details: say('Update contact details', 'Actualizar datos del contacto'), resolved: say('Mark as resolved', 'Marcar como resuelto'), closed: say('Stop pursuing this', 'Dejar de darle seguimiento'), reopened: say('Reopen', 'Reabrir') }
    return <HistoryDialog title={title[noting]} subtitle={supplierDisplayName(state.contact?.name ?? r.draft.place.name)} language={language} onClose={() => setNoting(null)}>
      <form className="history-record" onSubmit={e => { e.preventDefault(); saveRecord(r, state) }}>
        <div className="history-record-grid">
          {tracked ? <label>{say('What happened?', '¿Qué pasó?')}<select value={method} onChange={e => setMethod(e.target.value as HelpOutcomeKind)}>
            {noting === 'update' ? <option value="reply">{say('They replied', 'Respondieron')}</option> : null}
            <option value="called">{say('I called them', 'Los llamé')}</option>
            <option value="emailed">{say('I emailed or messaged them', 'Les envié un correo o mensaje')}</option>
            <option value="form">{say('I used their online form', 'Usé su formulario en línea')}</option>
            <option value="unreachable">{say('I couldn’t reach them', 'No pude comunicarme')}</option>
          </select></label> : null}
          <label>{noting === 'details' ? say('Contact date', 'Fecha de contacto') : say('Date', 'Fecha')}<input type="date" required max={today} value={recordOn} onChange={e => setRecordOn(e.target.value)} /></label>
          {followField ? <label>{say('Reference or ticket number (optional)', 'Número de referencia o caso (opcional)')}<input value={refText} maxLength={100} onChange={e => setRefText(e.target.value)} /></label> : null}
          {followField ? <div className="history-record-field">
            <label>{say('When should you follow up? (optional)', '¿Cuándo dar seguimiento? (opcional)')}<input type="date" value={followText} onChange={e => setFollowText(e.target.value)} aria-describedby={`${ids}-follow-help`} /></label>
            <small id={`${ids}-follow-help`} className="history-field-help">{say(`Suggested ${FOLLOW_UP_BUSINESS_DAYS} weekdays after contact; public holidays aren’t taken into account. It’s a reminder for you — WAVE won’t notify anyone.`, `Sugerido ${FOLLOW_UP_BUSINESS_DAYS} días hábiles después del contacto; no se tienen en cuenta los feriados. Es un recordatorio para ti: WAVE no notificará a nadie.`)}</small>
          </div> : null}
          <label className="history-record-wide">{noting === 'resolved' || noting === 'closed' || noting === 'reopened' ? say('Note (optional)', 'Nota (opcional)') : say('What did they tell you? (optional)', '¿Qué te dijeron? (opcional)')}<textarea rows={3} maxLength={500} value={noteText} onChange={e => setNoteText(e.target.value)} /></label>
        </div>
        <div className="history-record-actions"><button type="button" className="secondary" onClick={() => setNoting(null)}>{say('Cancel', 'Cancelar')}</button><button className="primary" disabled={busy || !recordOn || recordOn > today}>{say('Save', 'Guardar')}</button></div>
      </form>
    </HistoryDialog>
  }

  /** Everything kept with the request that the page itself does not show. */
  function recordSheet(r: HelpRequest, state: RequestState, unsent: boolean) {
    const contactRoute = state.contact?.route ?? r.draft.route, escalate = escalationRoute(r.draft.issue)
    const facts: [string, string][] = [
      [say('What you noticed', 'Lo que notaste'), [...Object.values(r.draft.wording?.report ?? {}), r.draft.description].map(v => v.trim()).filter(Boolean).join(' · ') || say('Not filled in yet', 'Aún sin completar')],
      [say('Where', 'Dónde'), (r.draft.locations ?? []).join('; ') || say('Not filled in yet', 'Aún sin completar')],
      ...(unsent ? [[say('You stopped at', 'Te quedaste en'), stepLabel(r.draft, language)] as [string, string]] : []),
    ]
    return <HistoryDialog title={say('Full record', 'Registro completo')} subtitle={subjectOf(r)} language={language} wide onClose={() => setFullRecord(false)}>
      <dl className="history-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {r.original && [r.original.description, r.original.dates, r.original.context].some(v => v?.trim()) ? <details><summary>{say('Original issue', 'Problema original')}</summary><p>{r.original.description}</p><p>{r.original.dates}</p><pre className="request-text">{r.original.context}</pre></details> : null}
      {r.messages.length ? <ol className="request-timeline history-messages">{r.messages.map(m => <li key={m.id}>
        <time dateTime={new Date(m.at).toISOString()}>{dateTime(m.at, language)}</time>
        <h3>{m.direction === 'incoming' ? say('Reply received', 'Respuesta recibida') : say('Sent through WAVE', 'Enviado por WAVE')}</h3>
        <p>{(m.destinations ?? [m.destination]).join(', ')}</p><h4>{m.subject}</h4><pre className="request-text">{m.body}</pre>
        {m.attachments.map(a => <button key={a.id} className="action-chip" onClick={() => attachment(a)}><Icon name="download" size={16} />{say('Download', 'Descargar')}: {a.name}</button>)}
        {m.sources?.length ? <details><summary>{say('Sources saved with message', 'Fuentes guardadas con el mensaje')} — {m.subject}</summary><RequestSources sources={m.sources} es={es} /></details> : null}
        {m.unsupportedAttachments ? <p>{say('This reply included attachments that WAVE cannot import. Obtain them through the original email channel.', 'Esta respuesta incluía archivos que WAVE no puede importar. Obtenlos por el canal original de correo.')}</p> : null}
        {m.direction === 'outgoing' && ['unknown', 'sending'].includes(m.delivery) && delivery ? <><p>{say('Do not send another copy. Within 23 hours, retrying uses the exact same message and send key; after that, contact support. Wait at least 30 seconds between attempts.', 'No envíes otra copia. Dentro de 23 horas, reintentar usa el mismo mensaje y clave; después, contacta al soporte. Espera al menos 30 segundos entre intentos.')}</p><button className="secondary" disabled={busy || Date.now() - m.at > 23 * 3600000} onClick={() => void action(() => helpApi(`/requests/${r.id}/send`, { messageId: m.id }))}>{say('Check / retry same send', 'Comprobar / reintentar el mismo envío')}</button></> : null}
      </li>)}</ol> : null}
      {state.contact && escalate && escalate !== contactRoute && !isClosed(r.draft) ? <NextContactGuidance route={escalate} language={language} /> : null}
    </HistoryDialog>
  }

  function detail(r: HelpRequest) {
    const state = requestState(r, language, today), last = contacted(r.draft), closed = isClosed(r.draft)
    const unsent = state.kind === 'draft' || state.kind === 'ready'
    const timeline = requestTimeline(r, language, today)
    const sentMessage = r.messages.filter(m => m.direction === 'outgoing').at(-1)
    const recipients = selectedRecipients(r.draft)
    const to = sentMessage ? (sentMessage.destinations ?? [sentMessage.destination]).join(', ') : recipients.map(x => supplierDisplayName(x.name)).join(', ')
    const subject = sentMessage?.subject ?? r.draft.subject, body = sentMessage?.body ?? r.draft.body
    const mail = !sample && !sentMessage && recipients[0]?.email && body.trim() ? mailtoUrl(recipients[0].email, subject, body) : undefined
    const contactRoute = state.contact?.route ?? r.draft.route, reach = sendOption(r.draft, contactRoute, true)
    const escalate = escalationRoute(r.draft.issue)
    const bodyId = `${ids}-body`
    const messageLabel = sentMessage ? say('Sent through WAVE', 'Enviado por WAVE') : state.contact ? say('The draft you prepared', 'El borrador que preparaste') : say('Draft — not sent', 'Borrador — sin enviar')

    return <article className="history-detail" aria-labelledby={`${ids}-title`}>
      {records.length > 1 ? <div className="history-topbar"><button className="history-back" onClick={() => open(undefined)}><Icon name="chevron-left" size={18} />{say('All requests', 'Todas las solicitudes')}</button></div> : null}

      {/* a. Status: the state row and the stages describe the same thing, so they share one card. */}
      <section className="history-card history-card--status">
        <h1 className="history-request-title" id={`${ids}-title`}>{subjectOf(r)}</h1>
        <div className={`history-strip tone-${state.tone}`} role="region" aria-labelledby={`${ids}-strip`}>
          <span className="history-strip-icon" aria-hidden="true"><Icon name={STRIP_ICON[state.kind]} size={22} /></span>
          <div className="history-strip-text"><h2 id={`${ids}-strip`}>{state.title}</h2><p>{state.detail}</p></div>
          {state.action === 'continue' && onStart ? <button className="history-start" onClick={onStart}>{say('Start another request', 'Empezar otra solicitud')}<Icon name="arrow-right" size={16} /></button> : primaryButton(r, state)}
        </div>
        <ProgressTracker request={r} language={language} />
      </section>

      <div className="history-content-grid">
      <div className="history-content-column">
      {/* b. Your message */}
      <h2 className="history-label" id={`${ids}-message`}>{say('Your message', 'Tu mensaje')}</h2>
      <section className="history-card history-card--message" aria-labelledby={`${ids}-message`}>
        <div className="history-card-head">
          <span>{messageLabel}{sentMessage ? ` · ${dateTime(sentMessage.at, language)}` : ''}</span>
          <div className="history-icon-actions">
            {unsent && r.status === 'open' ? <IconAction label={say('Edit message', 'Editar mensaje')} icon="edit" onClick={() => onResume(r)} /> : null}
            {mail ? <IconAction label={say('Open in your email app', 'Abrir en tu app de correo')} icon="external-link" href={mail.url} /> : null}
            {body.trim() ? <IconAction label={say('Copy message', 'Copiar mensaje')} icon="copy" onClick={() => void copy(`${subject}\n\n${body}`)} /> : null}
          </div>
        </div>
        <dl className="history-message-rows">
          <div><dt>{say('To', 'Para')}</dt><dd>{to || '—'}</dd></div>
          <div><dt>{say('Subject', 'Asunto')}</dt><dd>{subject || '—'}</dd></div>
        </dl>
        {body.trim() ? <>
          <div id={bodyId} className={`history-message-body${isLong(body) && !messageOpen ? ' is-clipped' : ''}`}>{body}</div>
          {isLong(body) ? <button type="button" className="history-message-toggle" aria-expanded={messageOpen} aria-controls={bodyId} onClick={() => setMessageOpen(v => !v)}>{messageOpen ? say('Show less', 'Mostrar menos') : say('Show full message', 'Mostrar el mensaje completo')}<Icon name="chevron-down" size={18} className={messageOpen ? 'is-flipped' : undefined} /></button> : null}
        </> : <p className="history-message-empty">{say('No message written yet.', 'Aún no has escrito el mensaje.')}</p>}
      </section>
      </div>

      {/* c. Details: how to reach them, what has happened, and the quieter actions. */}
      <div className="history-content-column history-details-column">
      <h2 className="history-label" id={`${ids}-details`}>{say('Details', 'Detalles')}</h2>
      <section className="history-card history-card--details" aria-labelledby={`${ids}-details`}>
        <div className="history-detail-cols">
          <div className="history-col">
            <h3 className="history-col-title">{state.contact ? say('Reach them again', 'Volver a contactarlos') : say('How to reach them', 'Cómo contactarlos')}</h3>
            <p className="history-reach-name">{supplierDisplayName(reach.name)}</p>
            {reach.email || reach.phone || reach.formUrl ? <ul className="history-reach">
              {reach.email ? <li><Icon name="mail" size={18} /><span>{reach.email}</span><IconAction label={say('Copy email address', 'Copiar correo electrónico')} icon="copy" onClick={() => void copy(reach.email!)} /></li> : null}
              {reach.phone ? <li><Icon name="phone" size={18} /><span>{reach.phone}</span>{sample || !reach.dial ? <IconAction label={say('Copy phone number', 'Copiar número')} icon="copy" onClick={() => void copy(reach.phone!)} /> : <IconAction label={say(`Call ${reach.phone}`, `Llamar al ${reach.phone}`)} icon="phone" href={`tel:${reach.dial}`} />}</li> : null}
              {reach.formUrl ? <li><Icon name="file-text" size={18} /><span>{say('Online complaint form', 'Formulario de quejas en línea')}</span>{sample ? null : <IconAction label={say('Open the form (new tab)', 'Abrir el formulario (pestaña nueva)')} icon="external-link" href={reach.formUrl} />}</li> : null}
            </ul> : <p className="history-muted">{say('WAVE has no verified email or phone number for this office. Use the contact details on your bill.', 'WAVE no tiene un correo ni teléfono verificado para esta oficina. Usa los datos de contacto de tu factura.')}</p>}
          </div>
          <div className="history-col">
            <h3 className="history-col-title">{say('What happened', 'Qué pasó')}</h3>
            {timeline.length ? <ol className="history-timeline">{timeline.map(item => <li key={item.id} className={item.future ? 'is-future' : undefined}>
              <span className="history-timeline-dot" aria-hidden="true" />
              <p><b>{item.label}</b> <span>· {item.when}</span></p>
              {item.note ? <p className="history-timeline-note">{item.note}</p> : null}
            </li>)}</ol> : <p className="history-muted">{say('Nothing recorded yet. When you contact them, log it here.', 'Aún no hay nada registrado. Cuando los contactes, regístralo aquí.')}</p>}
          </div>
        </div>
        <div className="history-more-actions" role="group" aria-label={say('More actions', 'Más acciones')}>
          <button className="history-quiet" disabled={busy} onClick={() => setFullRecord(true)}><Icon name="list" size={16} />{say('Full record', 'Registro completo')}</button>
          {r.status === 'open' && !closed && (last || sentMessage) ? <button className="history-quiet" disabled={busy} onClick={() => writeFollowUp(r, last?.route ?? r.draft.route)}><Icon name="mail" size={16} />{say(`Write a follow-up to ${supplierDisplayName(last?.name ?? r.draft.place.name)}`, `Escribir seguimiento a ${supplierDisplayName(last?.name ?? r.draft.place.name)}`)}</button> : null}
          {r.status === 'open' && !closed && state.contact && escalate && escalate !== contactRoute ? <button className="history-quiet" disabled={busy} onClick={() => writeFollowUp(r, escalate)}><Icon name="arrow-right" size={16} />{say(`Contact ${sendOption(r.draft, escalate, false).name}`, `Contactar a ${sendOption(r.draft, escalate, false).name}`)}</button> : null}
          {last ? <button className="history-quiet" disabled={busy} onClick={() => startRecord(r, 'details')}><Icon name="edit" size={16} />{say('Update contact details', 'Actualizar datos del contacto')}</button> : null}
          {last && r.draft.followUpOn && !sample && !closed ? <button className="history-quiet" onClick={() => downloadText('wave-follow-up.ics', reminderIcs(r.draft, language) ?? '', 'text/calendar;charset=utf-8')}><Icon name="calendar" size={16} />{say('Add a reminder to my calendar', 'Añadir un recordatorio a mi calendario')}</button> : null}
          {state.contact && !closed && r.status === 'open' ? <button className="history-quiet" disabled={busy} onClick={() => startRecord(r, 'closed')}><Icon name="minus" size={16} />{say('I’m no longer pursuing this', 'Ya no continúo con esto')}</button> : null}
          {!sample && !deviceOnly ? <button className="history-quiet" disabled={busy} onClick={() => void action(() => helpApi(`/requests/${r.id}/status`, { status: r.status === 'open' ? 'closed' : 'open' }))}><Icon name="check" size={16} />{r.status === 'open' ? say('Close request', 'Cerrar solicitud') : say('Reopen request', 'Reabrir solicitud')}</button> : null}
          <button className="history-quiet history-delete" disabled={busy} onClick={() => remove(r, unsent && !r.messages.length)}><Icon name="trash-2" size={16} />{unsent && !r.messages.length ? say('Delete draft', 'Borrar borrador') : say('Delete request', 'Borrar solicitud')}</button>
        </div>
      </section>
      {state.action === 'continue' && onStart ? <div className="history-detail-start">{primaryButton(r, state)}</div> : onStart ? <div className="history-detail-start"><button className="history-start" onClick={onStart}>{say('Start another request', 'Empezar otra solicitud')}<Icon name="arrow-right" size={16} /></button></div> : null}
      </div>
      </div>

      <div className="history-actions">
        {state.group === 'closed'
          ? closed ? <button className="secondary" disabled={busy} onClick={() => startRecord(r, 'reopened')}>{say('Reopen', 'Reabrir')}</button> : null
          : state.contact || r.draft.outcomes?.length ? <button className="secondary" disabled={busy} onClick={() => startRecord(r, 'resolved')}>{say('Mark as resolved', 'Marcar como resuelto')}</button> : null}
      </div>

      {recordDialog(r, state)}
      {fullRecord ? recordSheet(r, state, unsent) : null}
    </article>
  }
}
