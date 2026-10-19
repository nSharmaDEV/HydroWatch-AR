import { useLayoutEffect, useRef, useState } from 'react'
import type { Language, Notice, Place } from './domain'
import { Panel, SourceLink } from './components'
import { ProviderContact } from './ProviderContact'
import { RecoveryActions } from './RecoveryActions'
import { RECOVERY_RESOURCES as links } from './recovery-resources'
import { helpGuideStrings } from './help-guide-strings'

export const ADH_ENGINEERING_SOURCE = 'https://healthy.arkansas.gov/programs-services/licensing-military-member-licensure-permits-plan-reviews/drinking-water-plan-review'
type Issue = 'service' | 'quality' | 'billing' | 'legal'

export function HelpGuide({ place, notice, language, sample, onBack }: { place: Place; notice?: Notice; language: Language; sample: boolean; onBack: () => void }) {
  const [step, setStep] = useState(1)
  const [issue, setIssue] = useState<Issue | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const t = helpGuideStrings[language]
  useLayoutEffect(() => { heading.current?.focus(); window.scrollTo?.(0, 0) }, [step])
  return <div className="help-guide">
    <button className="back" aria-label={t.back} onClick={onBack}>‹ {t.back}</button>
    <p className="guide-context">{place.name}{sample ? language === 'en' ? ' · SAMPLE' : ' · EJEMPLO' : ''}</p>
    <p className="guide-progress">{t.step(step)}</p>
    <h1 ref={heading} tabIndex={-1}>{t.titles[step - 1]}</h1>
    {step === 1 ? <><p className="info">{t.emergency}</p><div className="guide-choices">{(['service', 'quality', 'billing', 'legal'] as const).map(key => <button key={key} className="secondary" aria-pressed={issue === key} onClick={() => setIssue(key)}>{t[key]}</button>)}</div></> : null}
    {step === 2 ? <Panel>
      <p>{issue === 'service' ? t.serviceHelp : issue === 'quality' ? t.qualityHelp : issue === 'billing' ? t.billingHelp : t.legalHelp}</p>
      {issue === 'service' || issue === 'billing' ? <ProviderContact place={place} language={language} sample={sample} /> : null}
      {issue === 'quality' ? <>{sample ? <p>{language === 'en' ? 'Sample only: no real contact action.' : 'Solo ejemplo: sin acción de contacto real.'}</p> : <a className="secondary" href="tel:+15016612623">{t.adh}</a>}<p><SourceLink url={ADH_ENGINEERING_SOURCE}>{t.adhSource}</SourceLink></p></> : null}
      {issue === 'legal' ? <><SourceLink url={links.legalHelp}>{t.legalLink}</SourceLink><SourceLink url={links.intake}>{t.intake}</SourceLink></> : null}
      <p className="quiet-note">{t.checked}</p>
    </Panel> : null}
    {step === 3 ? <><h2>{t.checklist}</h2><ul>{t.items.map(item => <li key={item}>{item}</li>)}</ul><p>{t.sensitive}</p></> : null}
    {step === 4 ? <><p>{t.save}</p><p className="info">{t.external}</p>{issue === 'billing' ? <><p>{t.privacy}</p><div className="guide-handoff"><SourceLink url={links.complaint}>{t.form}</SourceLink><SourceLink url={links.englishForm}>{t.pdfEn}</SourceLink><SourceLink url={links.spanishForm}>{t.pdfEs}</SourceLink></div></> : <p>{issue === 'legal' ? t.legalHelp : t.operational}</p>}{issue === 'legal' ? <SourceLink url={links.intake}>{t.intake}</SourceLink> : null}<p className="quiet-note">{t.checked}</p></> : null}
    {/* Keep one editor mounted: step navigation and per-template edits share the existing engine. */}
    {issue ? <div hidden={step !== 3 && step !== 4}><RecoveryActions key={issue} place={place} notice={notice} language={language} sample={sample} initialKind={issue === 'billing' ? 'complaint' : issue === 'quality' ? 'service' : issue} guided /></div> : null}
    {step === 5 ? <Panel><p>{t.confirmation}</p><p>{t.followup}</p><SourceLink url={links.legalHelp}>{t.legalLink}</SourceLink><SourceLink url={links.intake}>{t.intake}</SourceLink><SourceLink url={links.court}>{t.court}</SourceLink></Panel> : null}
    {step >= 3 ? <p className="quiet-note guide-loss">{t.loss}</p> : null}
    <div className="guide-navigation">{step > 1 ? <button className="secondary" onClick={() => setStep(s => s - 1)}>{t.previous}</button> : null}{step < 5 ? <button className="primary" disabled={!issue} onClick={() => setStep(s => s + 1)}>{t.next}</button> : <button className="primary" onClick={onBack}>{t.done}</button>}</div>
  </div>
}
