import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'
import type { Language } from './domain'
import type { HelpDraft, HelpFact, HelpStep } from './help-requests'
import { relevantFacts, updatedEvidenceFacts } from './help-flow'
import { answerFingerprint, confirmedSections } from './help-outputs'
import { RequestRecipients } from './RequestRecipients'
import { RequestSources } from './RequestSources'
import { InfoButton } from './InfoButton'
import { IconAction } from './IconAction'
import { reviewLabel } from './review-labels'
import { reportSourceNote } from './help-report-source'

interface Props {
  draft: HelpDraft; language: Language; sample?: boolean; extras: ReactNode;
  edit: (patch: Partial<HelpDraft>) => void; changeFacts: (facts: HelpFact[]) => void;
  go: (step: HelpStep) => void; regenerate: () => void; copy?: () => void; toolbarRef?: Ref<HTMLSpanElement>; onAnswersChange?: (open: boolean) => void; switchTarget?: HTMLElement | null;
}

/** One review surface; storage and final delivery remain owned by the workspace. */
export function ReviewEmail({ draft, language, sample = false, edit, changeFacts, go, regenerate, copy, toolbarRef, onAnswersChange, switchTarget }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const [answersOpen, setAnswersOpen] = useState(false)
  const switchButton = useRef<HTMLButtonElement>(null)
  const switchView = () => { const open = !answersOpen; setAnswersOpen(open); onAnswersChange?.(open); requestAnimationFrame(() => switchButton.current?.focus()) }
  const editAnswers = (step: HelpStep) => { setAnswersOpen(false); onAnswersChange?.(false); go(step) }
  const editor = useRef<HTMLTextAreaElement>(null)
  const subjectEditor = useRef<HTMLTextAreaElement>(null)
  const composer = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const resize = () => { for (const el of [editor.current, subjectEditor.current]) if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px` } }
    resize()
    if (typeof ResizeObserver === 'undefined' || !composer.current) return
    let width = composer.current.getBoundingClientRect().width
    const observer = new ResizeObserver(entries => { const next = entries[0]?.contentRect.width; if (next !== width) { width = next; resize() } })
    observer.observe(composer.current)
    return () => observer.disconnect()
  }, [draft.subject, draft.body, answersOpen])
  // A controlled textarea receives its value after mount; explicitly start at the
  // greeting on entry, not on every keystroke or answer/fact update.
  useLayoutEffect(() => { if (editor.current) { editor.current.setSelectionRange(0, 0); editor.current.scrollTop = 0 } }, [draft.id])
  const facts = relevantFacts(draft, sample), sections = confirmedSections(draft, language)
  const stale = !!draft.generatedFrom && draft.generatedFrom !== answerFingerprint(draft)
  const updated = updatedEvidenceFacts(draft, sample, language)
  const citations = new Map<string, { source: HelpFact['sources'][number]; numbers: number[] }>()
  sections.facts.forEach((f, i) => f.sources.forEach(source => { const old = citations.get(source.url); citations.set(source.url, { source, numbers: [...new Set([...(old?.numbers ?? []), i + 1])] }) }))
  const switchControl = <button ref={switchButton} type="button" className="text-button" onClick={switchView}>{answersOpen ? say('Back to email', 'Volver al correo') : say('Review answers', 'Revisar respuestas')}</button>
  return <div className="request-review-card">
    {updated.changed ? <div className="request-stale" role="status"><div><p>{say(`${updated.changed} historical finding${updated.changed === 1 ? '' : 's'} changed or added in records available on this device.`, `${updated.changed} hallazgo(s) histórico(s) cambiado(s) o añadido(s) en los registros disponibles en este dispositivo.`)}</p><p className="quiet-note">{say('Your saved evidence and email have not changed. Review updated evidence before regenerating your message.', 'Tus pruebas guardadas y correo no han cambiado. Revisa las pruebas actualizadas antes de regenerar tu mensaje.')}</p><button className="action-chip" onClick={() => { if (window.confirm(say('Use the updated historical evidence? Your subject, message, questions, attachments and recipients are kept. Updating the email is a separate action.', '¿Usar las pruebas históricas actualizadas? Se conservan el asunto, mensaje, preguntas, archivos y destinatarios. Actualizar el correo es una acción aparte.'))) changeFacts(updated.facts) }}>{say('Use updated evidence', 'Usar pruebas actualizadas')}</button></div></div> : null}
    {switchTarget ? createPortal(switchControl, switchTarget) : <div className="request-review-switch">{switchControl}</div>}
    {answersOpen ? <section className="request-answer-summary" aria-label={say('Summary of form answers', 'Resumen de las respuestas del formulario')}>
      <h2>{say('Your answers', 'Tus respuestas')}</h2>
      <p className="quiet-note">{say('Form answers; manual email edits may differ.', 'Respuestas del formulario; el correo puede diferir si lo editaste.')}</p>
      <div className="request-summary-group"><div><strong>{say('Your experience', 'Tu experiencia')}</strong><button type="button" className="action-chip" onClick={() => editAnswers('noticed')}>{say('Edit experience', 'Editar experiencia')}</button></div><p>{[sections.observations, sections.description, sections.timing].filter(Boolean).join(' ') || say('None described', 'No se describió ninguna')}</p></div>
      <div className="request-summary-group"><div><strong>{say('Report context', 'Contexto del informe')}</strong></div><p className="quiet-note">{say('Available supplier findings and action questions are included automatically. Historical findings do not establish current conditions or the cause of your experience.', 'Los hallazgos disponibles del proveedor y las preguntas sobre acciones se incluyen automáticamente. Los hallazgos históricos no establecen las condiciones actuales ni la causa de tu experiencia.')}</p>{sections.facts.some(f => f.kind === 'historical') ? <>{sections.facts.filter(f => f.kind === 'historical').map(f => <div className="request-summary-finding" key={f.id}><p>{f.record?.problem || f.text}</p>{f.record?.evidence ? <><p>{f.record.evidence.period}</p><p>{f.record.evidence.resolution || f.record.status}</p>{f.record.evidence.action ? <p>{f.record.evidence.action}</p> : null}{f.record.evidence.conflicts ? <p>{f.record.evidence.conflicts}</p> : null}</> : null}{f.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label}</a>)}{reportSourceNote(f.record?.sourceMethod, language) ? <p className="quiet-note">{reportSourceNote(f.record?.sourceMethod, language)}</p> : null}</div>)}</> : <p>{say('No report findings available. This does not establish current water safety.', 'No hay hallazgos del informe disponibles. Esto no establece la seguridad actual del agua.')}</p>}</div>
      <div className="request-summary-group"><div><strong>{say('Your requests', 'Tus solicitudes')}</strong><button type="button" className="action-chip" onClick={() => editAnswers('request')}>{say('Edit requests', 'Editar solicitudes')}</button></div><p>{sections.requestItems.join('; ') || say('None selected', 'Ninguna seleccionada')}</p></div>
    </section> :
    <section ref={composer} className="request-composer request-review-email" aria-label={say('Your email', 'Tu correo')}>
      {stale ? <div className="request-stale" role="status"><Icon name="refresh-cw" size={18} /><div><p className="request-stale-title">{say('Your answers changed since this draft was made.', 'Tus respuestas cambiaron desde que se creó este borrador.')}</p><p className="quiet-note">{say('Updating replaces your subject and message, including manual edits.', 'Actualizar reemplaza el asunto y el mensaje, incluidos los cambios manuales.')}</p><button className="action-chip" onClick={regenerate}><Icon name="refresh-cw" size={16} />{say('Update draft from answers', 'Actualizar borrador desde las respuestas')}</button></div></div> : null}
      <div className="request-output-email">
      <div className="request-email-toolbar"><strong>{say('Draft email', 'Borrador de correo')}</strong><div><IconAction primary label={reviewLabel('copyMessage', language)} icon="file-text" disabled={!draft.body.trim()} onClick={copy} /><IconAction label={reviewLabel('editMessage', language)} icon="edit" onClick={() => editor.current?.focus()} /><span ref={toolbarRef} className="request-email-handoff" /></div></div>
      <RequestRecipients draft={draft} es={es} edit={edit} info={<div className="request-citation-control"><InfoButton label={say('Cited sources', 'Fuentes citadas')}>
        <h3>{say('Cited sources', 'Fuentes citadas')}</h3>{citations.size ? [...citations].map(([url, row]) => <a key={url} href={url} target="_blank" rel="noreferrer">[{row.numbers.join(', ')}] {row.source.label || say('Official source', 'Fuente oficial')}</a>) : <RequestSources sources={draft.sources} es={es} compact />}{facts.map(f => <div key={f.id}>{f.kind === 'saved' || f.kind !== 'historical' && f.record?.verified === false ? <p className="quiet-note">{say('Saved source wording; current status has not been verified.', 'Texto guardado de la fuente; el estado actual no se ha verificado.')}</p> : null}<p>{f.text}</p></div>)}</InfoButton>
      </div>} />
        <label className="request-subject"><span className="request-email-header-label">{say('Subject', 'Asunto')}</span><textarea aria-label={say('Subject', 'Asunto')} ref={subjectEditor} rows={1} value={draft.subject} maxLength={200} onChange={e => edit({ subject: e.target.value })} /></label>
        <label><span className="sr-only">{say('Message', 'Mensaje')}</span><textarea ref={editor} className="request-message-editor" rows={10} value={draft.body} maxLength={24000} onChange={e => edit({ body: e.target.value })} /></label>
      </div>
    </section>}
  </div>
}
