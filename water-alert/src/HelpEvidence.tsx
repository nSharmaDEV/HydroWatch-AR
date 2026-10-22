import type { Language, Place } from './domain'
import { SourceLink } from './components'
import { AnnualWaterReport } from './AnnualWaterReport'
import { ANNUAL_REPORTS } from './annual-reports'
import { reportEvidence } from './recovery-evidence'
import { activeHelpStrings } from './active-help-strings'

/** Shared exact-supplier, opt-in historical context for both help guides. */
export function HelpEvidence({ place, language, sample, selected, onChange }: { place: Place; language: Language; sample: boolean; selected: readonly string[]; onChange: (keys: string[]) => void }) {
  const t = activeHelpStrings[language], findings = reportEvidence(place, sample)
  const reports = !sample && Object.hasOwn(ANNUAL_REPORTS, place.id) ? ANNUAL_REPORTS[place.id] : []
  return <details className="help-evidence"><summary>{t.evidence}{selected.length ? ` (${selected.length})` : ''}<span className="disclosure-icon" aria-hidden="true" /></summary>
    <p>{t.evidenceLimits}</p>
    {findings.length ? findings.map(({ key, issue, report }) => <div key={key} className="help-evidence-row">
      <label className="checkbox-row"><input type="checkbox" checked={selected.includes(key)} onChange={e => onChange(e.target.checked ? [...selected, key] : selected.filter(value => value !== key))} /><span>{report.year} · {t.page} {issue.page}: <span lang="en">{issue.title.en}</span></span></label>
      <SourceLink url={`${report.url}#page=${issue.page}`}>{t.report}</SourceLink><p className="quiet-note">{t.reviewed}: {report.reviewedOn}</p>
    </div>) : <p>{sample ? t.sampleEvidence : t.noEvidence}</p>}
    {!sample ? <AnnualWaterReport reports={reports} language={language} /> : null}
  </details>
}
