import React, { useId, useState, type RefObject } from 'react'
import { RequestStepLayout } from './RequestStepLayout'
import { ResidentFollowups } from './ResidentFollowups'
import type { Language, Place } from './domain'
import type { HelpDraft, HelpFact, HelpStep, IssueType } from './help-requests'
import { hasAddress, hasReport, isReportFactId, sendDestinations } from './help-requests'
import { AddressField } from './AddressField'
import { SendOptions } from './SendOptions'
import { categoryPatch } from './help-draft'
import { HELP_STEP_HEADINGS, HELP_STEP_TITLES, helpPath, helpStep } from './help-flow'
import { Icon } from './components'
import { ConfirmedWording } from './ConfirmedWording'
import { ReviewEmail } from './ReviewEmail'
import { ReviewFiles, ReviewNextSteps } from './ReviewFiles'
import { exportedText } from './help-exports'
import { IssueQuestions, invalidHelpDateRange } from './IssueQuestions'
import { QUESTIONS } from './help-questions'
import type { ReactNode } from 'react'
import { latestReport } from './report-findings'
import { selectedHelpExample, helpPrompt } from './help-prompts'

const choices: [IssueType, string, string][] = [
  ['advisory', 'Current advisory', 'Aviso actual'],
  ['billing', 'Bill or charge', 'Factura o cargo'],
  ['service', 'Service interruption or low pressure', 'Interrupción del servicio o baja presión'],
  ['quality', 'Water-quality concern', 'Inquietud sobre la calidad del agua'],
  ['report', 'Ask about a water report', 'Preguntar sobre un informe del agua'],
  ['other', 'Other issue', 'Otro problema'],
]
function formatPhone(value: string) {
  if (!/^[\d\s()+.\-]*$/.test(value)) return value
  const digits = value.replace(/\D/g, '')
  const us = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (us.length > 10) return value
  if (us.length <= 3) return us
  if (us.length <= 6) return `(${us.slice(0, 3)}) ${us.slice(3)}`
  return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`
}
interface Props {
  places?: Place[]; status?: ReactNode; onHistory: () => void;
  draft: HelpDraft; place: Place; language: Language; sample: boolean; deviceOnly: boolean; delivery: boolean; sending: boolean; saveFailed: boolean;
  heading: RefObject<HTMLHeadingElement | null>; extras: ReactNode; actionExtras?: ReactNode;
  edit: (patch: Partial<HelpDraft>) => void; changeFacts: (facts: HelpFact[]) => void;
  go: (step: HelpStep) => void; send: () => void; regenerate: () => void;
}
/** Six input screens and email-first review; report context and questions are automatic. */
export function GuidedHelp({ draft, place, language, sample, delivery, sending, saveFailed, heading, status, onHistory, extras, actionExtras, edit, changeFacts, go, send, regenerate }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const step = helpStep(draft), path = helpPath(draft), index = path.indexOf(step), destinations = sendDestinations(draft)
  const a = draft.answers ?? {}, answer = (key: keyof typeof QUESTIONS, value: string) => edit({ answers: { ...draft.answers, [key]: value } })
  const [copyStatus, setCopyStatus] = useState('')
  const [reviewingAnswers, setReviewingAnswers] = useState(false)
  const [reviewSwitchTarget, setReviewSwitchTarget] = useState<HTMLSpanElement | null>(null)
  const fieldId = useId()
  const [addressAttempt, setAddressAttempt] = useState(false)
  const mediaHint = say('Up to 3 files, 1 MB total per step. Videos: MP4 or WebM. Files are not attached automatically when you open your email app; attach them yourself. Avoid sensitive details.', 'Hasta 3 archivos, 1 MB en total por paso. Videos: MP4 o WebM. Los archivos no se adjuntan automáticamente al abrir tu correo; adjúntalos tú. Evita datos sensibles.')
  const guidance = (field: 'description' | 'action' | 'tried' | 'questions', label: string, value: string, maxLength: number, change: (value: string) => void) => {
    return <div className={`request-field-group${field === 'description' ? ' request-description' : ''}`}><label htmlFor={`${fieldId}-${field}`}>{label}</label><textarea id={`${fieldId}-${field}`} rows={field === 'action' || field === 'description' ? 3 : 4} value={value} maxLength={maxLength} placeholder={field === 'description' || field === 'action' ? selectedHelpExample(draft.issue, field, es, draft.wording?.report ?? {}, draft.wording?.response ?? {}) : helpPrompt(draft.issue, field, es)} aria-describedby={field === 'description' || field === 'action' ? `${fieldId}-media-hint` : undefined} onChange={e => change(e.target.value)} /></div>
  }
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(exportedText(`${draft.subject}\n\n${draft.body}`, language, sample))
      setCopyStatus(say('Copied. Nothing was sent.', 'Copiado. No se envió nada.'))
      return true
    } catch { setCopyStatus(say('Copy unavailable. Select and copy the message text manually.', 'No se pudo copiar. Selecciona y copia el texto del mensaje manualmente.')); return false }
  }
  const title = step === 'send' ? say('Your message is ready', 'Tu mensaje está listo') : (HELP_STEP_HEADINGS[step] ?? HELP_STEP_HEADINGS.choose!)[es ? 1 : 0], shortTitle = (HELP_STEP_TITLES[step] ?? HELP_STEP_TITLES.choose!)[es ? 1 : 0]
  const [footerTarget, setFooterTarget] = useState<HTMLSpanElement | null>(null)
  const [toolbarTarget, setToolbarTarget] = useState<HTMLSpanElement | null>(null)
  const missing = !hasReport(draft) || !draft.subject.trim() || !draft.body.trim() || /\[[A-Z_ ][A-Z_ ]{2,}\]/.test(draft.body)
  const badDates = invalidHelpDateRange(draft)
  const [address = '', ...otherPlaces] = draft.locations ?? []
  // A report URL alone is not document evidence.
  const askable = draft.issue === 'report' || !!latestReport(place, sample)?.findings.some(f => f.askable) || !sample && (draft.facts ?? []).some(f => f.kind === 'historical' && isReportFactId(f.id))
  const shown = choices.filter(([issue]) => issue !== 'report' || askable)
  const text = (key: keyof typeof QUESTIONS, label?: string) => <label key={key}>{label ?? QUESTIONS[key][es ? 1 : 0]}<input maxLength={key === 'account' ? 60 : 1000} value={a[key] ?? ''} onChange={e => answer(key, e.target.value)} /></label>
  const canGo = (target: HelpStep) => !sending && (target === 'choose' || target === 'noticed' || hasReport(draft)) && (['choose', 'noticed', 'details'].includes(target) || !badDates)
  /** Radio-group arrow keys move the selection to the neighbouring category card. */
  function moveChoice(e: React.KeyboardEvent<HTMLButtonElement>, issue: IssueType) {
    const delta = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const at = shown.findIndex(([i]) => i === issue), next = shown[(at + delta + shown.length) % shown.length]
    if (draft.issue !== next[0]) edit(categoryPatch(draft, next[0]))
    queueMicrotask(() => (e.currentTarget.parentElement?.children[(at + delta + shown.length) % shown.length] as HTMLElement | undefined)?.focus())
  }
  const formSteps = path.length - 1, number = Math.min(index + 1, formSteps), review = step === 'send'
  const primary = review ? null : <button className="primary" disabled={!canGo(path[index + 1])} onClick={() => { if (step === 'details' && !hasAddress(draft)) { setAddressAttempt(true); document.querySelector<HTMLInputElement>('.address-field input')?.focus(); return } go(path[index + 1]) }}>{step === 'anything' ? say('Review my message', 'Revisar mi mensaje') : say('Continue', 'Continuar')}<Icon name="arrow-right" size={18} /></button>
  const footer = <div className="request-footer"><button className="request-history-button" aria-label={say('Open History', 'Abrir Historial')} disabled={sending} onClick={onHistory}><Icon name="history" size={24} /></button><div className="request-footer-nav">{index > 0 ? <button className="request-back-button" disabled={sending} onClick={() => { setReviewingAnswers(false); go(path[index - 1]) }}><span aria-hidden="true">← </span>{say('Back', 'Atrás')}</button> : null}{primary}{review ? <span ref={setFooterTarget} className="request-review-footer-target" /> : null}</div></div>
  const progress = <div className="request-progress"><div className="request-progress-heading"><p className="request-progress-label">{review ? say('Review · last step', 'Revisión · último paso') : say(`Step ${number} of ${formSteps} · ${shortTitle}`, `Paso ${number} de ${formSteps} · ${shortTitle}`)}</p>{review ? <span ref={setReviewSwitchTarget} className="request-progress-review-action" /> : null}</div><div className="request-progress-bar" role="progressbar" aria-label={say('Request progress', 'Progreso de la solicitud')} aria-valuemin={1} aria-valuemax={formSteps} aria-valuenow={number}>{Array.from({ length: formSteps }, (_, n) => <span key={n} className={n < number ? 'is-done' : undefined} />)}</div></div>
  return <RequestStepLayout title={title} heading={heading} progress={progress} footer={footer}
    status={sample ? <span className="quiet-note request-sample">{say('Sample — fictional. Sending disabled.', 'Ejemplo ficticio. Envío desactivado.')}</span> : status}>
    <div className={`request-fields request-guided request-screen-${step}`}>
      {step === 'choose' ? <section className="help-column">
        <div className="request-issue-grid" role="radiogroup" aria-label={say('Issue type', 'Tipo de problema')}>{shown.map(([issue, en, spanish]) => <button key={issue} role="radio" aria-checked={draft.issue === issue} tabIndex={draft.issue === issue || (!shown.some(([i]) => i === draft.issue) && issue === shown[0][0]) ? 0 : -1} className="request-issue-choice" onKeyDown={e => moveChoice(e, issue)} onClick={() => { if (draft.issue !== issue) edit(categoryPatch(draft, issue)) }}><Icon name={({ advisory: 'triangle-alert', billing: 'receipt', service: 'gauge', quality: 'flask-conical', other: 'ellipsis', report: 'file-text', legal: 'shield' } as const)[issue]} /><span>{say(en, spanish)}</span>{draft.issue === issue ? <span className="request-issue-check" aria-hidden="true"><Icon name="circle-check" size={16} /></span> : null}</button>)}</div>
        </section> : null}
      {step === 'noticed' ? <section className="help-column">
        {draft.issue !== 'other' && draft.issue !== 'report' ? <ConfirmedWording draft={draft} es={es} section="report" edit={edit} editable={false} extra={draft.issue === 'advisory'
          // "Also a service problem?" sits in the grid as one more checkbox; unchecked means not said, never "No".
          ? <div className={`request-wording-choice${a.advisoryService === 'Yes' ? ' is-selected' : ''}`}><label className="checkbox-row"><input type="checkbox" checked={a.advisoryService === 'Yes'} onChange={e => answer('advisoryService', e.target.checked ? 'Yes' : '')} /><Icon className="wording-icon" name="gauge" size={24} /><span className="wording-label">{say('My water service is also affected', 'Mi servicio de agua también se ve afectado')}</span>{a.advisoryService === 'Yes' ? <span className="wording-selected-mark" aria-hidden="true"><Icon name="circle-check" size={20} /></span> : null}</label></div>
          : undefined} /> : null}
        {draft.issue === 'advisory' && a.advisoryService === 'Yes' ? <ConfirmedWording draft={{ ...draft, issue: 'service' }} section="report" prefix="service" es={es} edit={edit} editable={false} /> : null}
        <div className="request-action-media">{guidance('description', draft.issue === 'report' ? say('Your question', 'Tu pregunta') : draft.issue === 'other' ? say('What happened?', '¿Qué pasó?') : say('Anything else? (optional)', '¿Algo más? (opcional)'), draft.description, 6000, description => edit({ description }))}{actionExtras}<span id={`${fieldId}-media-hint`} className="sr-only">{mediaHint}</span></div>
        </section> : null}
      {step === 'details' ? <section className="help-column">
        <AddressField es={es} forceError={addressAttempt && !hasAddress(draft)} value={{ label: address, selection: draft.addressSelection, manual: draft.addressManual }}
          onChange={v => { setAddressAttempt(false); edit({ locations: v.label ? [v.label, ...otherPlaces] : otherPlaces, addressSelection: v.selection, addressManual: v.manual }) }} />
        {text('account')}
        {otherPlaces.length ? <p className="quiet-note">{say('Also saved', 'También guardado')}: {otherPlaces.join('; ')}</p> : null}
        {draft.issue === 'billing'
          ? <>{text('billingPeriod', say('Which bill? (optional)', '¿Qué factura? (opcional)'))}{text('amount')}</>
          : <IssueQuestions draft={draft} es={es} onChange={edit} section="details" paired>
            {['service', 'quality'].includes(draft.issue) || draft.issue === 'advisory' && a.advisoryService === 'Yes' ? <ResidentFollowups draft={draft.issue === 'advisory' ? { ...draft, issue: 'service' } : draft} es={es} edit={edit} section="details" /> : null}
          </IssueQuestions>}
        {a.area ? <p className="quiet-note">{say('Saved area', 'Zona guardada')}: {a.area}</p> : null}{draft.dates ? <p className="quiet-note">{say('Saved additional date', 'Fecha adicional guardada')}: {draft.dates}</p> : null}
        </section> : null}
      {step === 'request' ? <section className="help-column">
        <ConfirmedWording draft={draft} es={es} section="response" edit={edit} editable={false} />
        <div className="request-action-media">{guidance('action', say('Additional action details (optional)', 'Detalles adicionales de la acción (opcional)'), draft.wording?.response.details ?? '', 1000, details => edit({ wording: { report: draft.wording?.report ?? {}, response: { ...draft.wording?.response, details } } }))}{actionExtras}<span id={`${fieldId}-media-hint`} className="sr-only">{mediaHint}</span></div>
         </section> : null}
      {step === 'response' ? <section className="help-column">
          <label>{say('Your name (optional)', 'Tu nombre (opcional)')}<input maxLength={120} autoComplete="name" value={draft.residentName ?? ''} onChange={e => edit({ residentName: e.target.value })} /></label>
          <p>{say('How can they reach you? (optional)', '¿Cómo pueden contactarte? (opcional)')}</p>
          <div className="request-contact-pair"><label>{say('Email (optional)', 'Correo electrónico (opcional)')}<input type="email" autoComplete="email" maxLength={200} value={draft.replyEmail ?? ''} onChange={e => edit({ replyEmail: e.target.value })} onBlur={e => edit({ replyEmail: e.target.value.trim() })} /></label>
          <label>{say('US phone number (optional)', 'Teléfono de EE. UU. (opcional)')}<input type="tel" autoComplete="tel-national" maxLength={200} value={draft.replyPhone ?? ''} onChange={e => edit({ replyPhone: formatPhone(e.target.value) })} /></label></div>
          {draft.replyContact !== undefined && draft.replyContact !== '' ? <label>{say('Previously saved contact details', 'Datos de contacto guardados anteriormente')}<input maxLength={200} value={draft.replyContact} onChange={e => edit({ replyContact: e.target.value })} /></label> : null}
        {extras}
        </section> : null}
      {step === 'anything' ? <section className="help-column">
        <ResidentFollowups draft={draft} es={es} edit={edit} section="contact" />
        {guidance('tried', QUESTIONS.tried[es ? 1 : 0], a.tried ?? '', 1000, value => answer('tried', value))}
        {guidance('questions', say('Anything else to ask? (optional)', '¿Algo más que pedir? (opcional)'), a.response ?? '', 1000, value => answer('response', value))}
        </section> : null}
      {step === 'send' ? <div className="request-send-layout">
        <ReviewEmail sample={sample} draft={draft} language={language} extras={extras} edit={edit} changeFacts={changeFacts} go={go} regenerate={regenerate} copy={() => void copy()} toolbarRef={setToolbarTarget} onAnswersChange={setReviewingAnswers} switchTarget={reviewSwitchTarget} />
        {!reviewingAnswers ? <div className="review-side">
          <SendOptions draft={draft} language={language} sample={sample} blocked={missing} copy={copy} record={edit} footerTarget={footerTarget} toolbarTarget={toolbarTarget} compact onHistory={onHistory} />
          <ReviewFiles files={draft.attachments} language={language} />
          <ReviewNextSteps language={language} />
        </div> : null}
        {!reviewingAnswers && !sample && delivery && destinations.length ? <details className="help-account-send"><summary>{say('Send through WAVE instead', 'Enviar a través de WAVE')}</summary><p className="quiet-note">{say('Shares email and files with the selected recipients. Acceptance by the email processor is not confirmed delivery or resolution.', 'Comparte correo y archivos con los destinatarios seleccionados. La aceptación por el procesador no confirma entrega ni solución.')}</p><button className="secondary" disabled={missing || sending || saveFailed} onClick={send}>{sending ? say('Sending…', 'Enviando…') : say('Send message', 'Enviar mensaje')}</button></details> : null}
      </div> : null}
      {step === 'send' && missing ? <p role="alert">{say('Complete the issue, subject and message; replace bracketed missing-information fields.', 'Completa el problema, asunto y mensaje; reemplaza los campos entre corchetes.')}</p> : null}
      {step === 'send' && copyStatus ? <p role="status">{copyStatus}</p> : null}
    </div>
  </RequestStepLayout>
}
