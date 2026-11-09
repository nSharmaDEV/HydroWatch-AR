import { useState, type RefObject } from 'react'
import { RequestStepLayout } from './RequestStepLayout'
import { ResidentFollowups } from './ResidentFollowups'
import type { Language, Place } from './domain'
import type { HelpDraft, HelpFact, HelpStep, IssueType } from './help-requests'
import { hasReport, sendDestinations } from './help-requests'
import { SendOptions } from './SendOptions'
import { categoryPatch } from './help-draft'
import { HELP_STEP_TITLES, helpPath, helpStep } from './help-flow'
import { Icon } from './components'
import { ConfirmedWording } from './ConfirmedWording'
import { ReviewEmail } from './ReviewEmail'
import { exportedText } from './help-exports'
import { IssueQuestions, invalidHelpDateRange } from './IssueQuestions'
import { QUESTIONS } from './help-questions'
import { providerContact } from './provider-contacts'
import { supplierDisplayName } from './help-format'
import type { ReactNode } from 'react'
import { latestReport } from './report-findings'

const choices: [IssueType, string, string][] = [
  ['advisory', 'Current advisory', 'Aviso actual'],
  ['billing', 'Bill or charge', 'Factura o cargo'],
  ['service', 'Service interruption or low pressure', 'Interrupción del servicio o baja presión'],
  ['quality', 'Water-quality concern', 'Inquietud sobre la calidad del agua'],
  ['other', 'Other issue', 'Otro problema'],
  ['report', 'Ask about a water report', 'Preguntar sobre un informe del agua'],
]
interface Props {
  places?: Place[]; topLine?: ReactNode;
  draft: HelpDraft; place: Place; language: Language; sample: boolean; deviceOnly: boolean; delivery: boolean; sending: boolean; saveFailed: boolean;
  heading: RefObject<HTMLHeadingElement | null>; extras: ReactNode;
  edit: (patch: Partial<HelpDraft>) => void; changeFacts: (facts: HelpFact[]) => void;
  go: (step: HelpStep) => void; send: () => void; regenerate: () => void;
}
/** Four screens: what's wrong → when and where → what they should do → send it. Every answer either enters the email or decides where it goes. */
export function GuidedHelp({ draft, place, language, sample, deviceOnly, delivery, sending, saveFailed, heading, topLine, extras, edit, changeFacts, go, send, regenerate }: Props) {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const step = helpStep(draft), path = helpPath(draft), index = path.indexOf(step), destinations = sendDestinations(draft)
  const a = draft.answers ?? {}, answer = (key: keyof typeof QUESTIONS, value: string) => edit({ answers: { ...draft.answers, [key]: value } })
  const [copyStatus, setCopyStatus] = useState('')
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(exportedText(`${draft.subject}\n\n${draft.body}`, language, sample))
      setCopyStatus(say('Copied. Nothing was sent.', 'Copiado. No se envió nada.'))
      return true
    } catch { setCopyStatus(say('Copy unavailable. Select the preview text or download it.', 'No se pudo copiar. Selecciona el texto de la vista previa o descárgalo.')); return false }
  }
  const title = (HELP_STEP_TITLES[step] ?? HELP_STEP_TITLES.choose!)[es ? 1 : 0]
  const missing = !hasReport(draft) || !draft.subject.trim() || !draft.body.trim() || /\[[A-Z_ ][A-Z_ ]{2,}\]/.test(draft.body)
  const badDates = invalidHelpDateRange(draft)
  const phone = !sample ? providerContact(place.id) : undefined
  const [address = '', ...otherPlaces] = draft.locations ?? []
  // Report questions are offered only where a hand-checked report lists findings.
  const askable = draft.issue === 'report' || !!latestReport(place, sample)?.findings.some(f => f.askable)
  const shown = choices.filter(([issue]) => issue !== 'report' || askable)
  const text = (key: keyof typeof QUESTIONS, label?: string) => <label key={key}>{label ?? QUESTIONS[key][es ? 1 : 0]}<input maxLength={key === 'account' ? 60 : 1000} value={a[key] ?? ''} onChange={e => answer(key, e.target.value)} /></label>
  const action = step === 'send'
    ? sample || !delivery || !destinations.length
      ? <button className="secondary" disabled={missing} onClick={() => void copy()}>{say('Copy email', 'Copiar correo')}</button>
      : <><button className="primary" disabled={missing || sending || saveFailed} onClick={send}>{sending ? say('Sending…', 'Enviando…') : say('Send message', 'Enviar mensaje')}</button><small>{say('Shares email and files. Acceptance is not delivery.', 'Comparte correo y archivos. Aceptado no significa entregado.')}</small></>
    : <button className="primary" disabled={sending || (step === 'choose' && !hasReport(draft)) || (step === 'details' && badDates)} onClick={() => go(path[index + 1])}>{step === 'response' ? say('Write my email', 'Escribir mi correo') : say('Continue', 'Continuar')}</button>
  return <RequestStepLayout title={title} heading={heading} supplier={supplierDisplayName(place.name)} topLine={topLine}
    progress={<div className="request-progress" aria-label={say('Request progress', 'Progreso de la solicitud')}><span>{say(`Step ${index + 1} of ${path.length}`, `Paso ${index + 1} de ${path.length}`)} · {title}</span><progress value={index + 1} max={path.length} aria-label={say('Progress', 'Progreso')} /></div>}
    status={step === 'choose' && phone?.phone ? <span className="quiet-note request-call-line">{say('Prefer to call?', '¿Prefieres llamar?')} {phone.dial ? <a href={`tel:${phone.dial}`}>{phone.phone}</a> : phone.phone}</span> : sample ? <span className="quiet-note request-sample">{say('Sample — fictional. Sending disabled.', 'Ejemplo ficticio. Envío desactivado.')}</span> : deviceOnly ? <span className="quiet-note request-sample">{say('Not sent yet', 'Aún no enviado')}</span> : null}
    action={<div className="request-primary-action">{action}</div>}>
    <div className={`request-fields request-guided request-screen-${step}`}>
      {step === 'choose' ? <>
        <div className="request-issue-grid" role="group" aria-label={say('Issue type', 'Tipo de problema')}>{shown.map(([issue, en, spanish]) => <button key={issue} className="request-issue-choice" aria-pressed={draft.issue === issue} onClick={() => { if (draft.issue !== issue) edit(categoryPatch(draft, issue)) }}><Icon name={({ advisory: 'triangle-alert', billing: 'receipt', service: 'gauge', quality: 'flask-conical', other: 'ellipsis', report: 'file-text', legal: 'shield' } as const)[issue]} /><span>{say(en, spanish)}</span></button>)}</div>
        {draft.issue !== 'other' && draft.issue !== 'report' ? <ConfirmedWording draft={draft} es={es} section="report" edit={edit} editable={false} extra={draft.issue === 'advisory'
          // "Also a service problem?" sits in the grid as one more checkbox; unchecked means not said, never "No".
          ? <div className={`request-wording-choice${a.advisoryService === 'Yes' ? ' is-selected' : ''}`}><label className="checkbox-row"><input type="checkbox" checked={a.advisoryService === 'Yes'} onChange={e => answer('advisoryService', e.target.checked ? 'Yes' : '')} /><span>{say('My water service is also affected', 'Mi servicio de agua también se ve afectado')}</span></label></div>
          : undefined} /> : null}
        {draft.issue === 'advisory' && a.advisoryService === 'Yes' ? <ConfirmedWording draft={{ ...draft, issue: 'service' }} section="report" prefix="service" es={es} edit={edit} editable={false} /> : null}
        <label className="request-description">{draft.issue === 'report' ? say('Your question', 'Tu pregunta') : draft.issue === 'other' ? say('What happened?', '¿Qué pasó?') : say('Anything else? (optional)', '¿Algo más? (opcional)')}<textarea rows={2} value={draft.description} maxLength={6000} placeholder={draft.issue === 'quality' ? say('What you saw, smelled or tasted. Not a safety test.', 'Lo que viste, oliste o probaste. No es una prueba de seguridad.') : say('In your own words. Leave out what you don’t know.', 'Con tus palabras. Omite lo que no sepas.')} onChange={e => edit({ description: e.target.value })} /></label>
      </> : null}
      {step === 'details' ? <>
        <div className="request-question-grid request-details-row">
          <label>{say('Address where this happened', 'Dirección donde pasó')}<input maxLength={300} autoComplete="street-address" value={address} onChange={e => edit({ locations: e.target.value ? [e.target.value, ...otherPlaces] : otherPlaces })} /></label>
          {text('account')}
        </div>
        {otherPlaces.length ? <p className="quiet-note">{say('Also saved', 'También guardado')}: {otherPlaces.join('; ')}</p> : null}
        {draft.issue === 'billing'
          ? <div className="request-question-grid request-details-row">{text('billingPeriod', say('Which bill? (optional)', '¿Qué factura? (opcional)'))}{text('amount')}</div>
          : <IssueQuestions draft={draft} es={es} onChange={edit} section="details" />}
        {['service', 'quality'].includes(draft.issue) || draft.issue === 'advisory' && a.advisoryService === 'Yes' ? <ResidentFollowups draft={draft.issue === 'advisory' ? { ...draft, issue: 'service' } : draft} es={es} edit={edit} section="details" /> : null}
        {a.area ? <p className="quiet-note">{say('Saved area', 'Zona guardada')}: {a.area}</p> : null}{draft.dates ? <p className="quiet-note">{say('Saved additional date', 'Fecha adicional guardada')}: {draft.dates}</p> : null}
      </> : null}
      {step === 'response' ? <>
        <ConfirmedWording draft={draft} es={es} section="response" edit={edit} editable={false} />
        <div className="request-question-grid request-details-row">
          {text('response', say('Anything else to ask? (optional)', '¿Algo más que pedir? (opcional)'))}
          {text('tried')}
        </div>
        <div className="request-question-grid request-details-row">
          <label>{say('Your name (optional)', 'Tu nombre (opcional)')}<input maxLength={120} autoComplete="name" value={draft.residentName ?? ''} onChange={e => edit({ residentName: e.target.value })} /></label>
          <label>{say('How can they reach you? (optional)', '¿Cómo pueden contactarte? (opcional)')}<input maxLength={200} value={draft.replyContact ?? ''} placeholder={say('Email or phone', 'Correo o teléfono')} onChange={e => edit({ replyContact: e.target.value })} /></label>
        </div>
        {extras}
      </> : null}
      {step === 'send' ? <div className="request-send-layout">
        <ReviewEmail sample={sample} draft={draft} language={language} extras={extras} edit={edit} changeFacts={changeFacts} go={go} regenerate={regenerate} copy={!sample && delivery && destinations.length ? () => void copy() : undefined} />
        <SendOptions draft={draft} language={language} sample={sample} blocked={missing} copy={copy} record={edit} />
      </div> : null}
      {step === 'send' && missing ? <p role="alert">{say('Complete the issue, subject and message; replace bracketed missing-information fields.', 'Completa el problema, asunto y mensaje; reemplaza los campos entre corchetes.')}</p> : null}
      {step === 'send' && copyStatus ? <p role="status">{copyStatus}</p> : null}
    </div>
  </RequestStepLayout>
}
