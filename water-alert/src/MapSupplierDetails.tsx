import { DateRow, SourceLink } from './components'
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
  const isCurrent = (n: Notice) => current.has(n.id) && status.state !== 'unavailable'
  const latest = records[0]
  return <article className="map-detail-content">
    <h2>{place.name}</h2><p className="map-detail-county">{place.county} · ADH</p>
    <p className={`map-detail-status ${state}`}><span className={`map-status-dot ${state}`} aria-hidden="true" />{label}</p>
    {status.state === 'unavailable' ? <p>{t.unavailableText}</p> : status.state === 'none' ? <p>{t.noneText}</p> : null}
    <dl>{source?.lastSuccessAt ? <DateRow label={t.successfulCheck} value={source.lastSuccessAt} app language={language} /> : <div className="date-row"><dt>{t.successfulCheck}</dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
    <SourceLink url={SOURCES.ADH}>{t.officialSource}</SourceLink>
    {latest ? <section className="map-advisory-summary">
      <div className="map-summary-heading">
        <h3>{isCurrent(latest) ? m.mapCurrentRecord : m.mapObservedRecord}</h3>
        {!isCurrent(latest) ? <span className={`map-record-state ${latest.lifted ? 'lifted' : 'unconfirmed'}`}>{latest.lifted ? t.supplierAlertLifted : t.historyPrevious}</span> : null}
      </div>
      <table className="map-fact-table">
        <tbody>
          <tr><th scope="row">{t.affected}</th><td lang="en">{latest.area || t.unknown}</td></tr>
          <tr><th scope="row">{t.reason}</th><td lang={latest.reason ? 'en' : undefined}>{latest.reason || t.unknown}</td></tr>
          <tr><th scope="row">{t.issued}</th><td>{latest.issued || t.unknown}</td></tr>
          <tr><th scope="row">{t.agencyLifted}</th><td>{latest.lifted || t.unknown}</td></tr>
        </tbody>
      </table>
    </section> : null}
    {records.length ? <details className="map-observation-history">
      <summary>{m.mapObservationHistory} · {records.length} {records.length === 1 ? m.mapRecord : m.mapRecords}<span className="disclosure-icon" aria-hidden="true" /></summary>
      {records.map((n, index) => <section className="map-detail-record" key={n.id}>
        <div className="map-record-heading">
          <h4>{m.mapObservation} {index + 1}</h4>
          <span className={`map-record-state ${isCurrent(n) ? 'current' : n.lifted ? 'lifted' : 'unconfirmed'}`}>{isCurrent(n) ? t.supplierCardActive : n.lifted ? t.supplierAlertLifted : t.historyPrevious}</span>
        </div>
        <table className="map-fact-table">
          <tbody>
            <tr><th scope="row">{t.affected}</th><td lang="en">{n.area || t.unknown}</td></tr>
            <tr><th scope="row">{t.reason}</th><td lang={n.reason ? 'en' : undefined}>{n.reason || t.unknown}</td></tr>
            <tr><th scope="row">{t.issued}</th><td>{n.issued || t.unknown}</td></tr>
            <tr><th scope="row">{t.agencyLifted}</th><td>{n.lifted || t.unknown}</td></tr>
          </tbody>
        </table>
        <dl><DateRow label={t.firstObserved} value={n.firstObservedAt} app language={language} /><DateRow label={t.lastObserved} value={n.lastObservedAt} app language={language} />{n.sourceUpdatedAt ? <DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /> : null}</dl>
        {n.liftStatus === 'unknown' ? <p>{t.unknownLift}</p> : null}
        {n.guidance ? <blockquote lang="en">{n.guidance.quote}<SourceLink url={n.guidance.url}>{t.sourceLink}</SourceLink></blockquote> : null}
        <SourceLink url={n.url}>{t.sourceLink} (ADH)</SourceLink>
      </section>)}
      <p className="quiet-note">{t.observationMeaning}</p>
    </details> : <p>{t.noHistory}</p>}
    <p className="quiet-note">{m.mapNoSafety}</p>
  </article>
}
