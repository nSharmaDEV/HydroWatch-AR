import { useId, useState, type ReactNode } from 'react'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { checkDate } from './source-check-time'
import type { Strings } from './strings'
import { noticeMatchesPlace } from './place-catalog'
import { lakeCardStrings } from './lake-card-strings'

const instant = (value?: string) => value && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined
const issuedAt = (n: Notice) => Date.parse(n.issued ?? '') || 0
const calendar = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18" /></svg>

export function SupplierAlertHistory({ place, archive, source, now, t, language, action }: { place: Place; archive: Notice[]; source?: SourceSnapshot; now: number; t: Strings; language: Language; action?: ReactNode; onViewNotice?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(5)
  const id = useId()
  const es = language === 'es'
  const lake = place.kind === 'lake'
  const lakeText = lakeCardStrings[language]
  const title = lake ? lakeText.record : t.supplierAlertHistory
  const agency = lake ? 'ADEQ' : 'ADH'
  const sourceUrl = SOURCES[agency]
  // Only distinct saved official notices; checks never create advisory history.
  const matches = (n: Notice) => noticeMatchesPlace(place.id, n) && n.agency === agency && n.kind === (lake ? 'hab' : 'boil') && n.url === sourceUrl
  const evidence = lake ? [...archive, ...(source?.agency === agency ? source.records : [])] : archive
  const records = [...new Map(evidence.filter(matches).map(n => [n.id, n])).values()].sort((a, b) => issuedAt(b) - issuedAt(a))
  const status = statusFor(place.id, source?.agency === agency ? source : undefined, now)
  const starts = [source?.agency === agency ? instant(source.historyStartedAt) : undefined, ...records.map(n => instant(n.firstObservedAt))].filter((at): at is string => !!at).sort((a, b) => Date.parse(a) - Date.parse(b))
  const field = (label: string, value?: string | null, date = false) => <div className="alert-fact"><dt>{date ? calendar : null}{label}</dt><dd lang={value?.trim() ? 'en' : undefined}>{value?.trim() || (es ? `No proporcionado por ${agency}` : `Not provided by ${agency}`)}</dd></div>
  return <>
    <div className="supplier-actions"><button className="alert-toggle check-toggle text-button disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{title}<span aria-hidden="true" className="disclosure-icon" /></button>{action}</div>
    <section id={id} hidden={!open} className="supplier-alert-history" aria-label={title}>
      {open ? <>
        {lake && records.length && !source?.records.some(matches) ? <p className="historical-note">{t.unverified}</p> : null}
        {!records.length ? <p>{lake ? es ? 'No hay avisos guardados para este cuerpo de agua.' : 'No advisory notices saved for this waterbody.' : t.supplierAlertEmpty}</p> : null}
        {records.slice(0, limit).map(n => {
          const lifted = !!n.lifted?.trim() && n.liftStatus !== 'unknown'
          const active = !n.lifted && n.liftStatus !== 'unknown' && status.state === 'active' && status.records.some(current => current.id === n.id && matches(current))
          return <article className={`supplier-alert-notice ${lifted ? 'lifted' : active ? 'active' : 'unconfirmed'}`} key={n.id}>
            <div className="alert-notice-heading"><h3>{lake ? es ? 'Aviso de algas nocivas' : 'Harmful-algal-bloom notice' : es ? 'Aviso de hervir el agua' : 'Boil-water notice'}</h3><span className="profile-leader" aria-hidden="true" /><a className="alert-source-icon" href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={es ? `Abrir lista de avisos de ${agency} (pestaña nueva)` : `Open ${agency} notice list (new tab)`} title={es ? `Lista general de ${agency}, no un enlace individual al aviso` : `General ${agency} list, not an individual historical notice link`}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7M12 6v2" /></svg></a></div>
            <dl className={`alert-summary-facts${lake ? ' lake-record-facts' : ''}`}>{lake ? <>{field(lakeText.issued, n.issued, true)}{field(lakeText.lift, n.liftStatus === 'unknown' ? lakeText.unknown : lifted ? n.lifted : null, true)}{field(lakeText.location, n.area)}{n.reason?.trim() ? field(t.supplierAlertReason, n.reason) : null}{field(lakeText.feedUpdated, n.sourceUpdatedAt, true)}</> : <>{field(t.issued, n.issued, true)}{field(t.agencyLifted, lifted ? n.lifted : null, true)}{field(t.supplierAlertArea, n.area)}{field(t.supplierAlertReason, n.reason)}</>}</dl>
            {lake && n.sourceUpdatedAt ? <p className="quiet-note">{lakeText.feedMeaning}</p> : null}
            <p className="alert-status">{es ? 'Estado: ' : 'Status: '}{lifted ? t.supplierAlertLifted : active ? t.active : es ? 'Sin confirmar' : 'Unconfirmed'}</p>
          </article>
        })}
        {records.length > limit ? <button className="secondary" onClick={() => setLimit(v => v + 5)}>{es ? 'Mostrar más avisos' : 'Show more advisories'}</button> : null}
        <p className="quiet-note alert-history-limits">{starts[0] ? `${t.supplierAlertStart} ${checkDate(starts[0], language)} ${t.supplierAlertEarlier}` : t.supplierAlertUnknownStart} {t.supplierAlertLimits} {es ? `El icono abre la lista general de ${agency}, no un aviso histórico individual.` : `The info icon opens the general ${agency} list, not an individual historical notice.`}</p>
      </> : null}
    </section>
  </>
}
