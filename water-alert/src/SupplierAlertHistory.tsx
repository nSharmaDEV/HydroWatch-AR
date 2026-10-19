import { useId, useState, type ReactNode } from 'react'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { checkDate } from './source-check-time'
import type { Strings } from './strings'

const instant = (value?: string) => value && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined
const issuedAt = (n: Notice) => Date.parse(n.issued ?? '') || 0
const calendar = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18" /></svg>

export function SupplierAlertHistory({ place, archive, source, now, t, language, action }: { place: Place; archive: Notice[]; source?: SourceSnapshot; now: number; t: Strings; language: Language; action?: ReactNode; onViewNotice?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(5)
  const id = useId()
  const es = language === 'es'
  // Only distinct saved official notices; checks never create advisory history.
  const matches = (n: Notice) => n.placeId === place.id && n.agency === 'ADH' && n.kind === 'boil' && n.url === SOURCES.ADH
  const records = [...new Map(archive.filter(matches).map(n => [n.id, n])).values()].sort((a, b) => issuedAt(b) - issuedAt(a))
  const status = statusFor(place.id, source?.agency === 'ADH' ? source : undefined, now)
  const starts = [source?.agency === 'ADH' ? instant(source.historyStartedAt) : undefined, ...records.map(n => instant(n.firstObservedAt))].filter((at): at is string => !!at).sort((a, b) => Date.parse(a) - Date.parse(b))
  const field = (label: string, value?: string | null, date = false) => <div className="alert-fact"><dt>{date ? calendar : null}{label}</dt><dd lang={value?.trim() ? 'en' : undefined}>{value?.trim() || (es ? 'No proporcionado por ADH' : 'Not provided by ADH')}</dd></div>
  return <>
    <div className="supplier-actions"><button className="alert-toggle check-toggle text-button disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{t.supplierAlertHistory}<span aria-hidden="true" className="disclosure-icon" /></button>{action}</div>
    <section id={id} hidden={!open} className="supplier-alert-history" aria-label={t.supplierAlertHistory}>
      {open ? <>
        {!records.length ? <p>{t.supplierAlertEmpty}</p> : null}
        {records.slice(0, limit).map(n => {
          const lifted = !!n.lifted?.trim() && n.liftStatus !== 'unknown'
          const active = !n.lifted && n.liftStatus !== 'unknown' && status.state === 'active' && status.records.some(current => current.id === n.id && matches(current))
          return <article className={`supplier-alert-notice ${lifted ? 'lifted' : active ? 'active' : 'unconfirmed'}`} key={n.id}>
            <div className="alert-notice-heading"><h3>{es ? 'Aviso de hervir el agua' : 'Boil-water notice'}</h3><span className="profile-leader" aria-hidden="true" /><a className="alert-source-icon" href={SOURCES.ADH} target="_blank" rel="noopener noreferrer" aria-label={es ? 'Abrir lista de avisos de ADH (pestaña nueva)' : 'Open ADH notice list (new tab)'} title={es ? 'Lista general de ADH, no un enlace individual al aviso' : 'General ADH list, not an individual historical notice link'}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7M12 6v2" /></svg></a></div>
            <dl className="alert-summary-facts">{field(t.issued, n.issued, true)}{field(t.agencyLifted, lifted ? n.lifted : null, true)}{field(t.supplierAlertArea, n.area)}{field(t.supplierAlertReason, n.reason)}</dl>
            <p className="alert-status">{es ? 'Estado: ' : 'Status: '}{lifted ? t.supplierAlertLifted : active ? t.active : es ? 'Sin confirmar' : 'Unconfirmed'}</p>
          </article>
        })}
        {records.length > limit ? <button className="secondary" onClick={() => setLimit(v => v + 5)}>{es ? 'Mostrar más avisos' : 'Show more advisories'}</button> : null}
        <p className="quiet-note alert-history-limits">{starts[0] ? `${t.supplierAlertStart} ${checkDate(starts[0], language)} ${t.supplierAlertEarlier}` : t.supplierAlertUnknownStart} {t.supplierAlertLimits} {es ? 'El icono abre la lista general de ADH, no un aviso histórico individual.' : 'The info icon opens the general ADH list, not an individual historical notice.'}</p>
      </> : null}
    </section>
  </>
}
