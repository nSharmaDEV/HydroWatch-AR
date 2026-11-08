import { useId, useState, type ReactNode } from 'react'
import { useMotionPresence } from './interface-motion'
import { Icon } from './icons'
import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { checkDate } from './source-check-time'
import type { Strings } from './strings'
import { noticeMatchesPlace } from './place-catalog'
import { lakeCardStrings } from './lake-card-strings'
import { supplierHistory } from './imported-advisories'

const instant = (value?: string) => value && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined
const calendar = <Icon name="calendar" size={16} />

export function SupplierAlertHistory({ place, archive, source, now, t, language, action, coverageNote }: { place: Place; archive: Notice[]; source?: SourceSnapshot; now: number; t: Strings; language: Language; action?: ReactNode; coverageNote?: ReactNode; onViewNotice?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const motion = useMotionPresence(open, 'slide')
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
  const saved = [...new Map(evidence.filter(matches).map(n => [n.id, n])).values()]
  const records = supplierHistory(place.id, saved)
  const status = statusFor(place.id, source?.agency === agency ? source : undefined, now)
  const starts = [source?.agency === agency ? instant(source.historyStartedAt) : undefined, ...saved.map(n => instant(n.firstObservedAt))].filter((at): at is string => !!at).sort((a, b) => Date.parse(a) - Date.parse(b))
  const field = (label: string, value?: string | null, date = false) => <div className="alert-fact"><dt>{date ? calendar : null}{label}</dt><dd lang={value?.trim() ? 'en' : undefined}>{value?.trim() || (es ? `No proporcionado por ${agency}` : `Not provided by ${agency}`)}</dd></div>
  return <>
    <div className="supplier-actions"><button className="alert-toggle check-toggle text-button disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{title}<span aria-hidden="true" className="disclosure-icon" /></button>{action}</div>
    <section ref={motion.ref} id={id} hidden={!motion.present} inert={!open} aria-hidden={!open || undefined} className="supplier-alert-history" aria-label={title}>
      {motion.present ? <>
        {coverageNote}
        {lake && records.length && !source?.records.some(matches) ? <p className="historical-note">{t.unverified}</p> : null}
        {!records.length ? <p>{lake ? es ? 'No hay avisos guardados para este cuerpo de agua.' : 'No advisory notices saved for this waterbody.' : t.supplierAlertEmpty}</p> : null}
        {records.slice(0, limit).map(({ record: n, observed, imported }) => {
          const lifted = !!n.lifted?.trim() && observed?.liftStatus !== 'unknown'
          const active = !!observed && !n.lifted && observed.liftStatus !== 'unknown' && status.state === 'active' && status.records.some(current => current.id === n.id && matches(current))
          return <article className={`supplier-alert-notice ${lifted ? 'lifted' : active ? 'active' : 'unconfirmed'}`} key={n.id}>
            <div className="alert-notice-heading"><h3>{lake ? es ? 'Aviso de algas nocivas' : 'Harmful-algal-bloom notice' : es ? 'Aviso de hervir el agua' : 'Boil-water notice'}</h3><span className="profile-leader" aria-hidden="true" />{!imported ? <a className="alert-source-icon" href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={es ? `Abrir lista de avisos de ${agency} (pestaña nueva)` : `Open ${agency} notice list (new tab)`} title={es ? `Lista general de ${agency}, no un enlace individual al aviso` : `General ${agency} list, not an individual historical notice link`}><Icon name="info" size={24} /></a> : null}</div>
            {imported ? <p className="historical-note">{es ? 'Registro histórico importado' : 'Historical record imported'}</p> : null}
            <dl className={`alert-summary-facts${lake ? ' lake-record-facts' : ''}`}>{lake ? <>{field(lakeText.issued, n.issued, true)}{field(lakeText.lift, observed?.liftStatus === 'unknown' ? lakeText.unknown : lifted ? n.lifted : null, true)}{field(lakeText.location, n.area)}{n.reason?.trim() ? field(t.supplierAlertReason, n.reason) : null}{field(lakeText.feedUpdated, observed?.sourceUpdatedAt, true)}</> : <>{field(imported ? es ? 'Emitido' : 'Issued' : t.issued, n.issued, true)}{field(imported ? es ? 'Levantado explícitamente' : 'Explicitly lifted' : t.agencyLifted, lifted ? n.lifted : null, true)}{field(t.supplierAlertArea, n.area)}{field(t.supplierAlertReason, n.reason)}</>}</dl>
            {lake && observed?.sourceUpdatedAt ? <p className="quiet-note">{lakeText.feedMeaning}</p> : null}
            <p className="alert-status">{es ? 'Estado: ' : 'Status: '}{lifted ? imported ? es ? 'Levantado explícitamente' : 'Explicitly lifted' : t.supplierAlertLifted : active ? t.active : es ? 'Sin confirmar' : 'Unconfirmed'}</p>
            {imported ? <>
              <p className="quiet-note">{es ? 'Publicado por: ' : 'Published by: '}<span lang="en">{imported.publisher}</span>. {es ? 'Revisado: ' : 'Reviewed: '}{imported.reviewedOn}.</p>
              {imported.discrepancy ? <p className="historical-note">{imported.discrepancy[language]}</p> : null}
              <p><a href={imported.noticeUrl} target="_blank" rel="noopener noreferrer">{es ? 'Aviso original (pestaña nueva)' : 'Original notice (new tab)'}</a>{imported.liftUrl ? <> · <a href={imported.liftUrl} target="_blank" rel="noopener noreferrer">{es ? 'Aviso oficial de levantamiento (pestaña nueva)' : 'Official lift notice (new tab)'}</a></> : null}</p>
            </> : null}
          </article>
        })}
        {records.length > limit ? <button className="secondary" onClick={() => setLimit(v => v + 5)}>{es ? 'Mostrar más avisos' : 'Show more advisories'}</button> : null}
        {records.some(n => n.imported) ? <p className="quiet-note">{es ? 'Los registros históricos de fuentes separadas pueden ser anteriores al inicio de la recopilación. No cambian el estado actual ni generan notificaciones.' : 'Separately sourced historical records may predate collection. They do not change current status or trigger notifications.'}</p> : null}
        <p className="quiet-note alert-history-limits">{starts[0] ? `${t.supplierAlertStart} ${checkDate(starts[0], language)} ${t.supplierAlertEarlier}` : t.supplierAlertUnknownStart} {t.supplierAlertLimits} {es ? `El icono abre la lista general de ${agency}, no un aviso histórico individual.` : `The info icon opens the general ${agency} list, not an individual historical notice.`}</p>
      </> : null}
    </section>
  </>
}
