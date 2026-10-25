import type { HelpDraft } from './help-requests'
import { QUESTIONS, type AnswerKey } from './help-questions'
import { ConfirmedWording } from './ConfirmedWording'
export function ResidentFollowups({ draft, es, edit, section = 'all', showContact = true }: { draft: HelpDraft; es: boolean; edit: (patch: Partial<HelpDraft>) => void; section?: 'all' | 'details' | 'contact'; showContact?: boolean }) {
  const a = draft.answers ?? {}, answer = (key: AnswerKey, value: string) => edit({ answers: { ...a, [key]: value } })
  const field = (key: AnswerKey, multiline = false) => <label key={key}>{QUESTIONS[key][es ? 1 : 0]}{multiline ? <textarea rows={2} maxLength={1000} value={a[key] ?? ''} onChange={e => answer(key,e.target.value)} /> : <input type={key === 'contactDate' ? 'date' : 'text'} maxLength={1000} value={a[key] ?? ''} onChange={e => answer(key,e.target.value)} />}</label>
  const service = draft.issue === 'service' || draft.issue === 'advisory' && a.advisoryService === 'Yes'
  return <div className="request-followups">
    {section !== 'contact' ? <>
    {draft.issue === 'billing' ? <div className="request-question-grid">{((section === 'details' ? ['amount','charge'] : ['chargeKind','billingPeriod','amount','charge']) as AnswerKey[]).map(k => field(k))}</div> : null}
    {draft.issue === 'advisory' ? <><label>{QUESTIONS.advisoryService[es ? 1 : 0]}<select value={a.advisoryService ?? ''} onChange={e => answer('advisoryService',e.target.value)}><option value="">{es ? 'No especificado' : 'Not specified'}</option><option value="Yes">{es ? 'Sí' : 'Yes'}</option><option value="No">No</option><option value="Not sure">{es ? 'No sé' : 'Not sure'}</option></select></label>{service ? <ConfirmedWording draft={{ ...draft, issue: 'service' }} section="report" prefix="service" es={es} edit={edit} /> : null}</> : null}
    {(service || draft.issue === 'quality') && Object.values(draft.wording?.report ?? {}).some(Boolean) ? <div className="request-question-grid request-frequency-grid"><label>{QUESTIONS.frequency[es ? 1 : 0]}<select value={a.frequency ?? ''} onChange={e => answer('frequency',e.target.value)}><option value="">{es ? 'No especificado' : 'Not specified'}</option>{[['Constant','Constante'],['Occasional','Ocasional'],['At particular times','A ciertas horas']].map(([en,sp]) => <option key={en} value={en}>{es ? sp : en}</option>)}</select></label></div> : null}
    </> : null}
    {section === 'contact' && draft.issue === 'billing' ? <div className="request-question-grid">{field('chargeKind')}{field('billingPeriod')}</div> : null}
    {showContact && section !== 'details' ? <details className="request-contact"><summary>{es ? 'Contacto previo con el proveedor (opcional)' : 'Prior provider contact (optional)'}</summary><label>{QUESTIONS.contacted[es ? 1 : 0]}<select value={a.contacted ?? ''} onChange={e => answer('contacted',e.target.value)}><option value="">{es ? 'No especificado' : 'Not specified'}</option><option value="No">No</option><option value="Yes">{es ? 'Sí' : 'Yes'}</option><option value="Prefer not to say">{es ? 'Prefiero no decirlo' : 'Prefer not to say'}</option></select></label>{a.contacted === 'Yes' ? <div className="request-question-grid">{field('contactDate')}{field('contactMethod')}{field('contactResponse', true)}</div> : null}</details> : null}
  </div>
}
