import { useEffect, useRef, useState } from 'react'
import type { Language, Notice, Place } from './domain'
import { HelpAccount } from './HelpAccount'
import { reportMessage } from './recovery-evidence'
import { factPatch, helpPath, helpStep, initialFacts, savedFacts, relevantFacts } from './help-flow'
import { GuidedHelp } from './GuidedHelp'
import { blankRequest, generateMessage, type HelpDraft, type HelpRequest, type HelpStep } from './help-requests'
import { downloadText, helpApi, listRequests, saveRequest } from './help-client'
import './requests.css'
import { answerFingerprint } from './help-outputs'
import { updateDraft } from './help-draft'
interface Props { place: Place; places?: Place[]; notice?: Notice; notices?: Notice[]; language: Language; sample: boolean; requestId?: string; currentAdvisory?: boolean; registerLeave?: (handler: (() => Promise<boolean>) | null) => void; onBack: () => void; onHistory: (id: string) => void }
export function RequestWorkspace(props: Props) {
  return <div className="request-workspace">{props.sample ? <Workspace {...props} delivery={false} deviceOnly={false} /> : <HelpAccount language={props.language}>{s => <Workspace {...props} delivery={s.delivery} deviceOnly={!s.user} />}</HelpAccount>}</div>
}
function Workspace({ place, places = [], notice, notices, language, sample, requestId, currentAdvisory = false, registerLeave, onBack, onHistory, delivery, deviceOnly }: Props & { delivery: boolean; deviceOnly: boolean }) {
  const es = language === 'es', [draft, setDraft] = useState<HelpDraft | null>(null), [saving, setSaving] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading'), [sending, setSending] = useState(false), [error, setError] = useState('')
  const current = useRef<HelpDraft | null>(null), revision = useRef(0), queue = useRef<Promise<unknown>>(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | null>(null), alive = useRef(true), heading = useRef<HTMLHeadingElement>(null)
  const savedSnapshot = useRef<HelpDraft | null>(null), savedRecord = useRef<HelpRequest | null>(null)
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
      const old = requestId ? records.find(r => r.id === requestId) : records.find(r => r.draft.place.id === place.id && r.status === 'open' && (!r.messages.length || r.revision > Math.max(...r.messages.map(m => m.draftRevision))))
      if (requestId && !old) throw new Error('Request unavailable')
      const recordsForPlace = notices ?? (notice ? [notice] : [])
      const value = old ? updateDraft(old.draft, factPatch(savedFacts(old.draft, sample, language)), language) : { ...blankRequest(place), ...factPatch(initialFacts(place, recordsForPlace, currentAdvisory, sample, language)), flowStep: 'choose' as const, ...(currentAdvisory ? { issue: 'advisory' as const } : {}) }
      const unchanged = old && JSON.stringify(value) === JSON.stringify(old.draft)
      current.current = value; revision.current = old?.revision ?? 0; savedSnapshot.current = unchanged ? value : null; savedRecord.current = old ?? null; setDraft(value); setSaving(unchanged ? 'saved' : 'saving')
      if (!unchanged) void persist().catch(() => {})
    }).catch(() => { if (!cancelled) setSaving('error') })
    return () => { cancelled = true; alive.current = false; if (timer.current) void persist().catch(() => {}) }
   }, [sample, deviceOnly, place.id, requestId])
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
  function edit(patch: Partial<HelpDraft>) { setSent(false); const next = updateDraft(current.current!, patch, language); current.current = next; setDraft(next); setSaving('saving'); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void persist().catch(() => {}) }, 1200) }
  async function stage(value: HelpStep) {
    if (!draft) return
    let patch: Partial<HelpDraft> = { flowStep: value, stage: value === 'confirm' ? 3 : value === 'review' ? 2 : 1 }
    if (value === 'review') { const { sources, context, evidence } = factPatch(relevantFacts(draft)); patch = { ...patch, sources, context, evidence } }
    edit(patch)
    try { await persist() } catch { setError(say('Could not save. Your text remains here. Reload only after keeping a copy; a conflicting edit may exist.', 'No se pudo guardar. El texto sigue aquí. Guarda una copia antes de recargar; puede existir otra edición.')) }
  }
  function messageFromIssue(value: HelpDraft) {
    if (value.facts) return { ...generateMessage({ ...value, ...factPatch(relevantFacts(value)) }, language), generatedFrom: answerFingerprint(value) }
    const historical = reportMessage(value.place, sample, value.evidence, language)
    // Replace only generated report citations; preserve advisory and legacy metadata.
    const sources = [...(value.sources ?? []).filter(s => !/^\d{4}:\d+$/.test(s.recordId)), ...historical.sources]
    return { ...generateMessage(value, language, historical.context), generatedFrom: answerFingerprint(value), ...(value.sources || historical.sources.length ? { sources } : {}) }
  }
  async function files(input: HTMLInputElement) {
    if (readingFiles) return
    setReadingFiles(true)
    try {
      const chosen = Array.from(input.files ?? [])
      if (chosen.length + draft!.attachments.length > 3 || chosen.reduce((s, f) => s + f.size, draft!.attachments.reduce((s, a) => s + a.data.length * .75, 0)) > 1024 * 1024) throw new Error('limit')
      const attachments = await Promise.all(chosen.map(async file => { if (!['text/plain', 'image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) throw new Error('type'); const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (const b of bytes) binary += String.fromCharCode(b); return { id: crypto.randomUUID(), name: file.name, type: file.type, data: btoa(binary) } }))
      edit({ attachments: [...current.current!.attachments, ...attachments] }); setError('')
    } catch { setError(say('Use up to 3 PDF, PNG, JPG or text files, 1 MB total. Avoid sensitive account or medical details.', 'Usa hasta 3 archivos PDF, PNG, JPG o texto, 1 MB en total. Evita datos de cuenta o médicos.')) } finally { input.value = ''; setReadingFiles(false) }
  }
  async function send() {
    if (sending || sent || sample || !delivery) return
    setSending(true); setError('')
    try { const saved = await persist(); await helpApi<HelpRequest>(`/requests/${saved.id}/send`, { revision: saved.revision }); setSent(true) }
    catch { setError(say('Sending was not confirmed. Open History before trying again; do not create a duplicate request.', 'El envío no se confirmó. Abre Historial antes de volver a intentarlo; no crees una solicitud duplicada.')) }
    finally { setSending(false) }
  }
  if (!draft) return <section className="request-workspace"><button className="back" onClick={onBack}>‹ {say('Back', 'Atrás')}</button><p role="status">{saving === 'error' ? say('Could not load your draft. Nothing was overwritten.', 'No se pudo cargar el borrador. No se sobrescribió nada.') : say('Loading draft…', 'Cargando borrador…')}</p></section>
  const extras = <section className="request-extras" aria-label={say('Add a photo or document', 'Añade una foto o documento')}>
      <button className="request-attachment-button secondary" disabled={readingFiles} onClick={() => fileInput.current?.click()}><span aria-hidden="true">＋</span>{say('Add a photo or document', 'Añade una foto o documento')}</button>
      <label className="sr-only">{say('Attachments (optional)', 'Archivos adjuntos (opcional)')}<input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" multiple disabled={readingFiles} onChange={e => void files(e.currentTarget)} /></label>
      {readingFiles ? <p role="status">{say('Reading files…', 'Leyendo archivos…')}</p> : null}
      {draft.attachments.map(a => <p key={a.id} className="request-file-row"><span aria-hidden="true">▤</span> {a.name} ({a.type}) — {say('Ready', 'Listo')} <button className="text-button" aria-label={`${say('Remove attachment', 'Eliminar archivo')}: ${a.name}`} onClick={() => edit({ attachments: draft.attachments.filter(f => f.id !== a.id) })}>{say('Remove', 'Eliminar')}</button></p>)}
       </section>
  const step = helpStep(draft), path = helpPath(draft), index = path.indexOf(step)
  const topLine = <div className="request-topline"><button className="back" aria-label={say('Back', 'Atrás')} disabled={sending} onClick={() => index > 0 ? void stage(path[index - 1]) : void leave(onBack)}>‹ {say(index ? 'Back to previous step' : 'Back', index ? 'Volver al paso anterior' : 'Atrás')}</button><div className="request-actions"><p role="status">{saving === 'saved' ? sample || deviceOnly ? say('Saved on this device', 'Guardado en este dispositivo') : say('Saved', 'Guardado') : saving === 'error' ? say("Couldn't save", 'No se pudo guardar') : say('Saving…', 'Guardando…')}</p><button className="text-button" onClick={() => void leave(() => onHistory(draft.id))}>{say('Open History', 'Abrir Historial')}</button></div></div>
  return <section className="request-workspace request-guided-workspace">
      <GuidedHelp topLine={topLine} places={places} draft={draft} place={place} language={language} sample={sample} deviceOnly={deviceOnly} delivery={delivery} sending={sending} saveFailed={saving === 'error' || sent} heading={heading} extras={extras} edit={edit} changeFacts={facts => edit(factPatch(facts))} go={value => void stage(value)} send={() => void send()} regenerate={() => { if (window.confirm(say('Replace the email subject and message, including your manual edits, with the latest answers? Attachments and recipients are kept.', '¿Reemplazar el asunto y mensaje, incluidos tus cambios manuales, con las respuestas actuales? Se conservan archivos y destinatarios.'))) edit(messageFromIssue(draft)) }} />
    {sent ? <p role="status">{say('Message accepted by the email processor, not confirmed delivered or resolved. Open History for updates.', 'Mensaje aceptado por el procesador, no confirma entrega ni solución. Abre Historial para ver actualizaciones.')}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {saving === 'error' ? <div className="request-actions"><button className="secondary" onClick={() => { queue.current = Promise.resolve(); void persist().catch(() => {}) }}>{say('Retry save', 'Reintentar guardar')}</button><button className="text-button" onClick={() => downloadText('unsaved-water-request.txt', `${draft.description}\n${draft.dates}\n\n${draft.subject}\n\n${draft.body}`)}>{say('Download unsaved text', 'Descargar texto sin guardar')}</button></div> : null}
  </section>
}
