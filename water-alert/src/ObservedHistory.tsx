import { useState } from 'react'
import type { Language, Notice } from './domain'
import { AgencyLiftRow, DateRow, Panel, SourceLink } from './components'
import { AdeqGuidance } from './AdeqGuidance'
import type { Strings } from './strings'
import { noticeMatchesPlace } from './place-catalog'

export function ObservedHistory({ archive, watches, coverageStart, t, language }: { archive: Notice[]; watches: string[]; coverageStart: string | null; t: Strings; language: Language }) {
  const [all, setAll] = useState(false)
  const [limit, setLimit] = useState(10)
  // Ordering uses app-owned observations, never an assumed timezone for agency dates.
  const observedAt = (n: Notice) => {
    const at = Date.parse(n.lastObservedAt ?? n.firstObservedAt ?? '')
    return Number.isFinite(at) ? at : 0
  }
  const records = archive.filter(n => all || watches.some(id => noticeMatchesPlace(id, n))).sort((a, b) => observedAt(b) - observedAt(a))
  return <><div className="page-heading"><div><h1>{t.historyTitle}</h1><p>{t.historyText}</p></div></div>
    <dl className="coverage-date"><DateRow label={t.since} value={coverageStart} app language={language} /></dl>
    <div className="filters history-filter"><button aria-pressed={!all} onClick={() => { setAll(false); setLimit(10) }}>{t.myPlaces}</button><button aria-pressed={all} onClick={() => { setAll(true); setLimit(10) }}>{t.allObserved}</button></div>
    <p>{records.length} {t.advisories}</p>
    {!records.length ? <Panel><p>{t.noHistory}</p></Panel> : <div className="history-grid">{records.slice(0, limit).map(n => <Panel key={n.id} className="history-record"><h2>{n.name}</h2><p>{n.county}</p><div className="history-event"><span className={`event-dot ${n.kind}`} aria-hidden="true" /><dl>{n.issued ? <DateRow label={t.issued} value={n.issued} /> : <div className="date-row"><dt>{t.issued}</dt><dd>{t.unknown}</dd></div>}</dl></div>
      <dl><div className="date-row"><dt>{t.affected}</dt><dd>{n.area || t.unknown}</dd></div></dl>
      {n.agency === 'ADEQ' && n.liftStatus === 'unknown' ? <dl><AgencyLiftRow notice={n} t={t} /></dl> : n.lifted ? <dl><DateRow label={t.explicitLift} value={n.lifted} /></dl> : <p>{t.historyPrevious}</p>}
      <details><summary>{t.observationDetails}<span className="disclosure-icon" aria-hidden="true" /></summary><dl><DateRow label={t.firstObserved} value={n.firstObservedAt} app language={language} /><DateRow label={t.lastObserved} value={n.lastObservedAt} app language={language} /><DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /></dl><p>{t.observationMeaning}</p></details>
      {n.liftStatus === 'unknown' ? <p className="info">{t.unknownLift}</p> : null}<p className="quiet-note">{t.source}: {n.agency}</p><SourceLink url={n.url}>{t.sourceLink}</SourceLink>
      {n.agency === 'ADEQ' ? <AdeqGuidance t={t} /> : null}
    </Panel>)}</div>}
    {records.length > limit ? <button className="secondary full" onClick={() => setLimit(n => n + 10)}>{t.moreRecords} <span aria-hidden="true">⌄</span></button> : null}
  </>
}
