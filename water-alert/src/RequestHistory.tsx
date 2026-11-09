import { useEffect, useState } from 'react'
import { Icon } from './icons'
import type { Language } from './domain'
import { HelpAccount } from './HelpAccount'
import { helpApi, listRequests, removeRequest, saveRequest } from './help-client'
import type { HelpAttachment, HelpRequest } from './help-requests'
import './requests.css'
import { RequestSources } from './RequestSources'
import { contacted, followUpState, isResolved, outcomeLabel, recordOutcome } from './help-outcomes'
import { escalationRoute, followUpDraft, sendOption } from './send-options'
import { readableDate, supplierDisplayName } from './help-format'
import { stepLabel } from './help-flow'
import { ISSUE_LABELS } from './help-questions'
import type { HelpOutcomeKind, HelpRoute } from './help-requests'
export function RequestHistory({ language, sample, requestId, onResume }: { language: Language; sample: boolean; requestId?: string; onResume: (request: HelpRequest) => void }) {
  return <div className="request-history narrow-page">{sample ? <History language={language} sample requestId={requestId} onResume={onResume} deviceOnly={false} /> : <HelpAccount language={language}>{s => <History key={s.user?.id ?? 'device'} language={language} sample={false} requestId={requestId} onResume={onResume} email={s.user?.email} delivery={s.delivery} deviceOnly={!s.user} />}</HelpAccount>}</div>
}
function attachment(a: HelpAttachment) {
  const bytes = Uint8Array.from(atob(a.data), c => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: a.type }))
  const link = document.createElement('a'); link.href = url; link.download = a.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function History({ language, sample, requestId, onResume, email, delivery, deviceOnly }: { language: Language; sample: boolean; requestId?: string; onResume: (request: HelpRequest) => void; email?: string; delivery?: boolean; deviceOnly: boolean }) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const [records, setRecords] = useState<HelpRequest[]>([]), [selected, setSelected] = useState<string | undefined>(requestId), [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const labels = { sending: say('Sending', 'Enviando'), sent: say('Sent', 'Enviado'), delivered: say('Delivered', 'Entregado'), failed: say('Failed', 'Fallido'), unknown: say('Send outcome unknown', 'Resultado del envío desconocido'), open: say('Open', 'Abierto'), closed: say('Closed by you', 'Cerrado por ti') }
  const issueLabels = { service: say('Service or outage', 'Servicio o corte de agua'), quality: say('Water quality', 'Calidad del agua'), billing: say('Bill, credit or expenses', 'Factura, crédito o gastos'), legal: say('Legal help', 'Ayuda legal'), advisory: say('Advisory question', 'Consulta sobre un aviso'), other: say('Other water-service issue', 'Otro problema del servicio de agua'), report: say('Question about a water report', 'Pregunta sobre un informe del agua') }
  async function load() { try { setRecords(await listRequests(sample, deviceOnly)); setLoaded(true); setError('') } catch { setError(say('Could not load History. Sign in again if your session expired. Nothing was deleted.', 'No se pudo cargar Historial. Inicia sesión de nuevo si caducó. No se eliminó nada.')) } }
  useEffect(() => { void load(); if (sample) return; const timer = setInterval(() => void load(), 20000); return () => clearInterval(timer) }, [sample])
  async function action(work: () => Promise<unknown>) { setBusy(true); setError(''); try { await work(); await load() } catch { setError(say('Could not complete this action. Reload before trying again.', 'No se pudo completar la acción. Recarga antes de reintentar.')) } finally { setBusy(false) } }
  const r = records.find(r => r.id === selected)
  // Where the resident stands, in their words: never "Open".
  const standing = (item: HelpRequest) => item.status === 'closed' ? labels.closed : isResolved(item.draft) ? say('Resolved', 'Resuelto') : contacted(item.draft) || item.messages.some(m => m.direction === 'outgoing') ? say('Sent – waiting for reply', 'Enviado – esperando respuesta') : say('Not sent yet', 'Aún no enviado')
  const isDraft = (item: HelpRequest) => !item.messages.length && !contacted(item.draft)
  const [noting, setNoting] = useState<HelpOutcomeKind | null>(null), [noteText, setNoteText] = useState('')
  const escalate = r ? escalationRoute(r.draft.issue) : undefined
  function note(kind: HelpOutcomeKind) {
    if (!r) return
    const last = contacted(r.draft)!
    void action(async () => { await saveRequest(sample, { ...r.draft, ...recordOutcome(r.draft, kind, last.route, last.name, { note: noteText }) }, r.revision, deviceOnly); setNoting(null) })
  }
  function followUp(route: HelpRoute) {
    if (!r) return
    void action(async () => { const saved = await saveRequest(sample, followUpDraft(r.draft, route, crypto.randomUUID()), 0, deviceOnly); onResume(saved) })
  }
  return <>
    <header className="request-history-header"><h1>{say('History', 'Historial')}</h1><button className="text-button" disabled={busy} onClick={() => void load()}><span aria-hidden="true">↻</span> {say('Refresh History', 'Actualizar Historial')}</button></header>
    <p className="request-history-intro">{sample ? say('Sample drafts — device only. No live messages or replies.', 'Borradores de ejemplo — solo en este dispositivo. Sin mensajes ni respuestas reales.') : deviceOnly ? say('Live drafts saved on this device only. They are not sample data, sent messages or private account History.', 'Borradores reales guardados solo en este dispositivo. No son datos de ejemplo, mensajes enviados ni Historial privado de una cuenta.') : say('Your private drafts and conversations. Delivery does not mean your issue is resolved.', 'Tus borradores y conversaciones privados. La entrega no significa que el problema esté resuelto.')}</p>
    {email ? <details className="request-account-tools"><summary>{email}</summary><p>{say('Saved requests and attachments are stored privately by WAVE. Sent copies remain with recipients and the email processor after you delete History. Incoming attachments are not imported. Device-data deletion does not delete your account History.', 'WAVE guarda las solicitudes y archivos de forma privada. Las copias enviadas permanecen con los destinatarios y el procesador de correo después de borrar Historial. No se importan adjuntos recibidos. Borrar datos del dispositivo no borra el Historial de la cuenta.')}</p><button className="secondary" onClick={() => void action(async () => { await helpApi('/session', undefined, 'DELETE'); window.location.reload() })}>{say('Sign out', 'Cerrar sesión')}</button><button className="danger" disabled={busy} onClick={() => { if (window.confirm(say('Delete all your WAVE requests, drafts and attachments? Sent emails cannot be recalled. This does not delete your managed account.', '¿Borrar todas tus solicitudes, borradores y archivos de WAVE? No se pueden retirar correos enviados. Esto no elimina tu cuenta.'))) void action(() => removeRequest(false)) }}>{say('Delete all History', 'Borrar todo el Historial')}</button></details> : null}
    {r && isDraft(r) && r.status === 'open' ? <section className="request-card request-draft-summary" aria-label={say('Draft summary', 'Resumen del borrador')}>
      <button className="back" onClick={() => { setSelected(undefined); window.history.replaceState(null, '', window.location.pathname + window.location.search) }}><Icon name="chevron-left" size={18} />{say('All requests', 'Todas las solicitudes')}</button>
      <header className="request-title-row"><h2>{r.draft.subject || say('Water issue', 'Problema de agua')}</h2><p className="request-provider">{supplierDisplayName(r.draft.place.name)} · {standing(r)}</p></header>
      <dl className="request-draft-facts">
        <div><dt>{say('Problem', 'Problema')}</dt><dd>{ISSUE_LABELS[r.draft.issue][es ? 1 : 0]}</dd></div>
        <div><dt>{say('What you noticed', 'Lo que notaste')}</dt><dd>{[...Object.values(r.draft.wording?.report ?? {}), r.draft.description].map(v => v.trim()).filter(Boolean).join(' · ') || say('Not filled in yet', 'Aún sin completar')}</dd></div>
        <div><dt>{say('Where', 'Dónde')}</dt><dd>{(r.draft.locations ?? []).join('; ') || say('Not filled in yet', 'Aún sin completar')}</dd></div>
        <div><dt>{say('You stopped at', 'Te quedaste en')}</dt><dd>{stepLabel(r.draft, language)}</dd></div>
        <div><dt>{say('Last saved', 'Guardado por última vez')}</dt><dd><time dateTime={new Date(r.updatedAt).toISOString()}>{new Intl.DateTimeFormat(es ? 'es-US' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(r.updatedAt)}</time></dd></div>
      </dl>
      <div className="request-card-action"><button className="primary" disabled={busy} onClick={() => onResume(r)}>{say('Continue draft', 'Continuar borrador')}</button></div>
      <button className="text-button request-delete-draft" disabled={busy} onClick={() => { if (window.confirm(say('Delete this draft and its stored attachments?', '¿Borrar este borrador y sus archivos guardados?'))) void action(async () => { await removeRequest(sample, r.id, deviceOnly); setSelected(undefined) }) }}>{say('Delete draft', 'Borrar borrador')}</button>
    </section> : r ? <article className="request-conversation">
      <button className="back" onClick={() => { setSelected(undefined); window.history.replaceState(null, '', window.location.pathname + window.location.search) }}><Icon name="chevron-left" size={18} />{say('All requests', 'Todas las solicitudes')}</button>
      <h2>{r.original?.subject || r.draft.subject || say('Water issue', 'Problema de agua')}</h2><p>{supplierDisplayName(r.draft.place.name)} · <b>{standing(r)}</b></p>
      {[(r.original ?? r.draft).description, (r.original ?? r.draft).dates, (r.original ?? r.draft).context].some(v => v?.trim()) ? <details><summary>{say('Original issue', 'Problema original')}</summary><p>{(r.original ?? r.draft).description}</p><p>{(r.original ?? r.draft).dates}</p><pre className="request-text">{(r.original ?? r.draft).context}</pre></details> : null}
      {r.messages.filter(m => m.direction === 'outgoing' && m.sources?.length).map(m => <details key={m.id}><summary>{say('Sources saved with message', 'Fuentes guardadas con el mensaje')} — {m.subject}</summary><RequestSources sources={m.sources} es={es} /></details>)}
      <ol className="request-timeline">{[...r.messages.map(m => ({ at: m.at, id: m.id, message: m, kind: '' })), ...r.events.map(e => ({ ...e, message: null }))].sort((a, b) => a.at - b.at).map(item => <li key={item.id}><time dateTime={new Date(item.at).toISOString()}>{new Date(item.at).toLocaleString(es ? 'es-US' : 'en-US')}</time>{item.message ? <><h3>{item.message.direction === 'incoming' ? say('Reply received', 'Respuesta recibida') : labels[item.message.delivery]}</h3><p>{(item.message.destinations ?? [item.message.destination]).join(', ')}</p><h4>{item.message.subject}</h4><pre className="request-text">{item.message.body}</pre>{item.message.attachments.map(a => <button key={a.id} className="text-button" onClick={() => attachment(a)}>{say('Download', 'Descargar')}: {a.name}</button>)}{item.message.unsupportedAttachments ? <p>{say('This reply included attachments that WAVE cannot import. Obtain them through the original email channel.', 'Esta respuesta incluía archivos que WAVE no puede importar. Obtenlos por el canal original de correo.')}</p> : null}{['unknown', 'sending'].includes(item.message.delivery) && delivery ? <><p>{say('Do not send another copy. Within 23 hours, retrying uses the exact same message and send key; after that, contact support. Wait at least 30 seconds between attempts.', 'No envíes otra copia. Dentro de 23 horas, reintentar usa el mismo mensaje y clave; después, contacta al soporte. Espera al menos 30 segundos entre intentos.')}</p><button className="secondary" disabled={busy || Date.now() - item.message.at > 23 * 3600000} onClick={() => void action(() => helpApi(`/requests/${r.id}/send`, { messageId: item.message!.id }))}>{say('Check / retry same send', 'Comprobar / reintentar el mismo envío')}</button></> : null}</> : <p>{Object.hasOwn(labels, item.kind) ? labels[item.kind as keyof typeof labels] : item.kind}</p>}</li>)}</ol>
      {r.draft.outcomes?.length || r.draft.priorContact ? <section className="request-outcomes" aria-labelledby="request-outcomes-heading">
        <h3 id="request-outcomes-heading">{say('What you recorded', 'Lo que registraste')}</h3>
        <p className="quiet-note">{say('Your own notes. WAVE cannot confirm delivery, calls, replies or resolution.', 'Tus propias notas. WAVE no puede confirmar entregas, llamadas, respuestas ni soluciones.')}</p>
        <ol className="request-timeline">
          {r.draft.priorContact ? <li><time dateTime={r.draft.priorContact.on}>{readableDate(r.draft.priorContact.on, language)}</time><p>{say('Follow-up to your earlier contact with', 'Seguimiento de tu contacto anterior con')} {r.draft.priorContact.name}{r.draft.priorContact.reference ? ` (${say('ref.', 'ref.')} ${r.draft.priorContact.reference})` : ''}</p></li> : null}
          {(r.draft.outcomes ?? []).map(o => <li key={o.id}><time dateTime={o.on}>{readableDate(o.on, language)}</time><p>{outcomeLabel(o, language)}{o.reference ? ` (${say('ref.', 'ref.')} ${o.reference})` : ''}</p>{o.note ? <p className="request-text">{o.note}</p> : null}</li>)}
        </ol>
        {followUpState(r.draft) === 'due' ? <p className="request-follow-due" role="note">{say(`No reply recorded since ${readableDate(contacted(r.draft)!.on, language)}. You could follow up or contact the next office.`, `No hay respuesta registrada desde el ${readableDate(contacted(r.draft)!.on, language)}. Puedes dar seguimiento o contactar la siguiente oficina.`)}</p> : followUpState(r.draft) === 'waiting' ? <p className="quiet-note">{say('Follow-up reminder', 'Recordatorio de seguimiento')}: {readableDate(r.draft.followUpOn, language)} ({say('5 business days; holidays not counted', '5 días hábiles; no se cuentan feriados')}).</p> : null}
      </section> : null}
      {contacted(r.draft) && !sample ? <div className="request-outcome-tools">
        {noting ? <form className="send-confirm" onSubmit={e => { e.preventDefault(); note(noting) }}>
          <h3>{noting === 'reply' ? say('Record a reply', 'Registrar una respuesta') : noting === 'resolved' ? say('Mark resolved', 'Marcar como resuelto') : say('Mark not resolved', 'Marcar como no resuelto')}</h3>
          <label>{say('Note (optional)', 'Nota (opcional)')}<textarea rows={3} maxLength={500} value={noteText} onChange={e => setNoteText(e.target.value)} /></label>
          <div className="send-option-actions"><button className="primary" disabled={busy}>{say('Save', 'Guardar')}</button><button type="button" className="secondary" onClick={() => setNoting(null)}>{say('Cancel', 'Cancelar')}</button></div>
        </form> : <div className="actions">
          <button className="secondary" disabled={busy} onClick={() => { setNoting('reply'); setNoteText('') }}>{say('Record a reply', 'Registrar una respuesta')}</button>
          <button className="secondary" disabled={busy} onClick={() => { setNoting('resolved'); setNoteText('') }}>{say('Mark resolved', 'Marcar como resuelto')}</button>
          <button className="secondary" disabled={busy} onClick={() => { setNoting('unresolved'); setNoteText('') }}>{say('Not resolved', 'No se resolvió')}</button>
        </div>}
        {!noting ? <div className="actions">
          <button className="primary" disabled={busy} onClick={() => followUp(contacted(r.draft)!.route)}>{say(`Write a follow-up to ${contacted(r.draft)!.name}`, `Escribir seguimiento a ${contacted(r.draft)!.name}`)}</button>
          {escalate && escalate !== contacted(r.draft)!.route ? <button className="secondary" disabled={busy} onClick={() => followUp(escalate)}>{say(`Contact ${sendOption(r.draft, escalate, false).name}`, `Contactar a ${sendOption(r.draft, escalate, false).name}`)}</button> : null}
        </div> : null}
      </div> : null}
      {r.status === 'open' && !contacted(r.draft) ? <button className="primary" disabled={busy} onClick={() => {
        if (!r.messages.length || r.revision > Math.max(...r.messages.map(m => m.draftRevision))) { onResume(r); return }
        void action(async () => { const saved = await saveRequest(sample, { ...r.draft, stage: 2, subject: /^Re: /i.test(r.draft.subject) ? r.draft.subject : `Re: ${r.draft.subject}`, body: '', attachments: [], evidence: [] }, r.revision, deviceOnly); onResume(saved) })
      }}>{!r.messages.length || r.revision > Math.max(...r.messages.map(m => m.draftRevision)) ? say('Continue draft', 'Continuar borrador') : say('Write a follow-up', 'Escribir seguimiento')}</button> : null}
      {!sample && !deviceOnly ? <button className="secondary" disabled={busy} onClick={() => void action(() => helpApi(`/requests/${r.id}/status`, { status: r.status === 'open' ? 'closed' : 'open' }))}>{r.status === 'open' ? say('Close request', 'Cerrar solicitud') : say('Reopen request', 'Reabrir solicitud')}</button> : null}
      <button className="danger" disabled={busy} onClick={() => { if (window.confirm(say('Delete this request and its stored attachments? Sent emails cannot be recalled.', '¿Borrar esta solicitud y sus archivos guardados? No se pueden retirar correos enviados.'))) void action(async () => { await removeRequest(sample, r.id, deviceOnly); setSelected(undefined) }) }}>{say('Delete request', 'Borrar solicitud')}</button>
    </article> : <>
      {loaded ? <div className="request-list-heading"><h2>{say('Saved drafts', 'Borradores guardados')} <span>· {records.filter(isDraft).length}</span></h2></div> : null}
      {!loaded ? <p>{say('Loading History…', 'Cargando Historial…')}</p> : records.length ? <ul className="request-list">{records.map(item => {
        const draft = isDraft(item), date = new Date(item.updatedAt), follow = followUpState(item.draft)
        const subject = item.draft.subject || say('Water issue', 'Problema de agua')
        return <li key={item.id} className="request-list-row request-draft-card">
          <div className="request-list-details">
            <button className="request-list-title" onClick={() => { setSelected(item.id); window.history.replaceState(null, '', `#request=${item.id}`) }}>{subject}</button>
            <span className="request-list-place">{supplierDisplayName(item.draft.place.name)}</span>
            <div className="request-list-meta"><span className={draft ? 'request-draft-label' : 'request-state-label'}>{standing(item)}</span><span>{issueLabels[item.draft.issue]}</span>{!draft && item.messages.length ? <span>{labels[item.messages.at(-1)!.delivery]}</span> : null}{contacted(item.draft) ? <span>{outcomeLabel(contacted(item.draft)!, language)}</span> : null}{follow === 'due' ? <span className="request-follow-due">{say('Follow-up due', 'Seguimiento pendiente')}</span> : follow === 'waiting' ? <span>{say('Follow up', 'Seguimiento')} {readableDate(item.draft.followUpOn, language)}</span> : null}</div>
          </div>
          <div className="request-list-actions"><time dateTime={date.toISOString()}>{say('Saved', 'Guardado')} {new Intl.DateTimeFormat(es ? 'es-US' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}</time>{draft ? <button className="primary request-resume" onClick={() => onResume(item)}>{say('Continue draft', 'Continuar borrador')}</button> : null}</div>
        </li>
      })}</ul> : <p>{say('No requests yet. Choose Get help from a provider to start a saved draft.', 'Aún no hay solicitudes. Elige Obtener ayuda desde un proveedor para empezar un borrador.')}</p>}
    </>}
    {error ? <p role="alert">{error}</p> : null}
  </>
}
