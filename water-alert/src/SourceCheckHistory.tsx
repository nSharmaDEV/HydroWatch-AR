import { Fragment, useId, useState, type ReactNode } from 'react'
import type { Language, Place, SourceCheck, SourceSnapshot } from './domain'
import { appTimestamp, DateRow } from './components'
import { groupChecks, resultForCheck } from './source-checks'
import type { Strings } from './strings'
import { checkDate, checkTime, checkTimeRange } from './source-check-time'

function CheckResult({ check, place, t, compact = false }: { check: SourceCheck; place: Place; t: Strings; compact?: boolean }) {
  const result = resultForCheck(place.id, check)
  const text = result.state === 'failure' ? t.checkFailed : result.state === 'unknown' ? t.checkUnknown : result.state === 'active' ? t.checkActive : place.kind === 'system' ? t.checkNoMatchSupplier : t.checkNoMatchLake
  return <div className="check-result"><p>{text}</p>
    {compact ? null : check.outcome === 'failure' ? <p className="quiet-note">{check.error}</p> : result.records.map(n => <div className="check-notice" key={n.id}>
      <p><b>{t.affected}</b>: <span>{n.area}</span></p>{n.reason ? <p><b>{t.reason}</b>: <span>{n.reason}</span></p> : null}
      <dl><DateRow label={t.issued} value={n.issued} /><DateRow label={t.agencyLifted} value={n.lifted} /><DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /></dl>
    </div>)}
  </div>
}
export function SupplierLastCheck({ place, source, t, language }: { place: Place; source?: SourceSnapshot; t: Strings; language: Language }) {
  const check = source?.lastSuccessfulCheck
  return check ? <section className="last-check compact-last-check" aria-label={t.checkLastSuccess}><h3>{t.checkLastSuccess}</h3><time dateTime={check.at}>{appTimestamp(check.at, language).replace(' (America/Chicago)', '')}</time><CheckResult check={check} place={place} t={t} compact /><p className="historical-note">{t.checkHistorical}</p></section> : <p>{t.supplierNoSuccess}</p>
}
export function SourceCheckHistory({ place, source, unavailable, t, language, compact = false, explanation, action }: { place: Place; source?: SourceSnapshot; unavailable: boolean; t: Strings; language: Language; compact?: boolean; explanation?: string; action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(6)
  const id = useId()
  const checks = source?.checks ?? []
  const lastSuccess = source?.lastSuccessfulCheck
  const latest = checks.at(-1)
  const attemptAt = source?.retrievedAt
  // Supplier rows group only saved, consecutive successful evidence on the same local date.
  const groups = (compact ? groupChecks(place.id, checks, checkDate) : [...groupChecks(place.id, checks.slice(0, -1)), ...(latest ? [[latest]] : [])]).reverse()
  const outcome = latest && latest.at === attemptAt ? latest.outcome === 'success' ? t.checkSucceeded : t.checkFailed : source?.error && source.error !== 'Local API unavailable' && attemptAt ? t.checkFailed : t.checkAttemptUnknown
  return <>
    {compact ? null : <section className="last-check" aria-label={t.checkLastSuccess}>
      <h3>{t.checkLastSuccess}</h3>
      {lastSuccess ? <><time dateTime={lastSuccess.at}>{appTimestamp(lastSuccess.at, language)}</time><CheckResult check={lastSuccess} place={place} t={t} /></> : <><p>{t.checkNoSuccess}</p>{source?.lastSuccessAt ? <><p className="quiet-note">{t.checkLegacy}</p><dl><DateRow label={t.lastSuccess} value={source.lastSuccessAt} app language={language} /></dl></> : null}</>}
      <p className="historical-note">{unavailable ? t.checkHistorical : t.checkHistoricalAvailable}</p>
      <div className="latest-attempt"><h3>{t.checkLatest}</h3>{attemptAt ? <><time dateTime={attemptAt}>{appTimestamp(attemptAt, language)}</time><p>{outcome}</p></> : <p>{t.checkNoAttempt}</p>}</div>
    </section>}
    <div className={compact ? 'supplier-source-activity' : undefined}><button className="check-toggle text-button" aria-label={compact ? t.supplierActivity : t.checkHistory} aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{compact ? t.supplierActivity : t.checkHistory}<span aria-hidden="true" className={compact ? 'disclosure-chevron' : undefined}>{compact ? '▾' : open ? '−' : '+'}</span></button>{action}</div>
    <div id={id} hidden={!open} className="check-history">
      {open ? <>{explanation ? <p>{explanation}</p> : null}{compact ? <SupplierLastCheck place={place} source={source} t={t} language={language} /> : null}<p className="quiet-note">{compact ? t.supplierCheckMeaning : t.checkMeaning}</p><p className="quiet-note">{t.checkRetention}</p>{compact ? <><p className="quiet-note">{t.supplierStorage}</p><p className="quiet-note">{t.supplierArchiveStorage}</p>{!lastSuccess && source?.lastSuccessAt ? <p>{t.checkLegacy}</p> : null}</> : null}
        {checks.length ? <><dl><DateRow label={t.checkStart} value={checks[0].at} app language={language} zoneId={!compact} /></dl><ol aria-label={t.checkList} className="check-timeline">
          {groups.slice(0, visible).map((group, i) => compact ? <Fragment key={`${group[0].at}:${i}`}>
            {i === 0 || checkDate(group[0].at) !== checkDate(groups[i - 1][0].at) ? <li className="check-date"><h4>{checkDate(group[0].at, language)}</h4></li> : null}
            <li className={`check-event ${group[0].outcome}`}>
              {group.length > 1 ? <><details className="repeated-checks"><summary><span>{group.length} {t.supplierRepeated} · {checkTimeRange(group[0].at, group.at(-1)!.at, language)}</span><span aria-hidden="true" className="disclosure-chevron">▾</span></summary>
                {[...group].reverse().map((check, index) => <div className="individual-check" key={`${check.at}:${index}`}><time dateTime={check.at}>{checkTime(check.at, language)}</time></div>)}
              </details><CheckResult check={group[0]} place={place} t={t} /></> : <><time dateTime={group[0].at}>{checkTime(group[0].at, language)}</time><CheckResult check={group[0]} place={place} t={t} /></>}
            </li>
          </Fragment> : <li key={`${group[0].at}:${i}`} className={`check-event ${group[0].outcome}`}>
            {group.length > 1 ? <details className="repeated-checks"><summary>{group.length} {t.checkRepeated}{compact ? <span aria-hidden="true">▾</span> : null}</summary><p className="quiet-note">{t.checkRange}: {appTimestamp(group[0].at, language)} — {appTimestamp(group.at(-1)!.at, language)}</p>{[...group].reverse().map((check, index) => <div className="individual-check" key={`${check.at}:${index}`}><time dateTime={check.at}>{appTimestamp(check.at, language)}</time><CheckResult check={check} place={place} t={t} /></div>)}</details> : <><time dateTime={group[0].at}>{appTimestamp(group[0].at, language)}</time><CheckResult check={group[0]} place={place} t={t} /></>}
            {group.length > 1 ? <p className="check-range">{appTimestamp(group[0].at, language)} — {appTimestamp(group.at(-1)!.at, language)}</p> : null}
          </li>)}
        </ol>{groups.length > visible ? <button className="secondary" onClick={() => setVisible(v => v + 6)}>{t.checkMore}</button> : null}</> : <p>{t.checkEmpty}</p>}
      </> : null}
    </div>
  </>
}
