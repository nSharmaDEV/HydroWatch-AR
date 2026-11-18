import { useId, useRef, useState, type ReactNode } from 'react'
import { DateRow, SourceLink } from './components'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { Icon } from './icons'
import { noticeMatchesPlace } from './place-catalog'
import type { Strings } from './strings'
import { mapEn, mapEs } from './map-strings'
import { unavailableReason } from './source-checks'
import { alertFact } from './SupplierAlertHistory'
import { supplierCounty, supplierName } from './supplier-display'
import { SUPPLIER_LOCATIONS } from './supplier-locations'

/** Map-selected supplier, built from the same heading, finding box and notice record as Places. */
export function MapSupplierDetails({ place, archive, source, now, t, language, label, state }: {
  place: Place; archive: Notice[]; source?: SourceSnapshot; now: number; t: Strings; language: Language; label: string; state: string
}) {
  const m = language === 'es' ? mapEs : mapEn
  const es = language === 'es'
  const status = statusFor(place.id, source, now)
  const current = new Set(status.records.map(n => n.id))
  const records = [...new Map([...archive, ...status.records].filter(n => n.agency === 'ADH' && n.kind === 'boil' && noticeMatchesPlace(place.id, n)).map(n => [n.id, n])).values()]
    .sort((a, b) => Number(current.has(b.id)) - Number(current.has(a.id)) || (Date.parse(b.lastObservedAt ?? b.firstObservedAt ?? '') || 0) - (Date.parse(a.lastObservedAt ?? a.firstObservedAt ?? '') || 0))
  const isCurrent = (n: Notice) => current.has(n.id) && status.state !== 'unavailable'
  const latest = records[0]
  const point = SUPPLIER_LOCATIONS.find(p => p.placeId === place.id)
  const [infoOpen, setInfoOpen] = useState(false)
  const infoId = useId()
  const infoButton = useRef<HTMLButtonElement>(null)
  const pointLabels = { 'historical-polygon-centroid': m.mapCentroid, 'provider-office': m.mapOffice, 'provider-site': m.mapSite, 'recreation-site': m.mapRecreation }
  const reason = unavailableReason(source, now)
  const explanation = status.state === 'none' ? t.noNoticeExplanation
    : status.state === 'unavailable' ? { never: t.uncheckedExplanation, offline: t.checkOffline, stale: t.checkStale, format: t.checkFormatFailed, failed: t.checkRetrievalFailed, unconfirmed: t.checkUnconfirmed }[reason] ?? t.checkUnconfirmed
    : null
  const tone = status.state === 'active' ? 'boil' : status.state
  const notProvided = es ? 'No proporcionado por ADH' : 'Not provided by ADH'
  const closeInfo = () => { setInfoOpen(false); infoButton.current?.focus() }
  // Disappearance is not a lift: only agency lift text without an unknown lift status counts as lifted.
  const notice = (n: Notice, heading: 'h3' | 'h4', extra?: ReactNode) => {
    const lifted = !!n.lifted?.trim() && n.liftStatus !== 'unknown'
    const active = isCurrent(n) && !n.lifted
    const Heading = heading
    return <article className={`supplier-alert-notice map-notice ${lifted ? 'lifted' : active ? 'active' : 'unconfirmed'}`} key={n.id}>
      <div className="alert-notice-heading"><Heading>{es ? 'Aviso de hervir el agua' : 'Boil-water notice'}</Heading><span className="profile-leader" aria-hidden="true" /></div>
      <dl className="alert-summary-facts">{alertFact(t.issued, n.issued, notProvided, true)}{alertFact(t.agencyLifted, lifted ? n.lifted : null, notProvided, true)}{alertFact(t.supplierAlertArea, n.area, notProvided)}{alertFact(t.supplierAlertReason, n.reason, notProvided)}</dl>
      {extra}
      <p className="alert-status">{es ? 'Estado: ' : 'Status: '}{lifted ? t.supplierAlertLifted : active ? t.active : es ? 'Sin confirmar' : 'Unconfirmed'}</p>
    </article>
  }
  return <article className={`map-detail-content ${tone}`} onKeyDown={event => { if (event.key === 'Escape' && infoOpen) { event.stopPropagation(); event.preventDefault(); closeInfo() } }}>
    <div className="supplier-heading">
      <div className="supplier-title-row"><h2>{supplierName(place.name)}</h2>
        {point ? <button ref={infoButton} type="button" className="supplier-info-button" aria-label={m.aboutPoint} title={m.aboutPoint} aria-expanded={infoOpen} aria-controls={infoId} onClick={() => setInfoOpen(!infoOpen)}><Icon name="info" size={24} /></button> : null}
      </div>
      <p>{es ? `${t.supplierCounty} de ${supplierCounty(place.county)}` : `${supplierCounty(place.county)} ${t.supplierCounty}`} · Arkansas Department of Health</p>
    </div>
    {point && infoOpen ? <div className="map-point-info-panel" id={infoId} role="group" aria-label={m.aboutPoint}>
      <div className="map-point-info-heading"><h3>{m.aboutPoint}</h3><button type="button" className="map-point-info-close" aria-label={m.closePoint} onClick={closeInfo}><Icon name="x" size={20} /></button></div>
      <p>{pointLabels[point.pointMeaning]}</p><p>{m.mapVerified}: {point.verifiedAt}</p><p>{m.pointLimit}</p>
      <SourceLink url={point.sourceUrl}>{m.pointSourceLink}</SourceLink>
    </div> : null}
    <div className="supplier-finding map-finding"><div className="finding-copy">
      <p className={`status-label map-detail-status ${state}`}><span className={`map-status-dot ${state}`} aria-hidden="true" />{label}</p>
      {explanation ? <p className="status-explanation">{explanation}</p> : null}
      <dl className="map-finding-check">{source?.lastSuccessAt ? <DateRow label={t.successfulCheck} value={source.lastSuccessAt} app language={language} zoneId={false} /> : <div className="date-row"><dt>{t.successfulCheck}</dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
    </div></div>
    <div className="card-check-actions map-check-actions"><a className="official-source-action official-list" href={SOURCES.ADH} target="_blank" rel="noreferrer">{t.officialSource} <Icon name="external-link" size={16} /></a></div>
    {status.state === 'unavailable' && records.length ? <p className="historical-note">{t.unverified}</p> : null}
    {latest ? notice(latest, 'h3') : <p className="map-no-history">{t.noHistory}</p>}
    {records.length ? <details className="map-observation-history">
      <summary>{m.mapObservationHistory} · {records.length} {records.length === 1 ? m.mapRecord : m.mapRecords}<span className="disclosure-icon" aria-hidden="true" /></summary>
      {records.map((n, index) => <section className="map-detail-record" key={n.id} aria-label={`${m.mapObservation} ${index + 1}`}>
        {notice(n, 'h4', <>
          <dl className="map-record-dates"><DateRow label={t.firstObserved} value={n.firstObservedAt} app language={language} zoneId={false} /><DateRow label={t.lastObserved} value={n.lastObservedAt} app language={language} zoneId={false} />{n.sourceUpdatedAt ? <DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /> : null}</dl>
          {n.liftStatus === 'unknown' ? <p className="quiet-note">{t.unknownLift}</p> : null}
          {n.guidance ? <blockquote lang="en">{n.guidance.quote}<SourceLink url={n.guidance.url}>{t.sourceLink}</SourceLink></blockquote> : null}
          <SourceLink url={n.url}>{t.sourceLink} (ADH)</SourceLink>
        </>)}
      </section>)}
      <p className="quiet-note">{t.observationMeaning}</p>
    </details> : null}
    <div className="map-detail-notes">
      <p className="quiet-note">{point ? <>{pointLabels[point.pointMeaning]}. <SourceLink url={point.sourceUrl}>{m.pointSourceLink}</SourceLink></> : m.locationUnavailable}</p>
      <p className="quiet-note">{m.mapNoSafety}</p>
    </div>
  </article>
}
