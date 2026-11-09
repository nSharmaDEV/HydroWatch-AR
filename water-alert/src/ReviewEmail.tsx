import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import type { Language } from './domain'
import type { HelpDraft, HelpFact, HelpStep } from './help-requests'
import { relevantFacts } from './help-flow'
import { requiredReportEvidence } from './recovery-evidence'
import { answerFingerprint, confirmedSections, generateReport } from './help-outputs'
import { readableDate } from './help-format'
import { RequestRecipients } from './RequestRecipients'
import { RequestSources } from './RequestSources'
import { downloadText } from './help-client'
import { exportedText } from './help-exports'
import { useMotionPresence } from './interface-motion'

function ReviewActionIcon({ kind }: { kind: 'refresh' | 'email' | 'report' }) {
  return <Icon name={({ refresh: 'refresh-cw', email: 'mail', report: 'file-down' } as const)[kind]} />
}

interface Props {
  draft: HelpDraft; language: Language; sample?: boolean; extras: ReactNode;
  edit: (patch: Partial<HelpDraft>) => void; changeFacts: (facts: HelpFact[]) => void;
  go: (step: HelpStep) => void; regenerate: () => void; copy?: () => void;
}

/** One review surface; storage and final delivery remain owned by the workspace. */
export function ReviewEmail({ draft, language, sample = false, extras, edit, changeFacts, regenerate, copy }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
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
  }, [draft.subject, draft.body])
  // A controlled textarea receives its value after mount; explicitly start at the
  // greeting on entry, not on every keystroke or answer/fact update.
  useLayoutEffect(() => { if (editor.current) { editor.current.setSelectionRange(0, 0); editor.current.scrollTop = 0 } }, [draft.id])
  const [showCitations, setShowCitations] = useState(false)
  const citationsMotion = useMotionPresence(showCitations)
  useLayoutEffect(() => { if (showCitations) citationsMotion.ref.current?.querySelector('button')?.focus() }, [showCitations, citationsMotion.ref])
  const citationButton = useRef<HTMLButtonElement>(null)
  const closeCitations = () => { setShowCitations(false); citationButton.current?.focus() }
  const [showRecords, setShowRecords] = useState(false)
  const recordsMotion = useMotionPresence(showRecords)
  const recordsButton = useRef<HTMLButtonElement>(null)
  const closeRecords = () => { setShowRecords(false); recordsButton.current?.focus() }
  const requiredIds = new Set(requiredReportEvidence(draft.place, sample).map(row => row.key))
  const facts = relevantFacts(draft, sample), sections = confirmedSections(draft, language)
  const stale = !!draft.generatedFrom && draft.generatedFrom !== answerFingerprint(draft)
  const citations = new Map<string, { source: HelpFact['sources'][number]; numbers: number[] }>()
  sections.facts.forEach((f, i) => f.sources.forEach(source => { const old = citations.get(source.url); citations.set(source.url, { source, numbers: [...new Set([...(old?.numbers ?? []), i + 1])] }) }))
  const row = (label: string, value: string | undefined) => <tr key={label}><th scope="row">{label}</th><td>{value?.trim() || say('Not provided', 'No proporcionado')}</td></tr>
  const included = facts.filter(f => f.included).length
  return <div className="request-review-card">
    <section ref={composer} className="request-composer request-review-email" aria-label={say('Your email', 'Tu correo')}>
      {stale ? <p className="request-stale" role="status">{say('Your answers changed. Update the draft to include them.', 'Tus respuestas cambiaron. Actualiza el borrador para incluirlas.')}</p> : null}
      <div className="request-citation-control"><button ref={citationButton} className="request-answer-info" aria-label={say('Cited sources', 'Fuentes citadas')} title={say('Cited sources', 'Fuentes citadas')} aria-expanded={showCitations} aria-controls="request-citations" onClick={() => setShowCitations(!showCitations)}><span aria-hidden="true">ⓘ</span></button>
        {citationsMotion.present ? <div ref={citationsMotion.ref} inert={!showCitations} aria-hidden={!showCitations || undefined} id="request-citations" role="dialog" aria-label={say('Cited sources', 'Fuentes citadas')} className="request-citations-popup" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeCitations() } }}><button autoFocus className="text-button" aria-label={say('Close citations', 'Cerrar citas')} onClick={closeCitations}><Icon name="x" size={20} /></button><h3>{say('Cited sources', 'Fuentes citadas')}</h3>{citations.size ? [...citations].map(([url, row]) => <a key={url} href={url} target="_blank" rel="noreferrer">[{row.numbers.join(', ')}] {row.source.label || say('Official source', 'Fuente oficial')}</a>) : <RequestSources sources={draft.sources} es={es} compact />}{facts.map(f => <p key={f.id}>{f.text}</p>)}</div> : null}
      </div>
      <div className="request-output-email"><RequestRecipients draft={draft} es={es} edit={edit} />
        <label className="request-subject">{say('Subject', 'Asunto')}<textarea aria-label={say('Subject', 'Asunto')} ref={subjectEditor} rows={2} value={draft.subject} maxLength={200} onChange={e => edit({ subject: e.target.value })} /></label>
        <label><span className="sr-only">{say('Message', 'Mensaje')}</span><textarea ref={editor} className="request-message-editor" rows={10} value={draft.body} maxLength={24000} onChange={e => edit({ body: e.target.value })} /></label>
      </div>
    </section>
    <div className="request-review-update">
      <details className="help-records-disclosure"><summary>{say(`Included records (${included})`, `Registros incluidos (${included})`)}</summary><p className="quiet-note">{say('Source wording and dates stay separate from your observations. Historical report findings are not current safety assessments.', 'El texto y las fechas de las fuentes se distinguen de tus observaciones. Los hallazgos históricos no son evaluaciones de seguridad actuales.')}</p>
      <button ref={recordsButton} className="text-button request-records-button" aria-expanded={showRecords} aria-controls="request-records" onClick={() => setShowRecords(!showRecords)}>{facts.length ? say(`Records (${included} of ${facts.length} included)`, `Registros (${included} de ${facts.length} incluidos)`) : say('Records (none)', 'Registros (ninguno)')}</button>
      </details><details className="help-downloads-disclosure"><summary>{say('Downloads and tools', 'Descargas y herramientas')}</summary>
      {draft.attachments.length ? <span className="quiet-note request-review-attachments">{say('Files to attach yourself', 'Archivos para adjuntar tú')}: {draft.attachments.map(f => f.name).join(', ')}</span> : null}
      <span className="request-review-tools"><button className="request-icon-action" aria-label={say('Update draft from answers', 'Actualizar borrador desde las respuestas')} title={say('Update draft — replaces your subject and message, including manual edits', 'Actualizar borrador — reemplaza el asunto y el mensaje, incluidos los cambios manuales')} onClick={regenerate}><ReviewActionIcon kind="refresh" /><span>{say('Update from answers', 'Actualizar con respuestas')}</span></button>
        <button className="request-icon-action" aria-label={say('Download email', 'Descargar correo')} title={say('Download email', 'Descargar correo')} onClick={() => downloadText(`${sample ? 'sample-' : ''}water-email.txt`, exportedText(`${draft.subject}\n\n${draft.body}`, language, sample))}><ReviewActionIcon kind="email" /><span>{say('Download email', 'Descargar correo')}</span></button><button className="request-icon-action" aria-label={say('Download report', 'Descargar reporte')} title={say('Download report', 'Descargar reporte')} onClick={() => downloadText(`${sample ? 'sample-' : ''}water-report.txt`, exportedText(generateReport(draft, language), language, sample))}><ReviewActionIcon kind="report" /><span>{say('Download report', 'Descargar reporte')}</span></button>{copy ? <button className="text-button" onClick={copy}>{say('Copy email', 'Copiar correo')}</button> : null}</span>
      </details>
    </div>
    {recordsMotion.present ? <div ref={recordsMotion.ref} inert={!showRecords} aria-hidden={!showRecords || undefined} id="request-records" role="dialog" aria-label={say('Records', 'Registros')} className="request-citations-popup request-records-popup" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeRecords() } }}>
      <button autoFocus className="text-button" aria-label={say('Close records', 'Cerrar registros')} onClick={closeRecords}><Icon name="x" size={20} /></button>
      <h3>{say('Problems', 'Problemas')}</h3>
      {!facts.length ? <p className="quiet-note">{say('No relevant records selected.', 'No hay registros pertinentes seleccionados.')}</p> : null}
      {facts.map(f => <article key={f.id} className="request-review-record">
        <table className="request-review-table request-source-table" aria-label={`${say('Problems', 'Problemas')}: ${f.record?.agency ?? say('Saved source record', 'Registro guardado')}`}><thead><tr><th>{say('Detail', 'Detalle')}</th><th>{say('Source record', 'Registro de la fuente')}</th></tr></thead><tbody>
          {row(say('Agency', 'Agencia'), f.record?.agency ?? say('Saved record', 'Registro guardado'))}
          {row(say(f.kind === 'historical' ? 'Finding date / year' : 'Notice date', f.kind === 'historical' ? 'Fecha / año del hallazgo' : 'Fecha del aviso'), `${f.record?.year ? `${f.record.year} · ` : ''}${readableDate(f.record?.date, language) ?? say('Not provided', 'No proporcionada')}`)}
          {row(say('Listed problem', 'Problema indicado'), f.record?.problem ?? say('See source details', 'Ver detalles de la fuente'))}
          {row(say('Published affected area', 'Zona afectada publicada'), f.record?.area || say('Not specified', 'No especificada'))}
          {row(say('Source-recorded status', 'Estado registrado por la fuente'), f.record?.status ?? say('Saved wording only', 'Solo texto guardado'))}
          {row(say('Current status', 'Estado actual'), f.kind === 'historical' ? say('Historical; not current', 'Histórico; no es actual') : f.record?.verified && f.kind === 'active' ? say('Verified in source check for this draft', 'Verificado en la consulta de fuente de este borrador') : say('Not verified', 'No verificado'))}
          <tr><th scope="row">{say('Source', 'Fuente')}</th><td className="request-source-cell"><RequestSources sources={f.sources} es={es} compact /></td></tr>
          <tr><th scope="row"><label htmlFor={`include-${f.id}`}>{say('Include in email', 'Incluir en el correo')}</label></th><td><input id={`include-${f.id}`} type="checkbox" checked={f.included} disabled={requiredIds.has(f.id)} onChange={e => changeFacts((draft.facts ?? []).map(row => row.id === f.id ? { ...row, included: e.target.checked } : row))} /></td></tr>
        </tbody></table>
      </article>)}
      {!draft.facts ? <RequestSources sources={draft.sources} es={es} compact /> : null}
    </div> : null}
  </div>
}
