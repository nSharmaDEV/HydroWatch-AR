import { useId, useRef, useState, type ReactNode } from 'react'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import type { Strings } from './strings'
import { catalogEntry, noticeMatchesPlace } from './place-catalog'
import { SupplierAlertHistory } from './SupplierAlertHistory'
import { unavailableReason } from './source-checks'
import { supplierArea, supplierCounty, supplierIssued } from './supplier-display'
import { ProviderContact } from './ProviderContact'
import { SupplierInformation } from './SupplierProfile'
import { helpGuideStrings } from './help-guide-strings'
import { NoticeChecklist } from './NoticeChecklist'
import { lakeCardStrings } from './lake-card-strings'
import { SourceCheckHistory } from './SourceCheckHistory'

export function Icon({ name }: { name: 'home' | 'browse' | 'history' | 'settings' | 'water' | 'bell' | 'info' | 'search' }) {
  const paths = { home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z', browse: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z', history: 'M3 12a9 9 0 1 0 3-7M3 3v6h6M12 7v5l3 2', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2', water: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM9 15c0 2 1 3 3 3', bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4', info: 'M12 10v7M12 6v2', search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6' }
  if (name === 'info') return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d={paths.info} /></svg>
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section> }
export function appTimestamp(value: string, language: Language = 'en', zoneId = true) {
  // Only app-owned instants with an explicit offset are localized. Agency text is never parsed.
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return value
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)) + (zoneId ? ' (America/Chicago)' : '')
}
export function DateRow({ label, value, app = false, language = 'en', zoneId = true, leader = false }: { label: string; value?: string | null; unknown?: string; app?: boolean; language?: Language; zoneId?: boolean; leader?: boolean }) {
  if (!value) return null
  return <div className={`date-row${leader ? ' freshness-row' : ''}`}><dt>{leader ? <><span className="freshness-label">{label}</span><span className="freshness-leader" aria-hidden="true" /></> : label}</dt><dd><time dateTime={app ? value : undefined}>{app ? appTimestamp(value, language, zoneId) : value}</time></dd></div>
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
export function StatusCard({ place, source, archive = [], now, t, language = 'en', sample = false, onView, onHelp, onViewNotice, onRefresh, checking = false }: { place: Place; source?: SourceSnapshot; archive?: Notice[]; now: number; t: Strings; language?: Language; sample?: boolean; onView: () => void; onHelp?: () => void; onViewNotice?: (id: string) => void; onRefresh?: () => void; checking?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const infoButton = useRef<HTMLButtonElement>(null)
  const infoTitle = useId()
  const [infoOpen, setInfoOpen] = useState(false)
  const status = statusFor(place.id, source, now)
  // Match the agency's original supplier name, not WAVE's display capitalization.
  // Text fragments scroll/highlight where supported; ADH still controls table order.
  const activeNotices = status.state === 'active' ? status.records.filter(n => n.agency === 'ADH' && n.kind === 'boil' && !n.lifted) : []
  const activeSupplier = !sample && place.kind === 'system' ? activeNotices[0]?.name.trim() : undefined
  const activeSupplierUrl = activeSupplier ? `${SOURCES.ADH}#:~:text=${encodeURIComponent(activeSupplier).replace(/-/g, '%2D')}` : SOURCES.ADH
  const tone = status.state === 'active' ? place.kind === 'system' ? 'boil' : 'hab' : status.state
  const reason = unavailableReason(source, now)
  const explanation = reason === 'offline' ? t.checkOffline : reason === 'never' ? t.checkNever : reason === 'stale' ? t.checkStale : reason === 'format' ? t.checkFormatFailed : reason === 'failed' ? t.checkRetrievalFailed : t.checkUnconfirmed
  const lakeText = lakeCardStrings[language]
  const unknownHab = status.records.some(n => n.agency === 'ADEQ' && n.kind === 'hab' && n.liftStatus === 'unknown')
  const feedUpdated = source?.agency === 'ADEQ' ? source.records.find(n => noticeMatchesPlace(place.id, n) && n.sourceUpdatedAt)?.sourceUpdatedAt : undefined
  if (place.kind === 'system') return <article className={`status-card supplier-card ${tone}`}>
    <div className="supplier-heading"><div className="supplier-title-row"><h2>{supplierCounty(place.name)}</h2><button ref={infoButton} className="supplier-info-button" aria-label={t.supplierAbout} aria-haspopup="dialog" onClick={() => { setInfoOpen(true); dialog.current?.showModal() }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7M12 6v2" /></svg></button></div><p>{language === 'en' ? `${supplierCounty(place.county)} ${t.supplierCounty}` : `${t.supplierCounty} de ${supplierCounty(place.county)}`} · Arkansas Department of Health</p>{sample ? <span className="sample-tag">{t.sample} · {t.fictional}</span> : null}</div>
    <div className="supplier-finding"><div className="finding-copy">
      <p className="status-label">{status.state === 'active' ? <svg className="warning-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.8 2 18.2A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.7-2.8L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5m0 3h.01" /></svg> : null}{status.state === 'active' ? !sample ? <a className="active-notice-link" href={activeSupplierUrl} target="_blank" rel="noopener noreferrer" title={language === 'es' ? 'Abre la lista de ADH en otra pestaña; los navegadores compatibles resaltan al proveedor.' : 'Opens the ADH list in a new tab; supported browsers highlight the supplier.'}>{t.activeBoil}</a> : t.activeBoil : status.state === 'none' ? t.noneBoil : reason === 'never' ? t.uncheckedStatus : t.supplierUnavailable}</p>
      {status.state === 'active' ? activeNotices.map(n => {
        const area = n.area?.trim()
        const noticeReason = n.reason?.trim()
        return area || noticeReason ? <p key={n.id} className="status-explanation supplier-notice-context">
          {area ? <span>{language === 'es' ? 'Área afectada: ' : 'Affected area: '}<span lang={supplierArea(area, place, language) === area ? 'en' : language}>{supplierArea(area, place, language)}</span></span> : null}
          {area && noticeReason ? ' · ' : null}{noticeReason ? <span>{language === 'es' ? 'Motivo: ' : 'Reason: '}<span lang="en">{noticeReason}</span></span> : null}
        </p> : null
      }) : <p className="status-explanation">{status.state === 'unavailable' ? reason === 'never' ? t.uncheckedExplanation : explanation : t.noNoticeExplanation}</p>}
    </div></div>
    <div className="card-check-actions">{!sample && onRefresh ? <button className="secondary" disabled={checking} onClick={onRefresh}>{checking ? t.refreshing : t.checkNow}</button> : null}<a className="official-source-action official-list" href={SOURCES.ADH} target="_blank" rel="noreferrer">{t.officialSource} <span aria-hidden="true">↗</span></a></div>
    <SupplierInformation key={`profile:${place.id}`} place={place} language={language} sample={sample} onView={onView} />
    <SupplierAlertHistory key={place.id} place={place} archive={archive} source={source} now={now} t={t} language={language} onViewNotice={onViewNotice} />
    {status.state === 'unavailable' && status.records.length ? <p className="historical-note">{t.unverified}</p> : null}
    {!sample ? <div key={`contact:${place.id}`} className="supplier-contact-section supplier-section"><ProviderContact place={place} language={language} sample={sample} compact /></div> : null}
    {onHelp ? <button className="supplier-help-action guide-entry" data-help-place={place.id} onClick={onHelp}>{helpGuideStrings[language].entry}</button> : null}
    <dialog ref={dialog} className="supplier-info" aria-labelledby={infoTitle} onClose={() => { setInfoOpen(false); infoButton.current?.focus() }} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); dialog.current?.close() } }}>
      <div className="supplier-popup-heading"><h2 id={infoTitle}>{t.supplierDetails}</h2><button className="secondary" onClick={() => dialog.current?.close()}>{t.supplierClose}</button></div>
      <h3>{place.name}</h3><p className="quiet-note">{supplierCounty(place.county)} · Arkansas Department of Health</p>
      {infoOpen ? <>{status.state === 'active' && activeNotices.length ? <NoticeChecklist key={`${sample}:${place.id}:${activeNotices.map(n => `${n.id}:${n.issued}:${n.area}`).join('|')}`} notices={activeNotices} place={place} language={language} t={t} sample={sample} onHelp={() => { dialog.current?.close(); (onHelp ?? onView)() }} /> : <p className="info">{status.state === 'unavailable' ? t.supplierUnavailable : t.noneBoil}</p>}
      <dl className="supplier-popup-check">{source?.lastSuccessAt ? <DateRow label={t.successfulCheck} value={source.lastSuccessAt} app language={language} zoneId={false} leader /> : <div className="date-row freshness-row"><dt><span className="freshness-label">{t.successfulCheck}</span><span className="freshness-leader" aria-hidden="true" /></dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
      <ProviderContact place={place} language={language} sample={sample} compact />
      </> : null}
    </dialog>
  </article>
  return <article className={`status-card ${tone}`}>
    <div className="supplier-heading"><div className="supplier-title-row"><h2>{supplierCounty(place.name)}</h2></div><p>{language === 'en' ? `${supplierCounty(place.county.replace(/\s+county$/i, ''))} ${t.supplierCounty}` : `${t.supplierCounty} de ${supplierCounty(place.county.replace(/\s+county$/i, ''))}`} · Arkansas Division of Environmental Quality</p>{sample ? <span className="sample-tag">{t.sample} · {t.fictional}</span> : null}</div>
    <div className="supplier-finding"><div className="finding-copy"><p className="status-label">{unknownHab ? lakeText.notice : status.state === 'active' ? t.activeHab : status.state === 'none' ? t.none : reason === 'never' ? t.uncheckedStatus : t.supplierUnavailable}</p>{feedUpdated ? <><dl className="lake-feed-date"><DateRow label={lakeText.feedUpdated} value={feedUpdated} /></dl><p className="quiet-note">{lakeText.feedMeaning}</p></> : null}{unknownHab ? <><p className="status-explanation"><strong>{lakeText.uncertain}</strong></p><p className="status-explanation">{lakeText.explanation}</p></> : null}<p className="status-explanation">{status.state === 'unavailable' ? reason === 'never' ? t.uncheckedExplanation : unknownHab && reason === 'unconfirmed' ? null : explanation : status.state === 'none' ? t.noneText : t.supplierInstructions}</p></div></div>
    <dl>{source?.lastSuccessAt ? <DateRow label={lakeText.retrieved} value={source.lastSuccessAt} app language={language} zoneId={false} leader /> : <div className="date-row freshness-row"><dt><span className="freshness-label">{lakeText.retrieved}</span><span className="freshness-leader" aria-hidden="true" /></dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
    <p className="quiet-note">{lakeText.retrievalMeaning}</p>
    <div className="card-check-actions">{!sample && onRefresh ? <button className="secondary" disabled={checking} onClick={onRefresh}>{checking ? t.refreshing : t.checkNow}</button> : null}<a className="official-source-action official-list" href={SOURCES.ADEQ} target="_blank" rel="noreferrer">{t.officialSource}<span aria-hidden="true">↗</span></a></div>
    <SupplierAlertHistory key={place.id} place={place} archive={archive} source={source} now={now} t={t} language={language} />
    <SourceCheckHistory place={place} source={source} unavailable={status.state === 'unavailable'} t={t} language={language} compact />
    <p className="quiet-note">{lakeText.scope}</p>
    <details className="card-coverage supplier-section"><summary>{t.checkCoverageLake}<span className="disclosure-icon" aria-hidden="true" /></summary><CatalogCoverage placeId={place.id} t={t} /></details>
    <button className="card-details-action" aria-label={`${status.state === 'active' ? t.understand : t.viewDetails} ${place.name}`} onClick={onView}>{status.state === 'active' ? t.understand : t.viewDetails}</button>
  </article>
}
