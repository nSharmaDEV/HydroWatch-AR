import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import type { Language, Notice, Place } from './domain'
import { HelpAccount } from './HelpAccount'
import { reportMessage } from './recovery-evidence'
import { factPatch, helpPath, helpStep, initialFacts, savedFacts, relevantFacts } from './help-flow'
import { GuidedHelp } from './GuidedHelp'
import { defaultRequests } from './ConfirmedWording'
import { evidenceQuestion } from './help-evidence'
import { blankRequest, generateMessage, type AttachmentStep, type HelpDraft, type HelpRequest, type HelpStep } from './help-requests'
import { downloadText, helpApi, listRequests, saveRequest } from './help-client'
import './requests.css'
import './help-four-screen.css'
import { answerFingerprint } from './help-outputs'
import { localizeDraft, updateDraft } from './help-draft'
import { exportedText } from './help-exports'
import { useContentMotion } from './interface-motion'
import { contacted } from './help-outcomes'
import { attachmentSize, attachmentTag } from './attachment-display'
interface Props { /** An evidence finding key to ask about ("Ask about this finding"). */ ask?: string; place: Place; places?: Place[]; notice?: Notice; notices?: Notice[]; language: Language; sample: boolean; requestId?: string; currentAdvisory?: boolean; registerLeave?: (handler: (() => Promise<boolean>) | null) => void; onBack: () => void; onHistory: (id: string) => void }
export function RequestWorkspace(props: Props) {
  return <div className="request-workspace">{props.sample ? <Workspace {...props} delivery={false} deviceOnly={false} /> : <HelpAccount language={props.language}>{s => <Workspace {...props} delivery={s.delivery} deviceOnly={!s.user} />}</HelpAccount>}</div>
}
function Workspace({ ask, place, places = [], notice, notices, language, sample, requestId, currentAdvisory = false, registerLeave, onBack, onHistory, delivery, deviceOnly }: Props & { delivery: boolean; deviceOnly: boolean }) {
  const es = language === 'es', [draft, setDraft] = useState<HelpDraft | null>(null), [saving, setSaving] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading'), [sending, setSending] = useState(false), [error, setError] = useState('')
  const current = useRef<HelpDraft | null>(null), revision = useRef(0), queue = useRef<Promise<unknown>>(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | null>(null), alive = useRef(true), heading = useRef<HTMLHeadingElement>(null)
  const savedSnapshot = useRef<HelpDraft | null>(null), savedRecord = useRef<HelpRequest | null>(null)
  const draftLanguage = useRef(language)
  const stepContent = useRef<HTMLElement>(null)
  const changeStep = useContentMotion(stepContent)
  const [sent, setSent] = useState(false)
  const [readingFiles, setReadingFiles] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const say = (en: string, spanish: string) => es ? spanish : en
  async function persist() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const snapshot = current.current
    if (!snapshot) throw new Error('Not loaded')
     const task = queue.current.then(async () => { if (savedSnapshot.current === snapshot && savedRecord.current) return savedRecord.current; const saved = await saveRequest(sample, snapshot, revision.current, deviceOnly); revision.current = saved.revision; savedSnapshot.current = snapshot; savedRecord.current = saved; if (alive.current && current.current === snapshot) setSaving('saved'); return saved })
    queue.current = task
    try { return await task } catch (e) { if (alive.current) setSaving('error'); throw e }
  }
  useEffect(() => {
    alive.current = true
    let cancelled = false
     void listRequests(sample, deviceOnly).then(records => {
      if (cancelled) return
      const old = requestId ? records.find(r => r.id === requestId) : ask ? undefined : records.find(r => r.draft.place.id === place.id && r.status === 'open' && !contacted(r.draft) && (!r.messages.length || r.revision > Math.max(...r.messages.map(m => m.draftRevision))))
      if (requestId && !old) throw new Error('Request unavailable')
      const recordsForPlace = notices ?? (notice ? [notice] : [])
      const question = ask && !sample ? evidenceQuestion(place, ask, language, sample) : undefined
      const facts = initialFacts(place, recordsForPlace, currentAdvisory, sample, language, question ? ask : undefined)
      const value = old ? updateDraft(old.draft, factPatch(savedFacts(old.draft, sample, language)), language) : { ...blankRequest(place), ...factPatch(facts), flowStep: 'choose' as const, ...(question && facts.some(f => f.id === ask) ? { description: question, issue: 'report' as const, route: 'provider' as const, recipientRoutes: ['provider' as const] } : currentAdvisory ? { issue: 'advisory' as const } : {}) }
      const unchanged = old && JSON.stringify(value) === JSON.stringify(old.draft)
      current.current = value; revision.current = old?.revision ?? 0; savedSnapshot.current = unchanged ? value : null; savedRecord.current = old ?? null; setDraft(value); setSaving(unchanged ? 'saved' : 'saving')
      if (!unchanged) void persist().catch(() => {})
    }).catch(() => { if (!cancelled) setSaving('error') })
    return () => { cancelled = true; alive.current = false; if (timer.current) void persist().catch(() => {}) }
   }, [sample, deviceOnly, place.id, requestId, ask])
  useEffect(() => {
    if (!current.current || draftLanguage.current === language) return
    draftLanguage.current = language
    const next = localizeDraft(current.current, language)
    if (next !== current.current) commit(next)
  }, [language, draft?.id])
  useEffect(() => { heading.current?.focus(); window.scrollTo?.(0, 0) }, [draft?.stage, draft?.flowStep])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (current.current && current.current !== savedSnapshot.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  useEffect(() => {
    registerLeave?.(async () => { if (!current.current) return true; try { await persist(); return true } catch { setError(say('Could not save. Retry or download your text before leaving.', 'No se pudo guardar. Reintenta o descarga el texto antes de salir.')); return false } })
    return () => registerLeave?.(null)
  }, [registerLeave, language])
  async function leave(next: () => void) {
    try { await persist(); next() }
    catch { setError(say('Could not save. Keep this page open, retry saving or download your text before leaving.', 'No se pudo guardar. Mantén esta página abierta, reintenta guardar o descarga el texto antes de salir.')) }
  }
  function commit(next: HelpDraft) { current.current = next; setDraft(next); setSaving('saving'); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void persist().catch(() => {}) }, 1200) }
  function edit(patch: Partial<HelpDraft>) { setSent(false); commit(updateDraft(current.current!, patch, language)) }
  async function stage(value: HelpStep) {
    if (!draft) return
    let patch: Partial<HelpDraft> = { flowStep: value, stage: value === 'confirm' ? 3 : value === 'review' || value === 'send' ? 2 : 1 }
    if (value === 'review' || value === 'send') { const { sources, context, evidence } = factPatch(relevantFacts(draft)); patch = { ...patch, sources, context, evidence } }
    // The usual requests for this issue start ticked the first time; the resident can untick them.
    if (value === 'request' && helpStep(draft) !== 'anything' && helpStep(draft) !== 'response' && !Object.keys(draft.wording?.response ?? {}).some(key => !key.startsWith('report'))) patch = { ...patch, wording: { report: draft.wording?.report ?? {}, response: { ...defaultRequests(draft.issue, language, Object.values(draft.wording?.report ?? {}).filter(t => t.trim())), details: '', ...draft.wording?.response } } }
    const path = helpPath(draft)
    changeStep(() => {
      // Moving between steps is not an edit: keep a confirmed send so Back and forward cannot send twice.
      commit(updateDraft(current.current!, patch, language))
      void persist().catch(() => { setError(say('Could not save. Your text remains here. Reload only after keeping a copy; a conflicting edit may exist.', 'No se pudo guardar. El texto sigue aquí. Guarda una copia antes de recargar; puede existir otra edición.')) })
    }, path.indexOf(value) < path.indexOf(helpStep(draft)) ? 'back' : 'forward')
  }
  function messageFromIssue(value: HelpDraft) {
    if (value.facts) return { ...generateMessage({ ...value, ...factPatch(relevantFacts(value)) }, language), generatedFrom: answerFingerprint(value) }
    const historical = reportMessage(value.place, sample, value.evidence, language)
    // Replace only generated report citations; preserve advisory and legacy metadata.
    const sources = [...(value.sources ?? []).filter(s => !/^\d{4}:\d+$/.test(s.recordId)), ...historical.sources]
    return { ...generateMessage(value, language, historical.context), generatedFrom: answerFingerprint(value), ...(value.sources || historical.sources.length ? { sources } : {}) }
  }
  async function files(input: HTMLInputElement, step: AttachmentStep) {
    if (readingFiles) return
    setReadingFiles(true)
    try {
      const chosen = Array.from(input.files ?? [])
      const existing = current.current!.attachments.filter(a => (a.step ?? 'response') === step)
      if (chosen.length + existing.length > 3 || chosen.reduce((s, f) => s + f.size, existing.reduce((s, a) => s + a.data.length / 4 * 3 - (a.data.endsWith('==') ? 2 : a.data.endsWith('=') ? 1 : 0), 0)) > 1024 * 1024) throw new Error('limit')
      const attachments = await Promise.all(chosen.map(async file => { if (!['text/plain', 'image/png', 'image/jpeg', 'application/pdf', 'video/mp4', 'video/webm'].includes(file.type)) throw new Error('type'); const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (const b of bytes) binary += String.fromCharCode(b); return { id: crypto.randomUUID(), name: file.name, type: file.type, data: btoa(binary), step } }))
      edit({ attachments: [...current.current!.attachments, ...attachments] }); setError('')
    } catch { setError(say('Use up to 3 PDF, PNG, JPG, MP4, WebM or text files, 1 MB total per step. Avoid sensitive account or medical details.', 'Usa hasta 3 archivos PDF, PNG, JPG, MP4, WebM o texto, 1 MB en total por paso. Evita datos de cuenta o médicos.')) } finally { input.value = ''; setReadingFiles(false) }
  }
  async function send() {
    if (sending || sent || sample || !delivery) return
    setSending(true); setError('')
    try { const saved = await persist(); await helpApi<HelpRequest>(`/requests/${saved.id}/send`, { revision: saved.revision }); setSent(true) }
    catch { setError(say('Sending was not confirmed. Open History before trying again; do not create a duplicate request.', 'El envío no se confirmó. Abre Historial antes de volver a intentarlo; no crees una solicitud duplicada.')) }
    finally { setSending(false) }
  }
  if (!draft) return <section className="request-workspace"><button className="back" onClick={onBack}><Icon name="chevron-left" size={18} />{say('Back', 'Atrás')}</button><p role="status">{saving === 'error' ? say('Could not load your draft. Nothing was overwritten.', 'No se pudo cargar el borrador. No se sobrescribió nada.') : say('Loading draft…', 'Cargando borrador…')}</p></section>
  const step = helpStep(draft), path = helpPath(draft), index = path.indexOf(step)
  const rows = (group: AttachmentStep) => draft.attachments.filter(a => (a.step ?? 'response') === group).map(a => { const [label, kind] = attachmentTag(a); return <div key={a.id} className="request-attachment-row"><span className={`request-attachment-tag ${kind}`}>{label}</span><span className="request-attachment-name" title={a.name}>{a.name}</span><span className="request-attachment-size">{attachmentSize(a)}</span><button type="button" className="request-attachment-remove" aria-label={`${say('Remove attachment', 'Eliminar archivo')}: ${a.name}`} title={`${say('Remove attachment', 'Eliminar archivo')}: ${a.name}`} onClick={() => edit({ attachments: current.current!.attachments.filter(f => f.id !== a.id) })}><Icon name="trash-2" size={18} /></button></div> })
  const extras = <section className="request-extras" aria-label={say('Add a photo or document', 'Añade una foto o documento')}>
      <button className="request-attachment-button secondary" disabled={readingFiles} onClick={() => fileInput.current?.click()}><span aria-hidden="true">＋</span>{say('Add a photo or document', 'Añade una foto o documento')}</button>
      <label className="sr-only">{say('Attachments (optional)', 'Archivos adjuntos (opcional)')}<input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.mp4,.webm" multiple disabled={readingFiles} onChange={e => void files(e.currentTarget, 'response')} /></label>
       <p className="quiet-note">{say('Files saved here are not attached automatically when you open your email app. Attach them yourself before sending. Optional: up to 3 PDF, PNG, JPG, MP4, WebM or text files, 1 MB total per step. Older files without a recorded step appear here. Avoid sensitive account or medical details.', 'Los archivos guardados aquí no se adjuntan automáticamente al abrir tu app de correo. Adjúntalos tú antes de enviar. Opcional: hasta 3 archivos PDF, PNG, JPG, MP4, WebM o texto, 1 MB en total por paso. Los archivos anteriores sin paso registrado aparecen aquí. Evita datos de cuenta o médicos.')}</p>
       {readingFiles ? <p role="status">{say('Reading files…', 'Leyendo archivos…')}</p> : null}
       {rows('response')}
       </section>
  const actionGroup: AttachmentStep = step === 'request' ? 'request' : 'noticed'
  const actionExtras = <><button type="button" className="request-action-add" aria-label={say('Add a photo or video', 'Añadir una foto o video')} disabled={readingFiles} onClick={() => fileInput.current?.click()}>＋</button><input hidden ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.mp4,.webm" multiple disabled={readingFiles} aria-label={say('Photos and videos', 'Fotos y videos')} onChange={e => void files(e.currentTarget, actionGroup)} />{readingFiles ? <p role="status">{say('Reading files…', 'Leyendo archivos…')}</p> : null}{rows(actionGroup)}</>
  const status = <p role="status" className={`request-save-status${saving === 'saved' ? ' sr-only' : ''}`}>{saving === 'saved' ? sample || deviceOnly ? say('Saved on this device', 'Guardado en este dispositivo') : say('Saved', 'Guardado') : saving === 'error' ? say("Couldn't save", 'No se pudo guardar') : say('Saving…', 'Guardando…')}</p>
  return <section ref={stepContent} className="request-workspace request-guided-workspace">
      <GuidedHelp status={status} onHistory={() => void leave(() => onHistory(draft.id))} places={places} draft={draft} place={place} language={language} sample={sample} deviceOnly={deviceOnly} delivery={delivery} sending={sending} saveFailed={saving === 'error' || sent} heading={heading} extras={extras} actionExtras={actionExtras} edit={edit} changeFacts={facts => edit({ ...factPatch(facts), subject: draft.subject, body: draft.body })} go={value => void stage(value)} send={() => void send()} regenerate={() => { if (window.confirm(say('Replace the email subject and message, including your manual edits, with the latest answers? Attachments and recipients are kept.', '¿Reemplazar el asunto y mensaje, incluidos tus cambios manuales, con las respuestas actuales? Se conservan archivos y destinatarios.'))) edit(messageFromIssue(draft)) }} />
    {sent ? <p role="status">{say('Message accepted by the email processor, not confirmed delivered or resolved. Open History for updates.', 'Mensaje aceptado por el procesador, no confirma entrega ni solución. Abre Historial para ver actualizaciones.')}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {saving === 'error' ? <div className="request-actions"><button className="secondary" onClick={() => { queue.current = Promise.resolve(); void persist().catch(() => {}) }}>{say('Retry save', 'Reintentar guardar')}</button><button className="action-chip" onClick={() => downloadText(`${sample ? 'sample-' : ''}unsaved-water-request.txt`, exportedText(`${draft.description}\n${draft.dates}\n\n${draft.subject}\n\n${draft.body}`, language, sample))}><Icon name="download" size={16} />{say('Download unsaved text', 'Descargar texto sin guardar')}</button></div> : null}
  </section>
}
