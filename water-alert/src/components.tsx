import { useId, useRef, type ReactNode } from 'react'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import type { Strings } from './strings'
import { catalogEntry } from './place-catalog'
import { SourceCheckHistory } from './SourceCheckHistory'
import { SupplierAlertHistory } from './SupplierAlertHistory'
import { unavailableReason } from './source-checks'
import { supplierArea, supplierCounty, supplierIssued } from './supplier-display'
import { ProviderContact } from './ProviderContact'

export function Icon({ name }: { name: 'home' | 'browse' | 'history' | 'settings' | 'water' | 'bell' | 'search' }) {
  const paths = { home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z', browse: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z', history: 'M3 12a9 9 0 1 0 3-7M3 3v6h6M12 7v5l3 2', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2', water: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM9 15c0 2 1 3 3 3', bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4', search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6' }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section> }
export function appTimestamp(value: string, language: Language = 'en', zoneId = true) {
  // Only app-owned instants with an explicit offset are localized. Agency text is never parsed.
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return value
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)) + (zoneId ? ' (America/Chicago)' : '')
}
export function DateRow({ label, value, app = false, language = 'en', zoneId = true }: { label: string; value?: string | null; unknown?: string; app?: boolean; language?: Language; zoneId?: boolean }) {
  if (!value) return null
  return <div className="date-row"><dt>{label}</dt><dd><time dateTime={app ? value : undefined}>{app ? appTimestamp(value, language, zoneId) : value}</time></dd></div>
}
export function SourceLink({ url, children }: { url: string; children: ReactNode }) { return <a className="source-link" href={url} target="_blank" rel="noreferrer">{children} <span aria-hidden="true">↗</span></a> }
export function AgencyLiftRow({ notice, t }: { notice: Notice; t: Strings }) {
  return notice.agency === 'ADEQ' && notice.liftStatus === 'unknown'
    ? <div className="date-row"><dt>{t.agencyLifted}</dt><dd>{t.unknownLiftDate}</dd></div>
    : <DateRow label={t.agencyLifted} value={notice.lifted} />
}
export function CatalogCoverage({ placeId, t }: { placeId: string; t: Strings }) {
  const entry = catalogEntry(placeId)
  if (!entry) return null
  return <div className="info"><p>{entry.place.kind === 'lake' ? t.catalogWaterbody : t.catalogSupplier}</p><SourceLink url={entry.url}>{t.catalogSource}</SourceLink></div>
}
export function StatusCard({ place, source, archive = [], now, t, language = 'en', sample = false, onView }: { place: Place; source?: SourceSnapshot; archive?: Notice[]; now: number; t: Strings; language?: Language; sample?: boolean; onView: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const infoButton = useRef<HTMLButtonElement>(null)
  const infoTitle = useId()
  const status = statusFor(place.id, source, now)
  const tone = status.state === 'active' ? place.kind === 'system' ? 'boil' : 'hab' : status.state
  const reason = unavailableReason(source, now)
  const explanation = reason === 'offline' ? t.checkOffline : reason === 'never' ? t.checkNever : reason === 'stale' ? t.checkStale : reason === 'format' ? t.checkFormatFailed : reason === 'failed' ? t.checkRetrievalFailed : t.checkUnconfirmed
  if (place.kind === 'system') return <article className={`status-card supplier-card ${tone}`}>
    <div className="supplier-heading"><div className="supplier-title-row"><h2>{place.name}</h2><span className="dot-leader" aria-hidden="true" /><button ref={infoButton} className="supplier-info-button" aria-label={t.supplierAbout} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7M12 6v2" /></svg></button></div><p>{language === 'en' ? `${supplierCounty(place.county)} ${t.supplierCounty}` : `${t.supplierCounty} de ${supplierCounty(place.county)}`} · Arkansas Department of Health</p>{sample ? <span className="sample-tag">{t.sample}</span> : null}</div>
    <div className="supplier-finding"><p className="status-label"><span aria-hidden="true" className="status-symbol">{status.state === 'active' ? '⚠' : status.state === 'none' ? '—' : '?'}</span>{status.state === 'active' ? t.boil : status.state === 'none' ? t.none : t.supplierUnavailable}</p>{status.state === 'active' ? <span className="supplier-status-badge">{t.supplierCardActive}</span> : null}</div>
    {status.state === 'unavailable' ? <p className="supplier-unavailable-note">{explanation}</p> : null}
    {status.records.map(n => <div className="supplier-notice-facts" key={n.id}>
      {status.state === 'unavailable' ? <p className="historical-note">{t.unverified}</p> : null}
      <dl>{[[t.supplierCardArea, supplierArea(n.area, place, language)], [t.supplierAlertReason, n.reason], [t.supplierCardIssued, supplierIssued(n.issued, language)]].map(([label, value]) => <div className="supplier-metadata" key={label}><dt>{label}</dt><dd>{value?.trim() || t.supplierAlertMissing}</dd></div>)}</dl>
    </div>
    )}
    <ProviderContact place={place} language={language} sample={sample} />
    <SupplierAlertHistory key={place.id} place={place} archive={archive} source={source} now={now} t={t} language={language} />
    <dialog ref={dialog} className="supplier-info" aria-labelledby={infoTitle} onClose={() => infoButton.current?.focus()} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); dialog.current?.close() } }}>
      <div className="supplier-popup-heading"><h2 id={infoTitle}>{t.supplierDetails}</h2><button className="secondary" onClick={() => dialog.current?.close()}>{t.supplierClose}</button></div>
      <h3>{place.name}</h3><p className="quiet-note">{supplierCounty(place.county)} · Arkansas Department of Health</p>
      {status.records.filter(n => supplierArea(n.area, place, language) !== n.area || supplierIssued(n.issued, language) !== n.issued).map(n => <section className="supplier-original" key={n.id}><h4>{t.supplierOriginal}</h4><dl><div><dt>{t.supplierAlertArea}</dt><dd>{n.area || t.supplierAlertMissing}</dd></div><div><dt>{t.issued}</dt><dd>{n.issued || t.supplierAlertMissing}</dd></div></dl></section>)}
      <CatalogCoverage placeId={place.id} t={t} /><p>{t.coverage}</p><p>{t.supplierSafety}</p>
      <p>{t.supplierInstructions}</p><SourceLink url={SOURCES.ADH}>{t.supplierAlertRead}</SourceLink>
      <div><button className="text-button" onClick={() => { dialog.current?.close(); onView() }}>{t.noticeDetails}</button></div>
      <dl><DateRow label={status.state === 'unavailable' ? t.supplierAttempted : t.supplierChecked} value={source?.retrievedAt} app language={language} zoneId={false} /></dl>{!source?.retrievedAt ? <p>{t.checkNoAttempt}</p> : null}
      <SourceCheckHistory key={`activity:${place.id}`} place={place} source={source} unavailable={status.state === 'unavailable'} t={t} language={language} compact explanation={status.state === 'unavailable' ? explanation : undefined} />
    </dialog>
  </article>
  return <article className={`status-card ${tone}`}>
    <div className="card-title"><div><h2>{place.name}</h2><p>{t.checkCounty}: {place.county}<br />{t.checkSource}: Arkansas Division of Environmental Quality</p></div>{sample ? <span className="sample-tag">{t.sample}</span> : null}</div>
    <p className="status-label"><span aria-hidden="true" className="status-symbol">{status.state === 'active' ? '!' : status.state === 'none' ? '—' : '?'}</span>{status.state === 'active' ? t.hab : status.state === 'none' ? t.none : t.unavailable}</p>
    {status.state === 'unavailable' ? <p>{explanation}</p> : null}
    <a className="secondary official-list" href="https://adeq.state.ar.us/water/planning/hab/default.aspx" target="_blank" rel="noreferrer">{t.checkOfficialADEQ}<span aria-hidden="true">↗</span></a>
    {status.state === 'none' ? <p>{t.noneText}</p> : null}
    {status.records.some(n => n.liftStatus === 'unknown') ? <p>{t.unknownLiftShort}</p> : null}
    {status.records.map(n => <div className="record-summary" key={n.id}>{status.state === 'unavailable' ? <strong>{t.unverified}</strong> : null}<div className="record-facts"><p><b>{t.affected}</b><br />{n.area}</p>{status.state === 'active' && n.reason ? <p><b>{t.reason}</b><br />{n.reason}</p> : null}</div><dl><DateRow label={t.issued} value={n.issued} /></dl></div>)}
    <SourceCheckHistory key={place.id} place={place} source={source} unavailable={status.state === 'unavailable'} t={t} language={language} />
    <details className="card-coverage"><summary>{t.checkCoverageLake}</summary><CatalogCoverage placeId={place.id} t={t} /><p>{t.coverage}</p></details>
    <button className={status.state === 'active' ? 'primary card-action' : 'card-action'} aria-label={`${status.state === 'active' ? t.understand : t.viewDetails} ${place.name}`} onClick={onView}>{status.state === 'active' ? t.understand : t.viewDetails} <span aria-hidden="true">→</span></button>
  </article>
}
