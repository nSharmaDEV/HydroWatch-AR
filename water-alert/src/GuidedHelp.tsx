import { useRef, useState, type RefObject } from 'react'
import { RequestLocations } from './RequestLocations'
import { RequestPrompts } from './RequestPrompts'
import { RequestStepLayout } from './RequestStepLayout'
import { ResidentFollowups } from './ResidentFollowups'
import type { Language, Place } from './domain'
import type { HelpDraft, HelpFact, HelpStep, IssueType } from './help-requests'
import { hasReport, sendDestinations } from './help-requests'
import { SendOptions } from './SendOptions'
import { categoryPatch } from './help-draft'
import { helpPath, helpStep } from './help-flow'
import { Icon } from './components'
import { ConfirmedWording } from './ConfirmedWording'
import { ReviewEmail } from './ReviewEmail'
import { exportedText } from './help-exports'
import { IssueQuestions, invalidHelpDateRange } from './IssueQuestions'
import type { ReactNode } from 'react'

const choices: [IssueType, string, string][] = [
  ['advisory', 'Current advisory', 'Aviso actual'],
  ['billing', 'Bill or charge', 'Factura o cargo'],
  ['service', 'Service interruption or low pressure', 'Interrupción del servicio o baja presión'],
  ['quality', 'Water-quality concern', 'Inquietud sobre la calidad del agua'],
  ['other', 'Other issue', 'Otro problema'],
]
interface Props {
  places?: Place[]; topLine?: ReactNode;
  draft: HelpDraft; place: Place; language: Language; sample: boolean; deviceOnly: boolean; delivery: boolean; sending: boolean; saveFailed: boolean;
  heading: RefObject<HTMLHeadingElement | null>; extras: ReactNode;
  edit: (patch: Partial<HelpDraft>) => void; changeFacts: (facts: HelpFact[]) => void;
  go: (step: HelpStep) => void; send: () => void; regenerate: () => void;
}
export function GuidedHelp({ draft, place, places = [], topLine, language, sample, deviceOnly, delivery, sending, saveFailed, heading, extras, edit, changeFacts, go, send, regenerate }: Props) {
  const descriptionInput = useRef<HTMLTextAreaElement>(null), responseInput = useRef<HTMLTextAreaElement>(null)
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const step = helpStep(draft), path = helpPath(draft), index = path.indexOf(step), destinations = sendDestinations(draft)
  const [copyStatus, setCopyStatus] = useState('')
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(exportedText(`${draft.subject}\n\n${draft.body}`, language, sample))
      setCopyStatus(say('Copied. Nothing was sent.', 'Copiado. No se envió nada.'))
      return true
    } catch { setCopyStatus(say('Copy unavailable. Select the preview text or download it.', 'No se pudo copiar. Selecciona el texto de la vista previa o descárgalo.')); return false }
  }
  const titles: Record<HelpStep, string> = {
    choose: say('What do you need help with?', '¿Con qué necesitas ayuda?'),
    billing: say('Tell us about the bill', 'Cuéntanos sobre la factura'),
    timing: say('When, where and what you want', 'Cuándo, dónde y qué quieres'),
    experience: say('What happened?', '¿Qué pasó?'),
    response: say('What response would help?', '¿Qué respuesta te ayudaría?'),
    records: say('Supporting information for your request', 'Información de apoyo para tu solicitud'),
    review: say('Review your email', 'Revisa tu correo'),
    send: say('Send it', 'Envíalo'),
    confirm: say('Confirm and send', 'Confirma y envía'),
  }
  const missing = !hasReport(draft) || !draft.subject.trim() || !draft.body.trim() || /\[[A-Z_ ][A-Z_ ]{2,}\]/.test(draft.body)
  const next = step === 'timing' ? say('Review email', 'Revisar correo') : step === 'review' ? say('Where to send it', 'Dónde enviarlo') : say('Continue', 'Continuar')
  const badDates = invalidHelpDateRange(draft)
  return <RequestStepLayout title={titles[step]} heading={heading} supplier={place.name} topLine={topLine}
    progress={<div className="request-progress" aria-label={say('Request progress', 'Progreso de la solicitud')}><span>{say(`Step ${index + 1} of ${path.length}`, `Paso ${index + 1} de ${path.length}`)}</span><progress value={index + 1} max={path.length} aria-label={say('Progress', 'Progreso')} /></div>}
    status={sample ? <span className="quiet-note request-sample">{say('Sample — fictional. Sending disabled.', 'Ejemplo ficticio. Envío desactivado.')}</span> : deviceOnly ? <span className="quiet-note request-sample">{say('Live · device-only draft · not sent', 'Real · borrador local · no enviado')}</span> : null}
    action={<div className="request-primary-action">{step === 'send' ? sample || !delivery || !destinations.length ? <button className="primary" disabled={missing} onClick={() => void copy()}>{say('Copy email', 'Copiar correo')}</button> : <button className="primary" disabled={missing || sending || saveFailed} onClick={send}>{sending ? say('Sending…', 'Enviando…') : say('Send message', 'Enviar mensaje')}</button> : <button className="primary" disabled={sending || (step === 'experience' && !hasReport(draft)) || (step === 'timing' && badDates) || (step === 'review' && missing)} onClick={() => go(path[index + 1])}>{next}</button>}{step === 'send' && !sample && delivery && destinations.length ? <small>{say('Shares email and files. Acceptance is not delivery.', 'Comparte correo y archivos. Aceptado no significa entregado.')}</small> : null}</div>}>
    <div className={`request-fields request-guided request-screen-${step}`}>
      {step === 'choose' ? <div className="request-issue-grid" role="group" aria-label={say('Issue type', 'Tipo de problema')}>{choices.map(([issue, en, spanish], i) => <button key={issue} className="request-issue-choice" aria-pressed={draft.issue === issue} onClick={() => { if (draft.issue !== issue) edit(categoryPatch(draft, issue)) }}><Icon name={(['triangle-alert', 'receipt', 'gauge', 'flask-conical', 'ellipsis'] as const)[i]} /><span>{say(en, spanish)}</span></button>)}</div> : null}
      {step === 'billing' ? <><IssueQuestions draft={draft} es={es} onChange={edit} section="details" /><p className="quiet-note">{say('Use the bill’s description. Leave unknown amounts or dates blank; do not include account or payment details.', 'Usa la descripción de la factura. Deja en blanco importes o fechas desconocidos; no incluyas datos de cuenta ni de pago.')}</p></> : null}
      {step === 'experience' ? <>
        <div className="request-split request-experience-primary">
          <section className="request-panel request-experience-observations">
            <h2>{say('Choose what you observed', 'Elige lo que observaste')}</h2>
            {draft.issue !== 'other' ? <ConfirmedWording draft={draft} es={es} section="report" edit={edit} /> : null}
            <h3 className="request-experience-attachments-heading">{say('Add supporting material', 'Añade material de apoyo')}</h3>
            {extras}
          </section>
          <section className="request-panel request-experience-details">
            <h2>{say('Add details', 'Añade detalles')}</h2>
            {draft.issue === 'billing' ? <ResidentFollowups draft={draft} es={es} edit={edit} section="contact" showContact={false} /> : null}
            {['service', 'quality', 'billing'].includes(draft.issue) ? <ResidentFollowups draft={draft} es={es} edit={edit} section="details" /> : <RequestPrompts es={es} target={descriptionInput} />}
            <label>{say('Describe what happened (optional if selected above)', 'Describe lo que pasó (opcional si seleccionaste arriba)')}<textarea ref={descriptionInput} rows={4} value={draft.description} maxLength={6000} placeholder={say('For example, when and how the issue affected you.', 'Por ejemplo, cuándo y cómo le afectó el problema.')} aria-describedby="request-description-hint" onChange={e => edit({ description: e.target.value })} /></label>
            {draft.issue === 'billing' ? <label className="request-billing-tried">{say('What have you already tried? (optional)', '¿Qué has intentado? (opcional)')}<textarea rows={2} maxLength={1000} value={draft.answers?.tried ?? ''} onChange={e => edit({ answers: { ...draft.answers, tried: e.target.value } })} /></label> : null}
            <p id="request-description-hint" className="sr-only">{draft.issue === 'quality' ? say('Your observations, not a diagnosis of water safety.', 'Tus observaciones, no un diagnóstico de seguridad del agua.') : say('Your experience only. Leave unknowns blank.', 'Solo tu experiencia. Deja en blanco lo desconocido.')}</p>
          </section>
        </div>
      </> : null}
      {step === 'timing' ? <div className="request-split request-timing-response">
        <section className="request-panel request-timing-where" aria-labelledby="request-when-heading">
          <h2 id="request-when-heading">{say('When and where', 'Cuándo y dónde')}</h2>
          <IssueQuestions draft={draft} es={es} onChange={edit} section="details" />
          <label className="checkbox-row"><input type="checkbox" checked={draft.answers?.approximate === 'Yes'} onChange={e => edit({ answers: { ...draft.answers, approximate: e.target.checked ? 'Yes' : 'No' } })} />{say('These dates are approximate', 'Estas fechas son aproximadas')}</label>
          <p className="quiet-note">{say('Your experience dates, not the notice date. Leave unknowns blank.', 'Fechas de tu experiencia, no del aviso. Deja en blanco lo desconocido.')}</p>
          {draft.answers?.area ? <p className="quiet-note">{say('Saved area', 'Zona guardada')}: {draft.answers.area}</p> : null}{draft.dates ? <p className="quiet-note">{say('Saved additional date', 'Fecha adicional guardada')}: {draft.dates}</p> : null}
        </section>
        <section className="request-panel request-timing-locations">
          <RequestLocations draft={draft} places={places} sample={sample} es={es} edit={edit} />
        </section>
        <section className="request-panel request-timing-response-choices" aria-labelledby="request-response-heading">
          <h2 id="request-response-heading">{say('What response would help?', '¿Qué respuesta te ayudaría?')}</h2>
          <ConfirmedWording draft={draft} es={es} section="response" edit={edit} />
          <p className="quiet-note">{say('Only selected wording is included.', 'Solo se incluye el texto seleccionado.')}</p>
          <RequestPrompts es={es} response target={responseInput} />
          <label>{say('Additional wording (optional)', 'Texto adicional (opcional)')}<textarea ref={responseInput} rows={2} maxLength={1000} value={draft.answers?.response ?? ''} placeholder={say('For example, a specific update or action you need.', 'Por ejemplo, una actualización o acción específica que necesita.')} onChange={e => edit({ answers: { ...draft.answers, response: e.target.value } })} /></label>
        </section>
      </div> : null}
      {step === 'review' ? <ReviewEmail sample={sample} draft={draft} language={language} extras={extras} edit={edit} changeFacts={changeFacts} go={go} regenerate={regenerate} copy={!sample && delivery && destinations.length ? () => void copy() : undefined} /> : null}
      {step === 'send' ? <SendOptions draft={draft} language={language} sample={sample} blocked={missing} copy={copy} record={edit} /> : null}
      {(step === 'review' || step === 'send') && missing ? <p role="alert">{say('Complete the issue, subject and message; replace bracketed missing-information fields.', 'Completa el problema, asunto y mensaje; reemplaza los campos entre corchetes.')}</p> : null}
      {(step === 'review' || step === 'send') && copyStatus ? <p role="status">{copyStatus}</p> : null}
    </div>
  </RequestStepLayout>
}
