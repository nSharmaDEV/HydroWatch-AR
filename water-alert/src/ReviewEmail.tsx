import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Language } from './domain'
import type { HelpDraft, HelpFact, HelpStep } from './help-requests'
import { relevantFacts } from './help-flow'
import { requiredReportEvidence } from './recovery-evidence'
import { ISSUE_LABELS } from './help-questions'
import { answerFingerprint, confirmedSections, generateReport } from './help-outputs'
import { readableDate } from './help-format'
import { RequestRecipients } from './RequestRecipients'
import { RequestSources } from './RequestSources'
import { downloadText } from './help-client'

function ReviewActionIcon({ kind }: { kind: 'refresh' | 'email' | 'report' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 'refresh' ? <><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5" /></> : kind === 'email' ? <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="m3 5 9 6 9-6M12 17v5m-3-3 3 3 3-3" /></> : <><path d="M14 2H5v20h14V7ZM14 2v5h5M8 11h8M8 15h4m5 1v6m-3-3 3 3 3-3" /></>}</svg>
}

interface Props {
  draft: HelpDraft; language: Language; sample?: boolean; extras: ReactNode;
  edit: (patch: Partial<HelpDraft>) => void; changeFacts: (facts: HelpFact[]) => void;
  go: (step: HelpStep) => void; regenerate: () => void; copy?: () => void;
}

/** One review surface; storage and final delivery remain owned by the workspace. */
export function ReviewEmail({ draft, language, sample = false, extras, edit, changeFacts, go, regenerate, copy }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const editor = useRef<HTMLTextAreaElement>(null)
  // A controlled textarea receives its value after mount; explicitly start at the
  // greeting on entry, not on every keystroke or answer/fact update.
  useLayoutEffect(() => { if (editor.current) { editor.current.setSelectionRange(0, 0); editor.current.scrollTop = 0 } }, [draft.id])
  const [showCitations, setShowCitations] = useState(false)
  const citationButton = useRef<HTMLButtonElement>(null)
  const closeCitations = () => { setShowCitations(false); citationButton.current?.focus() }
  const requiredIds = new Set(requiredReportEvidence(draft.place, sample).map(row => row.key))
  const facts = relevantFacts(draft, sample), sections = confirmedSections(draft, language), a = draft.answers ?? {}
  const stale = !!draft.generatedFrom && draft.generatedFrom !== answerFingerprint(draft)
  const citations = new Map<string, { source: HelpFact['sources'][number]; numbers: number[] }>()
  sections.facts.forEach((f, i) => f.sources.forEach(source => { const old = citations.get(source.url); citations.set(source.url, { source, numbers: [...new Set([...(old?.numbers ?? []), i + 1])] }) }))
  const row = (label: string, value: string | undefined) => <tr key={label}><th scope="row">{label}</th><td>{value?.trim() || say('Not provided', 'No proporcionado')}</td></tr>
  const answerRow = (label: string, value: string, step: HelpStep, supplied: boolean, name = label.toLocaleLowerCase()) => <tr key={label}><th scope="row">{label}</th><td><span className="request-answer-value">{supplied && value.trim() ? <span>{value}</span> : <button className="request-answer-missing" aria-label={`${say('Add', 'Añadir')} ${name}`} onClick={() => go(step)}>{say('Not provided', 'No proporcionado')}</button>}<button className="request-answer-info" aria-label={`${say('Edit', 'Editar')} ${name}`} title={`${say('Edit', 'Editar')} ${name}`} onClick={() => go(step)}><span aria-hidden="true">ⓘ</span></button></span></td></tr>
  const report = Object.entries(draft.wording?.report ?? {}).filter(([key]) => draft.issue !== 'advisory' || a.advisoryService === 'Yes' || !key.startsWith('service')).map(([, text]) => text).filter(Boolean)
  const observations = [...report, draft.description].filter(Boolean).join('; ')
  const contact = a.contacted === 'Yes' ? [say('Yes', 'Sí'), readableDate(a.contactDate, language), a.contactMethod, a.contactResponse].filter(Boolean).join(' · ') : a.contacted === 'No' ? 'No' : a.contacted === 'Prefer not to say' ? say('Prefer not to say', 'Prefiero no decirlo') : ''
  const requested = [...Object.values(draft.wording?.response ?? {}), a.response].filter(Boolean).join('; ')
  const billing = draft.issue === 'billing' ? [a.chargeKind, a.billingPeriod, a.amount, a.charge, a.tried].filter(Boolean).join('; ') : ''
  return <div className="request-review-grid">
      <section className="request-review-information" aria-label={say('Information provided', 'Información proporcionada')}>
        <section className="request-signature"><h2>{say('Name / reply contact (optional)', 'Nombre / contacto (opcional)')}</h2><label>{say('Resident name (optional)', 'Nombre del residente (opcional)')}<input maxLength={120} value={draft.residentName ?? ''} onChange={e => edit({ residentName: e.target.value })} /></label><label>{say('Preferred reply contact (optional)', 'Contacto de respuesta (opcional)')}<input maxLength={200} value={draft.replyContact ?? ''} onChange={e => edit({ replyContact: e.target.value })} /></label></section>
        <h2>{say('What you provided', 'Lo que proporcionaste')}</h2>
      <section className="request-review-section" aria-label={say('Your information', 'Tu información')}>
        <table className="request-review-table" aria-label={say('What you provided', 'Lo que proporcionaste')}><thead><tr><th>{say('Detail', 'Detalle')}</th><th>{say('Your answer', 'Tu respuesta')}</th></tr></thead><tbody>
          {answerRow(say('Issue', 'Problema'), ISSUE_LABELS[draft.issue][es ? 1 : 0], 'choose', true, say('reported issue', 'problema reportado'))}
          {answerRow(say('Observations', 'Observaciones'), [observations, billing, draft.issue === 'advisory' && a.advisoryService ? `${say('Service problem', 'Problema de servicio')}: ${a.advisoryService}` : ''].filter(Boolean).join('; '), 'experience', !!(observations || billing || a.advisoryService), say('reported observations', 'observaciones reportadas'))}
          {answerRow(say('First noticed', 'Primera observación'), `${readableDate(a.began || a.noticed, language) ?? ''}${a.approximate === 'Yes' ? ` (${say('approximate', 'aproximada')})` : ''}`, 'timing', !!(a.began || a.noticed), say('reported start date', 'fecha de inicio reportada'))}
          {answerRow(say('Ongoing', 'Continúa'), a.ongoing ? a.ongoing === 'Yes' ? say('Yes', 'Sí') : a.ongoing === 'No' ? say('No', 'No') : say('Not sure', 'No sé') : '', 'timing', !!a.ongoing, say('reported ongoing status', 'estado de continuidad'))}
          {a.ongoing === 'No' ? answerRow(say('Ended', 'Terminó'), readableDate(a.ended, language) ?? '', 'timing', !!a.ended, say('reported end date', 'fecha de finalización reportada')) : null}
          {draft.dates ? answerRow(say('Additional date', 'Fecha adicional'), readableDate(draft.dates, language) ?? draft.dates, 'timing', true, say('additional date', 'fecha adicional')) : null}
          {(draft.issue === 'service' || draft.issue === 'quality' || draft.issue === 'advisory' && a.advisoryService === 'Yes') ? answerRow(say('Frequency', 'Frecuencia'), a.frequency ? ({ Constant: say('Constantly', 'Constantemente'), Occasional: say('Occasionally', 'Ocasionalmente'), 'At particular times': say('At particular times', 'A ciertas horas') }[a.frequency] ?? a.frequency) : '', 'experience', !!a.frequency, say('reported frequency', 'frecuencia reportada')) : null}
          {answerRow(say('Locations', 'Lugares'), [...(draft.locations ?? []), a.area, (draft.issue === 'service' || draft.issue === 'advisory' && a.advisoryService === 'Yes') ? a.observationLocation : ''].filter(Boolean).join('; '), 'timing', !!(draft.locations?.length || a.area || (draft.issue === 'service' && a.observationLocation)), say('affected location', 'ubicación afectada'))}
          {answerRow(say('Previous provider contact', 'Contacto previo con el proveedor'), contact, 'experience', !!contact, say('previous provider contact', 'contacto previo con el proveedor'))}
          {answerRow(say('Requested response', 'Respuesta solicitada'), requested, 'response', !!requested, say('requested response', 'respuesta solicitada'))}
        </tbody></table>
      </section>
      <section className="request-review-section request-review-records" aria-label={say('Problems', 'Problemas')}><h2>{say('Problems', 'Problemas')}</h2>
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
      </section>
      <section className="request-review-section" aria-label={say('Attachments', 'Archivos adjuntos')}><h2>{say('Attachments', 'Archivos adjuntos')}</h2>
        {extras}
        {draft.attachments.length ? <p className="quiet-note">{say('Copied email text does not include these files.', 'El texto de correo copiado no incluye estos archivos.')}</p> : null}
      </section>
    </section>
    <section className="request-composer request-review-email" aria-label={say('Your email', 'Tu correo')}>
      <h2 className="sr-only">{say('Your email', 'Tu correo')}</h2>
      <div className="request-citation-control"><button ref={citationButton} className="request-answer-info" aria-label={say('Cited sources', 'Fuentes citadas')} title={say('Cited sources', 'Fuentes citadas')} aria-expanded={showCitations} aria-controls="request-citations" onClick={() => setShowCitations(!showCitations)}><span aria-hidden="true">ⓘ</span></button>
        {showCitations ? <div id="request-citations" role="dialog" aria-label={say('Cited sources', 'Fuentes citadas')} className="request-citations-popup" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeCitations() } }}><button autoFocus className="text-button" aria-label={say('Close citations', 'Cerrar citas')} onClick={closeCitations}>×</button><h3>{say('Cited sources', 'Fuentes citadas')}</h3>{citations.size ? [...citations].map(([url, row]) => <a key={url} href={url} target="_blank" rel="noreferrer">[{row.numbers.join(', ')}] {row.source.label || say('Official source', 'Fuente oficial')}</a>) : <RequestSources sources={draft.sources} es={es} compact />}{facts.map(f => <p key={f.id}>{f.text}</p>)}</div> : null}
      </div>
      {stale ? <p className="request-stale" role="status">{say('Your answers changed. Update the draft to include them.', 'Tus respuestas cambiaron. Actualiza el borrador para incluirlas.')}</p> : null}
      <div className="request-output-email"><RequestRecipients draft={draft} es={es} edit={edit} />
        <label className="request-subject">{say('Subject', 'Asunto')}<input value={draft.subject} maxLength={200} onChange={e => edit({ subject: e.target.value })} /></label>
        <label><span className="sr-only">{say('Message', 'Mensaje')}</span><textarea ref={editor} className="request-message-editor" rows={18} value={draft.body} maxLength={24000} onChange={e => edit({ body: e.target.value })} /></label>
      </div>
      <div className="request-review-update"><p className="quiet-note">{say('Replaces your subject and message, including manual edits.', 'Reemplaza el asunto y el mensaje, incluidos los cambios manuales.')}</p><button className="request-icon-action" aria-label={say('Update draft from answers', 'Actualizar borrador desde las respuestas')} title={say('Update draft', 'Actualizar borrador')} onClick={regenerate}><ReviewActionIcon kind="refresh" /></button>
        <div className="request-review-downloads"><button className="request-icon-action" aria-label={say('Download email', 'Descargar correo')} title={say('Download email', 'Descargar correo')} onClick={() => downloadText('water-email.txt', `${draft.subject}\n\n${draft.body}`)}><ReviewActionIcon kind="email" /></button><button className="request-icon-action" aria-label={say('Download report', 'Descargar reporte')} title={say('Download report', 'Descargar reporte')} onClick={() => downloadText('water-report.txt', generateReport(draft, language))}><ReviewActionIcon kind="report" /></button>{copy ? <button className="text-button" onClick={copy}>{say('Copy email', 'Copiar correo')}</button> : null}</div>
      </div>
    </section>
  </div>
}
