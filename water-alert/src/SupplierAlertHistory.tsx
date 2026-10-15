import { useId, useState, type ReactNode } from 'react'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { appTimestamp, SourceLink } from './components'
import { checkDate } from './source-check-time'
import type { Strings } from './strings'

const instant = (value?: string) => value && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined
const observedAt = (n: Notice) => Date.parse(instant(n.lastObservedAt) ?? instant(n.firstObservedAt) ?? '') || 0

export function SupplierAlertHistory({ place, archive, source, now, t, language, action }: { place: Place; archive: Notice[]; source?: SourceSnapshot; now: number; t: Strings; language: Language; action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(6)
  const id = useId()
  // The durable archive is authoritative: never synthesize notices from check outcomes.
  const matches = (n: Notice) => n.placeId === place.id && n.agency === 'ADH' && n.kind === 'boil' && n.url === SOURCES.ADH
  const records = archive.filter(matches).sort((a, b) => observedAt(b) - observedAt(a))
  const status = statusFor(place.id, source?.agency === 'ADH' ? source : undefined, now)
  const starts = [source?.agency === 'ADH' ? instant(source.historyStartedAt) : undefined, ...records.map(n => instant(n.firstObservedAt))].filter((at): at is string => !!at).sort((a, b) => Date.parse(a) - Date.parse(b))
  const start = starts[0]
  const field = (label: string, value?: string | null) => <div className="alert-fact"><dt>{label}</dt><dd>{value?.trim() || t.supplierAlertMissing}</dd></div>
  return <>
    <div className="supplier-actions"><button className="alert-toggle check-toggle text-button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}><span aria-hidden="true" className="disclosure-chevron">▾</span>{t.supplierAlertHistory}</button>{action}</div>
    <section id={id} hidden={!open} className="supplier-alert-history" aria-label={t.supplierAlertHistory}>
      {open ? <>
        {!records.length ? <p>{t.supplierAlertEmpty}</p> : null}
        <p className="quiet-note">{start ? `${t.supplierAlertStart} ${checkDate(start, language)} ${t.supplierAlertEarlier}` : t.supplierAlertUnknownStart}</p>
        <p className="quiet-note">{t.supplierAlertLimits}</p>
        {records.slice(0, limit).map(n => {
          const active = !n.lifted && n.liftStatus !== 'unknown' && status.state === 'active' && status.records.some(current => current.id === n.id && matches(current))
          const lifted = !!n.lifted?.trim() && n.liftStatus !== 'unknown'
          return <article className={`supplier-alert-notice ${lifted ? 'lifted' : active ? 'active' : 'unconfirmed'}`} key={n.id}>
            <h3>{t.boil} — {n.name?.trim() || t.supplierAlertMissing}</h3>
            <p className="alert-state">{lifted ? t.supplierAlertLifted : active ? t.active : t.supplierAlertUnconfirmed}</p>
            <dl>{field(t.supplierAlertArea, n.area)}{field(t.supplierAlertReason, n.reason)}{field(t.issued, n.issued)}{field(t.agencyLifted, lifted ? n.lifted : null)}
              <div className="alert-fact"><dt>{t.supplierAlertGuidance}</dt><dd>{n.guidance?.quote.trim() && n.guidance.url && instant(n.guidance.verifiedAt) ? <><blockquote>{n.guidance.quote}</blockquote><SourceLink url={n.guidance.url}>{t.sourceLink}</SourceLink><p className="quiet-note">{t.recordsLanguage}</p></> : t.supplierAlertMissing}</dd></div>
            </dl>
            <SourceLink url={n.url}>{t.supplierAlertRead}</SourceLink>
            {instant(n.firstObservedAt) || instant(n.lastObservedAt) ? <div className="alert-observations"><p>{t.supplierAlertObserved}</p><dl>{instant(n.firstObservedAt) ? field(t.firstObserved, appTimestamp(n.firstObservedAt!, language, false)) : null}{instant(n.lastObservedAt) ? field(t.lastObserved, appTimestamp(n.lastObservedAt!, language, false)) : null}</dl></div> : null}
          </article>
        })}
        {records.length > limit ? <button className="secondary" onClick={() => setLimit(v => v + 6)}>{t.supplierAlertMore}</button> : null}
      </> : null}
    </section>
  </>
}
