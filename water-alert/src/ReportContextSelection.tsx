import type { Language, Place } from './domain'
import { isReportFactId, type HelpFact } from './help-requests'
import { requiredReportEvidence } from './recovery-evidence'
import { helpReports } from './help-report-facts'
import { reportSourceNote } from './help-report-source'

/** Document context is selected independently of the resident's experience. */
export function ReportContextSelection({ place, facts, sample, language, changeFacts }: { place: Place; facts: HelpFact[]; sample: boolean; language: Language; changeFacts: (facts: HelpFact[]) => void }) {
  const es = language === 'es'
  const required = new Set(requiredReportEvidence(place, sample).map(row => row.key))
  const reports = sample ? [] : facts.filter(f => f.kind === 'historical' && isReportFactId(f.id))
  if (sample || place.kind !== 'system') return null
  const available = helpReports(place, sample)
  return <details className="request-report-selection">
    <summary>{es ? 'Añadir o revisar hallazgos del informe' : 'Add or review report findings'}</summary>
    <p className="quiet-note">{es ? 'Información histórica; no demuestra una conexión con tu inquietud ni el estado actual.' : 'Historical information; it does not establish a connection to your concern or current status.'}</p>
    {!reports.length ? <p className="quiet-note">{es ? 'No hay hallazgos disponibles para incluir. Esto no confirma la seguridad actual; puedes describir tu inquietud.' : 'No findings are available to include. This does not confirm current safety; you can still describe your concern.'} {available.map(r => r.state !== 'unavailable' ? <a key={r.year} href={r.url} target="_blank" rel="noreferrer">{es ? 'Ver informe original' : 'View original report'} ({r.year})</a> : null)}</p> : null}
    {reports.map(f => <div key={f.id} className="request-report-finding">
      {required.has(f.id) ? <strong>{es ? 'Incluido automáticamente: el informe no enumera una acción correctiva.' : 'Automatically included: the report lists no corrective action.'}</strong> : <div className={`request-wording-choice${f.included ? ' is-selected' : ''}`}><label className="checkbox-row"><input type="checkbox" checked={f.included} onChange={e => changeFacts(facts.map(item => item.id === f.id ? { ...item, included: e.target.checked } : item))} /><span>{es ? 'Incluir este hallazgo' : 'Include this finding'}: {f.record?.problem ?? f.id}</span></label></div>}
      <p className="quiet-note">{f.text}</p>
      {f.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label || (es ? 'Ver fuente' : 'View source')}</a>)}
      {reportSourceNote(f.record?.sourceMethod, language) ? <p className="quiet-note">{reportSourceNote(f.record?.sourceMethod, language)}</p> : null}
    </div>)}
  </details>
}
