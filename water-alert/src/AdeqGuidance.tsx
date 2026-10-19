import { ADEQ_GUIDANCE as g } from './adeq-guidance'
import { SourceLink } from './components'
import type { Strings } from './strings'

export function AdeqGuidance({ t }: { t: Strings }) {
  return <section className="adeq-guidance">
    <h3>{t.guidance}</h3><p className="quiet-note">{t.guidanceVerbatim}</p>
    <blockquote lang="en">{g.absence}</blockquote>
    <details><summary>{t.guidanceMore}<span className="disclosure-icon" aria-hidden="true" /></summary>
      <blockquote lang="en">{g.suspected}</blockquote>
      <blockquote lang="en">{g.contact}</blockquote>
      <blockquote lang="en"><p>{g.medical}</p><ul>{g.symptoms.map(symptom => <li key={symptom}>{symptom}</li>)}</ul></blockquote>
      <div className="guidance-contacts"><p><b>{t.bloomContact}</b><br /><a href="tel:+15016820744">{g.bloom.phone}</a><br /><SourceLink url={g.bloom.form}>{t.bloomForm}</SourceLink></p>
        <p><b>{t.illnessContact}</b><br /><a href="tel:+15012804168">{g.illness.phone}</a><br /><a href={`mailto:${g.illness.email}`}>{g.illness.email}</a></p></div>
    </details>
    <SourceLink url={g.url}>{t.guidanceSource}</SourceLink>
    <p className="quiet-note">{t.guidanceVerified}: <time dateTime={g.verifiedAt}>{g.verifiedAt}</time></p>
  </section>
}
