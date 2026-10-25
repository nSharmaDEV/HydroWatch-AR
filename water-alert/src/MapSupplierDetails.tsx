import { AgencyLiftRow, DateRow, SourceLink } from './components'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { noticeMatchesPlace } from './place-catalog'
import type { Strings } from './strings'
import { mapEn, mapEs } from './map-strings'

/** The same current-status and published/observed facts as advisory details, without unrelated tools. */
export function MapSupplierDetails({ place, archive, source, now, t, language, label, state }: {
  place: Place; archive: Notice[]; source?: SourceSnapshot; now: number; t: Strings; language: Language; label: string; state: string
}) {
  const m = language === 'es' ? mapEs : mapEn
  const status = statusFor(place.id, source, now)
  const current = new Set(status.records.map(n => n.id))
  const records = [...new Map([...archive, ...status.records].filter(n => n.agency === 'ADH' && n.kind === 'boil' && noticeMatchesPlace(place.id, n)).map(n => [n.id, n])).values()]
    .sort((a, b) => Number(current.has(b.id)) - Number(current.has(a.id)) || (Date.parse(b.lastObservedAt ?? b.firstObservedAt ?? '') || 0) - (Date.parse(a.lastObservedAt ?? a.firstObservedAt ?? '') || 0))
  return <article className="map-detail-content">
    <h2>{place.name}</h2><p className="map-detail-county">{place.county} · ADH</p>
    <p className={`map-detail-status ${state}`}><span className={`map-status-dot ${state}`} aria-hidden="true" />{label}</p>
    {status.state === 'unavailable' ? <p>{t.unavailableText}</p> : status.state === 'none' ? <p>{t.noneText}</p> : null}
    <dl>{source?.lastSuccessAt ? <DateRow label={t.successfulCheck} value={source.lastSuccessAt} app language={language} /> : <div className="date-row"><dt>{t.successfulCheck}</dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
    <SourceLink url={SOURCES.ADH}>{t.officialSource}</SourceLink>
    {records.map(n => <section className="map-detail-record" key={n.id}>
      {!current.has(n.id) || status.state === 'unavailable' ? <p className="historical-note">{t.historyPrevious}</p> : null}
      <h3>{t.affected}</h3><p lang="en">{n.area || t.unknown}</p>
      <h3>{t.reason}</h3><p lang={n.reason ? 'en' : undefined}>{n.reason || t.unknown}</p>
      <dl>{n.issued ? <DateRow label={t.issued} value={n.issued} /> : <div className="date-row"><dt>{t.issued}</dt><dd>{t.unknown}</dd></div>}<AgencyLiftRow notice={n} t={t} /><DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /><DateRow label={t.firstObserved} value={n.firstObservedAt} app language={language} /><DateRow label={t.lastObserved} value={n.lastObservedAt} app language={language} /></dl>
      {n.liftStatus === 'unknown' ? <p>{t.unknownLift}</p> : null}
      {n.guidance ? <blockquote lang="en">{n.guidance.quote}<SourceLink url={n.guidance.url}>{t.sourceLink}</SourceLink></blockquote> : null}
      <SourceLink url={n.url}>{t.sourceLink} (ADH)</SourceLink>
    </section>)}
    {!records.length ? <p>{t.noHistory}</p> : null}
    <p className="quiet-note">{t.observationMeaning}</p><p className="quiet-note">{m.mapNoSafety}</p>
  </article>
}
