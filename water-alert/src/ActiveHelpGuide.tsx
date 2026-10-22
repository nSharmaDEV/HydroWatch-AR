import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { Language, Notice, Place } from './domain'
import type { DraftKind } from './recovery-drafts'
import { SourceLink } from './components'
import { ProviderContact } from './ProviderContact'
import { RecoveryActions } from './RecoveryActions'
import { BoilWaterGuidance } from './BoilWaterGuidance'
import { HelpEvidence } from './HelpEvidence'
import { HelpWorkspace, HelpSessionNote, workspaceStrings } from './HelpWorkspace'
import { reportAppendix } from './recovery-evidence'
import { helpGuideStrings } from './help-guide-strings'
import { activeHelpStrings } from './active-help-strings'
import { ADH_ENGINEERING_SOURCE, RECOVERY_RESOURCES as links } from './recovery-resources'

type Issue = 'service' | 'quality' | 'billing' | 'legal'
type Destination = 'provider' | 'adh' | 'ag' | 'legal'
interface SendingRecord { date: string; destination: Destination; recipient: string; reference: string; follow: string }
function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

/** Resident-attested tasks only. No persistence, network submission or agency-status inference. */
export function ActiveHelpGuide({ place, notice, language, sample, onBack }: { place: Place; notice?: Notice; language: Language; sample: boolean; onBack: () => void }) {
  const t = activeHelpStrings[language], h = helpGuideStrings[language]
  const id = useId(), heading = useRef<HTMLHeadingElement>(null)
  const [step, setStep] = useState(0)
  const [issue, setIssue] = useState<Issue>('billing')
  const [kind, setKind] = useState<DraftKind>('request')
  const [contactDone, setContactDone] = useState(false)
  const [prepared, setPrepared] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [sentDate, setSentDate] = useState(''), [reference, setReference] = useState(''), [follow, setFollow] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [record, setRecord] = useState<SendingRecord | null>(null)
  const [summary, setSummary] = useState('')
  const [responses, setResponses] = useState<{ date: string; summary: string }[]>([])
  const [closed, setClosed] = useState(false)
  const [message, setMessage] = useState('')
  const completed = [contactDone, prepared, !!record, closed]
  const count = completed.filter(Boolean).length, next = completed.indexOf(false)
  const destination: Destination = kind === 'complaint' ? 'ag' : kind === 'legal' ? 'legal'
    : kind === 'followup' || kind === 'response' ? record?.destination ?? (issue === 'quality' ? 'adh' : issue === 'legal' ? 'legal' : 'provider')
    : kind === 'service' && issue === 'quality' ? 'adh' : 'provider'
  const recipient = t[destination]
  const appendix = reportAppendix(place, sample, selected)
  const w = workspaceStrings[language]
  useLayoutEffect(() => { heading.current?.focus(); window.scrollTo?.(0, 0) }, [step])
  function go(value: number) { setStep(value); setMessage('') }
  function chooseKind(value: DraftKind) { setKind(value); setPrepared(false); setContactDone(false); setConfirmed(false) }
  function chooseIssue(value: Issue) {
    setIssue(value)
    chooseKind(value === 'billing' ? 'request' : value === 'legal' ? 'legal' : 'service')
  }
  function saveSending() {
    if (!confirmed || !validDate(sentDate) || sentDate > today()) { setMessage(t.invalid); return }
    if (follow && (!validDate(follow) || follow < sentDate)) { setMessage(t.invalidFollow); return }
    setRecord({ date: sentDate, destination, recipient, reference: reference.trim(), follow })
    setResponses([]); setSummary(''); setClosed(false); setStep(3); setMessage(t.recorded)
  }
  function respond() {
    if (!record) { setMessage(t.needSent); return }
    if (!summary.trim()) { setMessage(t.responseNeeded); return }
    setResponses(previous => [...previous, { date: today(), summary: summary.trim() }])
    setSummary(''); setMessage(t.responseRecorded)
  }
  function close() {
    if (!record) { setMessage(t.needSent); return }
    setClosed(value => !value); setMessage(t.changed)
  }
  function deleteLog() {
    setRecord(null); setResponses([]); setSummary(''); setClosed(false); setSentDate(''); setReference(''); setFollow(''); setConfirmed(false); setMessage(t.deleted)
  }
  return <div className="help-guide active-help">
    <button className="back" aria-label={h.back} onClick={onBack}>‹ {h.back}</button>
    <section className="panel guide-step" aria-labelledby={`${id}-heading`}>
      <header className="guide-step-heading">
        <p className="guide-context">{place.name}{sample ? ` · ${t.sample}` : ''}</p>
        <p className="guide-progress">{t.step(step + 1)}</p>
        <h1 id={`${id}-heading`} ref={heading} tabIndex={-1}>{t.titles[step]}</h1>
      </header>
      <div className="help-task-progress">
        <p id={`${id}-count`} className="guide-progress" aria-live="polite">{t.count(count)}</p>
        <progress max={4} value={count} aria-labelledby={`${id}-count`} />
        <nav aria-label={t.nav} className="help-task-nav">{t.tasks.map((label, index) => <button key={label} className={`secondary${completed[index] ? ' task-done' : ''}`} aria-current={step === index ? 'step' : undefined} onClick={() => go(index)}><span aria-hidden="true">{completed[index] ? '✓' : step === index ? '●' : '○'} </span>{label}<small>{completed[index] ? t.done : step === index ? t.current : t.todo}</small></button>)}</nav>
        <p className="sr-only">{next < 0 ? t.allDone : `${t.next} ${t.tasks[next]}`}</p>
      </div>
      <HelpWorkspace language={language} directions={<>
        {step === 0 ? <><p>{issue === 'quality' ? h.qualityHelp : issue === 'legal' ? h.legalHelp : issue === 'billing' ? h.billingHelp : h.serviceHelp}</p><p>{language === 'en' ? 'Medical emergency? Call 911. This guide is not emergency assistance.' : '¿Emergencia médica? Llame al 911. Esta guía no es ayuda de emergencia.'}</p></> : null}
        {step === 1 ? <><ul aria-label={h.checklist}>{h.items.map(item => <li key={item}>{item}</li>)}</ul><p className="quiet-note">{language === 'en' ? 'Keep account numbers, IDs and medical information out of drafts.' : 'No incluya números de cuenta, identificaciones ni datos médicos.'}</p></> : null}
        {step === 2 ? <><p><strong>{t.recipient}: </strong>{recipient}</p><p>{language === 'en' ? 'Send through the recipient’s official channel. Then record the date and any reference number here.' : 'Envíe por el canal oficial del destinatario. Luego registre aquí la fecha y cualquier número de referencia.'}</p>
          {kind === 'followup' || kind === 'response' ? <p className="info">{t.replyChannel}</p> : null}
          {destination === 'ag' ? <><p>{h.privacy}</p><SourceLink url={links.complaint}>{h.form}</SourceLink></> : destination === 'legal' ? <SourceLink url={links.intake}>{h.intake}</SourceLink> : destination === 'adh' ? <SourceLink url={ADH_ENGINEERING_SOURCE}>{h.adhSource}</SourceLink> : null}
          <details><summary>{language === 'en' ? 'Sending checklist' : 'Lista para enviar'}</summary><p>{t.sending}</p><p>{h.save}</p><p>{h.external}</p>{destination === 'ag' ? <><SourceLink url={links.englishForm}>{h.pdfEn}</SourceLink><SourceLink url={links.spanishForm}>{h.pdfEs}</SourceLink></> : null}</details>
        </> : null}
        {step === 3 ? <><p>{t.followLimits}</p><SourceLink url={links.legalHelp}>{h.legalLink}</SourceLink></> : null}
        <div className="help-references">
        <details><summary>{t.guidelines}<span className="disclosure-icon" aria-hidden="true" /></summary><BoilWaterGuidance current language={language} /></details>
        <details><summary>{w.more}</summary><details><summary>{t.afterLift}</summary><p>{t.afterLiftText}</p></details><p>{h.emergency}</p><p>{h.sensitive}</p><p>{t.safety} {notice ? <SourceLink url={notice.url}>{t.official}</SourceLink> : null}</p><p>{t.limits}</p><p>{h.checked}</p>{step === 3 ? <><SourceLink url={links.intake}>{h.intake}</SourceLink><SourceLink url={links.court}>{h.court}</SourceLink></> : null}</details>
        </div>
        <p className="quiet-note">{language === 'en' ? 'Official water-use restrictions still apply.' : 'Siguen vigentes las restricciones oficiales de uso del agua.'}</p>
      </>}>
        <div hidden={step !== 0}>
          <div className="guide-choices">{(['service', 'quality', 'billing', 'legal'] as const).map(value => <button key={value} className="secondary" aria-pressed={issue === value} onClick={() => chooseIssue(value)}>{h[value]}</button>)}</div>
          {issue === 'service' || issue === 'billing' ? <ProviderContact place={place} language={language} sample={sample} /> : null}
          {issue === 'quality' ? <>{!sample ? <a className="secondary" href="tel:+15016612623">{h.adh}</a> : <p>{t.sample}</p>}<p><SourceLink url={ADH_ENGINEERING_SOURCE}>{h.adhSource}</SourceLink></p></> : null}
          {issue === 'legal' ? <div className="guide-handoff"><SourceLink url={links.legalHelp}>{h.legalLink}</SourceLink><SourceLink url={links.intake}>{h.intake}</SourceLink></div> : null}
          <p><strong>{t.recipient}: </strong>{recipient}</p>
          <button className="secondary" onClick={() => { setContactDone(value => !value); setMessage(t.changed) }}>{contactDone ? t.undo : t.recipientDone}</button>
        </div>
        {/* One mounted editor preserves per-template edits across all task/reference navigation. */}
        <div hidden={step !== 1 && step !== 2}>
          <details className={`help-draft-review${step === 1 ? ' is-editing' : ''}`} open={step === 1}>
          <summary>{w.draft}</summary>
          <RecoveryActions place={place} notice={notice} language={language} sample={sample} selectedKind={kind} onKindChange={chooseKind} appendix={appendix} onEdit={() => { setPrepared(false); setConfirmed(false) }} guided allowEmail={destination === 'provider'}>
          <HelpEvidence place={place} language={language} sample={sample} selected={selected} onChange={keys => { setSelected(keys); setPrepared(false); setConfirmed(false) }} />
          </RecoveryActions>
          </details>
        </div>
        {step === 1 ? <button className="secondary" onClick={() => { setPrepared(value => !value); setMessage(t.changed) }}>{prepared ? t.undo : t.ready}</button> : null}
        <div hidden={step !== 2}>
          <div className="help-record-form">
            {record ? <p className="info">{t.replace}</p> : null}
            <label htmlFor={`${id}-sent`}>{t.sent}</label><input id={`${id}-sent`} type="date" max={today()} value={sentDate} onChange={e => setSentDate(e.target.value)} />
            <label htmlFor={`${id}-reference`}>{t.reference}</label><input id={`${id}-reference`} maxLength={200} value={reference} onChange={e => setReference(e.target.value)} />
            <label htmlFor={`${id}-follow`}>{t.followDate}</label><input id={`${id}-follow`} type="date" min={sentDate || undefined} value={follow} onChange={e => setFollow(e.target.value)} />
            <label className="checkbox-row"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t.confirm}</label>
            <button className="primary" onClick={saveSending}>{t.record}</button>
          </div>
        </div>
        <div hidden={step !== 3}>
          {record ? <><p>{t.recorded}</p><dl><div><dt>{t.recipient}</dt><dd>{record.recipient}</dd></div><div><dt>{t.sent}</dt><dd><time dateTime={record.date}>{record.date}</time></dd></div>{record.reference ? <div><dt>{t.reference}</dt><dd>{record.reference}</dd></div> : null}{record.follow ? <div><dt>{t.followDate}</dt><dd><time dateTime={record.follow}>{record.follow}</time></dd></div> : null}</dl></> : <p>{t.notSent}</p>}
          <p>{closed ? t.closed : responses.length ? t.responseRecorded : t.waiting}</p>
          {record?.follow && record.follow < today() && !closed ? <p className="info">{t.due}</p> : null}
          {responses.length ? <ol className="help-responses">{responses.map((response, index) => <li key={index}><time dateTime={response.date}>{response.date}</time><p>{response.summary}</p></li>)}</ol> : null}
          <label htmlFor={`${id}-response`}>{t.response}</label><textarea id={`${id}-response`} rows={3} maxLength={2000} value={summary} onChange={e => setSummary(e.target.value)} />
          <div className="actions"><button className="secondary" onClick={respond}>{t.recordResponse}</button><button className="secondary" onClick={() => { chooseKind('followup'); go(1) }}>{t.followDraft}</button><button className="secondary" onClick={() => { chooseKind('response'); go(1) }}>{t.reply}</button><button className="secondary" onClick={close}>{closed ? t.reopen : t.close}</button><button className="danger" onClick={deleteLog}>{t.delete}</button></div>
        </div>
        <p role="status">{message}</p>
      </HelpWorkspace>
      <HelpSessionNote language={language}><p>{t.loss}</p><p>{t.questions}</p></HelpSessionNote>
      <div className="guide-navigation">{step > 0 ? <button className="secondary" onClick={() => go(step - 1)}>{h.previous}</button> : null}{step < 3 ? <button className="primary" onClick={() => go(step + 1)}>{h.next}</button> : <button className="primary" onClick={onBack}>{h.done}</button>}</div>
    </section>
  </div>
}
