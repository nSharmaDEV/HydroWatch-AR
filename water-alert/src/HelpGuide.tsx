import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { Language, Notice, Place } from './domain'
import { SourceLink } from './components'
import { ProviderContact } from './ProviderContact'
import { RecoveryActions } from './RecoveryActions'
import { ADH_ENGINEERING_SOURCE, RECOVERY_RESOURCES as links } from './recovery-resources'
import { helpGuideStrings } from './help-guide-strings'
import { ActiveHelpGuide } from './ActiveHelpGuide'
import { HelpWorkspace, HelpSessionNote, workspaceStrings } from './HelpWorkspace'
import { HelpEvidence } from './HelpEvidence'
import { reportAppendix } from './recovery-evidence'

export { ADH_ENGINEERING_SOURCE } from './recovery-resources'
type Issue = 'service' | 'quality' | 'billing' | 'legal'

export function HelpGuide(props: { place: Place; notice?: Notice; language: Language; sample: boolean; onBack: () => void; active?: boolean }) {
  return props.active && props.place.kind === 'system' ? <ActiveHelpGuide {...props} /> : <StandardHelpGuide {...props} />
}

function StandardHelpGuide({ place, notice, language, sample, onBack }: { place: Place; notice?: Notice; language: Language; sample: boolean; onBack: () => void }) {
  const [step, setStep] = useState(1)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const heading = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const t = helpGuideStrings[language]
  const w = workspaceStrings[language]
  useLayoutEffect(() => { heading.current?.focus(); window.scrollTo?.(0, 0) }, [step])
  return <div className="help-guide">
    <button className="back" aria-label={t.back} onClick={onBack}>‹ {t.back}</button>
    <section className="panel guide-step" aria-labelledby={headingId}>
    <header className="guide-step-heading">
      <p className="guide-context">{place.name}{sample ? language === 'en' ? ' · SAMPLE' : ' · EJEMPLO' : ''}</p>
      <p className="guide-progress">{t.step(step)}</p>
      <h1 id={headingId} ref={heading} tabIndex={-1}>{t.titles[step - 1]}</h1>
    </header>
    <HelpWorkspace language={language} directions={<>
      {step === 1 ? <><p>{w.choose}</p><p className="info">{t.emergency}</p></> : null}
      {step === 2 ? <p>{issue === 'service' ? t.serviceHelp : issue === 'quality' ? t.qualityHelp : issue === 'billing' ? t.billingHelp : t.legalHelp}</p> : null}
      {step === 3 ? <><h3>{t.checklist}</h3><ul>{t.items.map(item => <li key={item}>{item}</li>)}</ul><p className="quiet-note">{t.sensitive}</p></> : null}
      {step === 4 ? <><p>{t.save}</p><p className="info">{t.external}</p>{issue === 'billing' ? <><p>{t.privacy}</p><SourceLink url={links.complaint}>{t.form}</SourceLink><details><summary>{language === 'en' ? 'Paper forms' : 'Formularios impresos'}</summary><SourceLink url={links.englishForm}>{t.pdfEn}</SourceLink><SourceLink url={links.spanishForm}>{t.pdfEs}</SourceLink></details></> : <p>{issue === 'legal' ? t.legalHelp : t.operational}</p>}{issue === 'legal' ? <SourceLink url={links.intake}>{t.intake}</SourceLink> : null}</> : null}
      {step === 5 ? <><p>{t.confirmation}</p><p>{t.followup}</p></> : null}
    </>}>
    {step === 1 ? <div className="guide-choices">{(['service', 'quality', 'billing', 'legal'] as const).map(key => <button key={key} className="secondary" aria-pressed={issue === key} onClick={() => setIssue(key)}>{t[key]}</button>)}</div> : null}
    {step === 2 ? <>
      {issue === 'service' || issue === 'billing' ? <ProviderContact place={place} language={language} sample={sample} /> : null}
      {issue === 'quality' ? <>{sample ? <p>{language === 'en' ? 'Sample only: no real contact action.' : 'Solo ejemplo: sin acción de contacto real.'}</p> : <a className="secondary" href="tel:+15016612623">{t.adh}</a>}<p><SourceLink url={ADH_ENGINEERING_SOURCE}>{t.adhSource}</SourceLink></p></> : null}
      {issue === 'legal' ? <><SourceLink url={links.legalHelp}>{t.legalLink}</SourceLink><SourceLink url={links.intake}>{t.intake}</SourceLink></> : null}
      <p className="quiet-note">{t.checked}</p>
    </> : null}
    {/* Keep one editor mounted: step navigation and per-template edits share the existing engine. */}
     {issue ? <div hidden={step !== 3 && step !== 4}><RecoveryActions key={issue} place={place} notice={notice} language={language} sample={sample} initialKind={issue === 'billing' ? 'complaint' : issue === 'quality' ? 'service' : issue} appendix={reportAppendix(place, sample, selected)} guided><HelpEvidence place={place} language={language} sample={sample} selected={selected} onChange={setSelected} /></RecoveryActions></div> : null}
    {step === 5 ? <><h2>{w.confirmation}</h2><ul>{w.confirmationItems.map(item => <li key={item}>{item}</li>)}</ul><div className="guide-handoff"><SourceLink url={links.legalHelp}>{t.legalLink}</SourceLink><SourceLink url={links.intake}>{t.intake}</SourceLink><SourceLink url={links.court}>{t.court}</SourceLink></div></> : null}
    </HelpWorkspace>
    <HelpSessionNote language={language} />
    <div className="guide-navigation">{step > 1 ? <button className="secondary" onClick={() => setStep(s => s - 1)}>{t.previous}</button> : null}{step < 5 ? <button className="primary" disabled={!issue} onClick={() => setStep(s => s + 1)}>{t.next}</button> : <button className="primary" onClick={onBack}>{t.done}</button>}</div>
    </section>
  </div>
}
