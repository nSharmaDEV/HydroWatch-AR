import { useId, useRef, useState, type ReactNode } from 'react'
import { useStableStatus } from './disclosure-slide'
import { closeMotionDialog } from './interface-motion'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import type { Strings } from './strings'
import { directorySystem } from './water-system-directory'
import { catalogEntry, noticeMatchesPlace } from './place-catalog'
import { SupplierAlertHistory } from './SupplierAlertHistory'
import { unavailableReason } from './source-checks'
import { supplierArea, supplierCounty, supplierIssued, supplierName } from './supplier-display'
import { ProviderContact } from './ProviderContact'
import { SupplierInformation } from './SupplierProfile'
import { helpGuideStrings } from './help-guide-strings'
import { NoticeChecklist } from './NoticeChecklist'
import { lakeCardStrings } from './lake-card-strings'
import { SourceCheckHistory } from './SourceCheckHistory'
import { AnnualReportAiDisclaimer } from './annual-report-disclaimer'

import { Icon } from './icons'
export { Icon }
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
export function SourceLink({ url, children }: { url: string; children: ReactNode }) { return <a className="source-link" href={url} target="_blank" rel="noreferrer">{children} <Icon name="external-link" size={16} /></a> }
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
export function StatusCard({ place, source, archive = [], now, t, language = 'en', sample = false, preview = false, onView, onHelp, onAsk, onViewNotice, onRefresh, onSources, checking = false }: { place: Place; source?: SourceSnapshot; archive?: Notice[]; now: number; t: Strings; language?: Language; sample?: boolean; preview?: boolean; onView: () => void; onHelp?: () => void; onAsk?: (key: string) => void; onViewNotice?: (id: string) => void; onRefresh?: () => void; onSources?: () => void; checking?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const finding = useRef<HTMLDivElement>(null)
  useStableStatus(finding)
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
  const Sections = preview ? 'details' : 'div'
  if (place.kind === 'system') return <article className={`status-card supplier-card ${tone}`}>
    <div className="supplier-heading"><div className="supplier-title-row"><h2>{supplierName(place.name)}</h2><button ref={infoButton} className="supplier-info-button" aria-label={onSources ? language === 'en' ? 'Sources and coverage' : 'Fuentes y cobertura' : t.supplierAbout} aria-haspopup={onSources ? undefined : 'dialog'} onClick={onSources ?? (() => { setInfoOpen(true); dialog.current?.showModal() })}><Icon name="info" size={24} /></button></div><p>{language === 'en' ? `${supplierCounty(place.county)} ${t.supplierCounty}` : `${t.supplierCounty} de ${supplierCounty(place.county)}`} · Arkansas Department of Health</p>{sample ? <span className="sample-tag">{t.sample} · {t.fictional}</span> : null}</div>
    <div ref={finding} className="supplier-finding"><div className="finding-copy">
      <p className="status-label">{status.state === 'active' ? <Icon name="triangle-alert" size={24} className="warning-icon" /> : null}{status.state === 'active' ? !sample ? <a className="active-notice-link" href={activeSupplierUrl} target="_blank" rel="noopener noreferrer" title={language === 'es' ? 'Abre la lista de ADH en otra pestaña; los navegadores compatibles resaltan al proveedor.' : 'Opens the ADH list in a new tab; supported browsers highlight the supplier.'}>{t.activeBoil}</a> : t.activeBoil : status.state === 'none' ? t.noneBoil : reason === 'never' ? t.uncheckedStatus : t.supplierUnavailable}</p>
      {status.state === 'active' ? activeNotices.map(n => {
        const area = n.area?.trim()
        const noticeReason = n.reason?.trim()
        return area || noticeReason ? <p key={n.id} className="status-explanation supplier-notice-context">
          {area ? <span>{language === 'es' ? 'Área afectada: ' : 'Affected area: '}<span lang={supplierArea(area, place, language) === area ? 'en' : language}>{supplierArea(area, place, language)}</span></span> : null}
          {area && noticeReason ? ' · ' : null}{noticeReason ? <span>{language === 'es' ? 'Motivo: ' : 'Reason: '}<span lang="en">{noticeReason}</span></span> : null}
        </p> : null
      }) : <p className="status-explanation">{status.state === 'unavailable' ? reason === 'never' ? t.uncheckedExplanation : explanation : t.noNoticeExplanation}</p>}
    </div></div>
    <div className="card-check-actions">{!sample && onRefresh ? <button className="secondary check-now-action" disabled={checking} onClick={onRefresh}>{checking ? t.refreshing : t.checkNow} <Icon name="refresh-cw" size={16} /></button> : null}<a className="official-source-action official-list" href={SOURCES.ADH} target="_blank" rel="noreferrer">{t.officialSource} <Icon name="external-link" size={16} /></a></div>
    {status.state === 'unavailable' && status.records.length ? <p className="historical-note">{t.unverified}</p> : null}
    <Sections className={preview ? 'preview-details' : 'supplier-card-sections'}>
    {preview ? <summary>{language === 'es' ? 'Detalles' : 'Details'}<span className="disclosure-icon" aria-hidden="true" /></summary> : null}
    <SupplierInformation key={`profile:${place.id}`} place={place} language={language} sample={sample} onView={onView} onAsk={onAsk} />
    <SupplierAlertHistory key={place.id} place={place} archive={archive} source={source} now={now} t={t} language={language} onViewNotice={onViewNotice} coverageNote={!sample && status.state === 'none' && directorySystem(place.id) && !catalogEntry(place.id) ? <p className="quiet-note directory-match-note">{language === 'es'
      ? `Coincidencia solo por nombre exacto: WAVE muestra avisos de ADH para este sistema solo si ADH lo nombra “${place.name}”. Un aviso con otro nombre no aparecería aquí; revisa la lista de ADH.`
      : `Matched by exact name only: WAVE shows ADH notices for this system only when ADH lists it as “${place.name}”. A notice under another name would not appear here — check the ADH list.`}</p> : null} />
    {!sample ? <div key={`contact:${place.id}`} className="supplier-contact-section supplier-section"><ProviderContact place={place} language={language} sample={sample} compact /></div> : null}
    {onHelp ? <button className="supplier-help-action guide-entry" data-help-place={place.id} onClick={onHelp}>{helpGuideStrings[language].entry}</button> : null}
    </Sections>
    <dialog ref={dialog} className="supplier-info" aria-labelledby={infoTitle} onClose={() => { setInfoOpen(false); infoButton.current?.focus() }} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); closeMotionDialog(dialog.current) } }}>
      <div className="supplier-popup-heading"><h2 id={infoTitle}>{t.supplierDetails}</h2><button className="secondary" onClick={() => closeMotionDialog(dialog.current)}>{t.supplierClose}</button></div>
      <h3>{place.name}</h3><p className="quiet-note">{supplierCounty(place.county)} · Arkansas Department of Health</p>
      {infoOpen ? <>{status.state === 'active' && activeNotices.length ? <NoticeChecklist key={`${sample}:${place.id}:${activeNotices.map(n => `${n.id}:${n.issued}:${n.area}`).join('|')}`} notices={activeNotices} place={place} language={language} t={t} sample={sample} onHelp={() => { closeMotionDialog(dialog.current, onHelp ?? onView) }} /> : <p className="info">{status.state === 'unavailable' ? t.supplierUnavailable : t.noneBoil}</p>}
      <dl className="supplier-popup-check">{source?.lastSuccessAt ? <DateRow label={t.successfulCheck} value={source.lastSuccessAt} app language={language} zoneId={false} leader /> : <div className="date-row freshness-row"><dt><span className="freshness-label">{t.successfulCheck}</span><span className="freshness-leader" aria-hidden="true" /></dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
      <ProviderContact place={place} language={language} sample={sample} compact />
      <AnnualReportAiDisclaimer language={language} />
      </> : null}
    </dialog>
  </article>
  return <article className={`status-card ${tone}`}>
    <div className="supplier-heading"><div className="supplier-title-row"><h2>{supplierCounty(place.name)}</h2></div><p>{language === 'en' ? `${supplierCounty(place.county.replace(/\s+county$/i, ''))} ${t.supplierCounty}` : `${t.supplierCounty} de ${supplierCounty(place.county.replace(/\s+county$/i, ''))}`} · Arkansas Division of Environmental Quality</p>{sample ? <span className="sample-tag">{t.sample} · {t.fictional}</span> : null}</div>
    <div className="supplier-finding"><div className="finding-copy"><p className="status-label">{unknownHab ? lakeText.notice : status.state === 'active' ? t.activeHab : status.state === 'none' ? t.none : reason === 'never' ? t.uncheckedStatus : t.supplierUnavailable}</p>{feedUpdated ? <><dl className="lake-feed-date"><DateRow label={lakeText.feedUpdated} value={feedUpdated} /></dl><p className="quiet-note">{lakeText.feedMeaning}</p></> : null}{unknownHab ? <><p className="status-explanation"><strong>{lakeText.uncertain}</strong></p><p className="status-explanation">{lakeText.explanation}</p></> : null}<p className="status-explanation">{status.state === 'unavailable' ? reason === 'never' ? t.uncheckedExplanation : unknownHab && reason === 'unconfirmed' ? null : explanation : status.state === 'none' ? t.noneText : t.supplierInstructions}</p></div></div>
    <dl>{source?.lastSuccessAt ? <DateRow label={lakeText.retrieved} value={source.lastSuccessAt} app language={language} zoneId={false} leader /> : <div className="date-row freshness-row"><dt><span className="freshness-label">{lakeText.retrieved}</span><span className="freshness-leader" aria-hidden="true" /></dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
    <p className="quiet-note">{lakeText.retrievalMeaning}</p>
    <div className="card-check-actions">{!sample && onRefresh ? <button className="secondary check-now-action" disabled={checking} onClick={onRefresh}>{checking ? t.refreshing : t.checkNow} <Icon name="refresh-cw" size={16} /></button> : null}<a className="official-source-action official-list" href={SOURCES.ADEQ} target="_blank" rel="noreferrer">{t.officialSource} <Icon name="external-link" size={16} /></a></div>
    <SupplierAlertHistory key={place.id} place={place} archive={archive} source={source} now={now} t={t} language={language} />
    <SourceCheckHistory place={place} source={source} unavailable={status.state === 'unavailable'} t={t} language={language} compact />
    <p className="quiet-note">{lakeText.scope}</p>
    <details className="card-coverage supplier-section"><summary>{t.checkCoverageLake}<span className="disclosure-icon" aria-hidden="true" /></summary><CatalogCoverage placeId={place.id} t={t} /></details>
    <button className="card-details-action" aria-label={`${status.state === 'active' ? t.understand : t.viewDetails} ${place.name}`} onClick={onView}>{status.state === 'active' ? t.understand : t.viewDetails}</button>
  </article>
}
