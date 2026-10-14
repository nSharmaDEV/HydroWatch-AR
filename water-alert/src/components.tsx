import type { ReactNode } from 'react'
import { statusFor, type Language, type Place, type SourceSnapshot } from './domain'
import type { Strings } from './strings'
import { catalogEntry } from './place-catalog'

export function Icon({ name }: { name: 'home' | 'browse' | 'history' | 'settings' | 'water' | 'bell' | 'search' }) {
  const paths = { home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z', browse: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z', history: 'M3 12a9 9 0 1 0 3-7M3 3v6h6M12 7v5l3 2', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2', water: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM9 15c0 2 1 3 3 3', bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4', search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6' }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section> }
export function appTimestamp(value: string, language: Language = 'en') {
  // Only app-owned instants with an explicit offset are localized. Agency text is never parsed.
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return value
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)) + ' (America/Chicago)'
}
export function DateRow({ label, value, app = false, language = 'en' }: { label: string; value?: string | null; unknown?: string; app?: boolean; language?: Language }) {
  if (!value) return null
  return <div className="date-row"><dt>{label}</dt><dd><time dateTime={app ? value : undefined}>{app ? appTimestamp(value, language) : value}</time></dd></div>
}
export function SourceLink({ url, children }: { url: string; children: ReactNode }) { return <a className="source-link" href={url} target="_blank" rel="noreferrer">{children} <span aria-hidden="true">↗</span></a> }
export function CatalogCoverage({ placeId, t }: { placeId: string; t: Strings }) {
  const entry = catalogEntry(placeId)
  if (!entry) return null
  return <div className="info"><p>{entry.place.kind === 'lake' ? t.catalogWaterbody : t.catalogSupplier}</p><SourceLink url={entry.url}>{t.catalogSource}</SourceLink></div>
}
export function StatusCard({ place, source, now, t, language = 'en', sample = false, onView }: { place: Place; source?: SourceSnapshot; now: number; t: Strings; language?: Language; sample?: boolean; onView: () => void }) {
  const status = statusFor(place.id, source, now)
  const tone = status.state === 'active' ? place.kind === 'system' ? 'boil' : 'hab' : status.state
  return <article className={`status-card ${tone}`}>
    <div className="card-title"><div><h2>{place.name}</h2><p>{place.county} · {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p></div>{sample ? <span className="sample-tag">{t.sample}</span> : null}</div>
    <p className="status-label"><span aria-hidden="true" className="status-symbol">{status.state === 'active' ? '!' : status.state === 'none' ? '—' : '?'}</span>{status.state === 'active' ? place.kind === 'system' ? t.boil : t.hab : status.state === 'none' ? t.none : t.unavailable}</p>
    {status.state === 'unavailable' ? <p>{t.unavailableText}</p> : null}
    {status.state === 'none' ? <p>{t.noneText}</p> : null}
    <CatalogCoverage placeId={place.id} t={t} />
    {status.records.some(n => n.liftStatus === 'unknown') ? <p>{t.unknownLift}</p> : null}
    {status.records.map(n => <div className="record-summary" key={n.id}>{status.state === 'unavailable' ? <strong>{t.unverified}</strong> : null}<div className="record-facts"><p><b>{t.affected}</b><br />{n.area}</p>{status.state === 'active' && n.reason ? <p><b>{t.reason}</b><br />{n.reason}</p> : null}</div></div>)}
    <dl><DateRow label={t.checked} value={source?.retrievedAt} app language={language} />{status.state === 'unavailable' ? <DateRow label={t.lastSuccess} value={source?.lastSuccessAt} app language={language} /> : null}</dl>
    <button className={status.state === 'active' ? 'primary card-action' : 'card-action'} aria-label={`${status.state === 'active' ? t.understand : t.viewDetails} ${place.name}`} onClick={onView}>{status.state === 'active' ? t.understand : t.viewDetails} <span aria-hidden="true">→</span></button>
  </article>
}
