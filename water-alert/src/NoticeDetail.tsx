import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { AgencyLiftRow, CatalogCoverage, DateRow, Panel, SourceLink } from './components'
import { AdeqGuidance } from './AdeqGuidance'
import type { Strings } from './strings'
import { SourceCheckHistory } from './SourceCheckHistory'
import { ProviderContact } from './ProviderContact'

export function NoticeDetail({ place, source, now, linkedNotice, t, language, sample = false, onBack, onShare, onAlerts }: { place: Place; source?: SourceSnapshot; now: number; linkedNotice?: Notice; t: Strings; language: Language; sample?: boolean; onBack: () => void; onShare: (n: Notice) => void; onAlerts: () => void }) {
  const status = statusFor(place.id, source, now)
  const records = linkedNotice ? [linkedNotice] : status.records
  const unavailable = status.state === 'unavailable'
  const tone = linkedNotice ? linkedNotice.lifted ? 'none' : 'unavailable' : status.state === 'active' ? place.kind === 'system' ? 'boil' : 'hab' : status.state
  const heading = linkedNotice ? linkedNotice.lifted ? t.explicitLift : t.unverified : status.state === 'active' ? place.kind === 'system' ? t.boil : t.hab : unavailable ? t.unavailable : t.none
  return <>
    <button className="back" onClick={onBack}>‹ {t.back}</button>
    <div className="page-heading"><div><h1>{place.name}</h1><p>{place.county} · {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p></div></div>
    <div className="detail-layout"><div>
      <Panel className={`detail-status ${tone}`}><p className="status-label"><span className="status-symbol" aria-hidden="true">{linkedNotice ? linkedNotice.lifted ? '—' : '?' : status.state === 'active' ? '!' : unavailable ? '?' : '—'}</span>{heading}</p>
        {unavailable ? <p>{t.unavailableText}</p> : !linkedNotice && status.state === 'none' ? <p>{t.noneText}</p> : null}
        {records.some(n => n.liftStatus === 'unknown') ? <p className="info">{t.unknownLift}</p> : null}
        {records.map(n => <section className="detail-record" key={n.id}>
          {n.lifted ? null : unavailable || linkedNotice ? <p className="unverified-label">{n.kind === 'boil' ? t.previousBoil : t.previousHab} · {t.unverified}</p> : null}
          <div className="record-facts"><div><h2>{t.affected}</h2><p>{n.area}</p></div><div><h2>{t.reason}</h2><p>{n.reason || t.unknown}</p></div></div>
        </section>)}
        <dl><DateRow label={t.checked} value={source?.retrievedAt} app language={language} zoneId={place.kind !== 'system'} />{unavailable ? <DateRow label={t.lastSuccess} value={source?.lastSuccessAt} app language={language} zoneId={place.kind !== 'system'} /> : null}</dl>
      </Panel>
      <ProviderContact place={place} language={language} sample={sample} />
      <CatalogCoverage placeId={place.id} t={t} /><p className="info">{t.noSafety}</p><section className="next-step"><h2>{t.nextStep}</h2><p>{t.nextStepText}</p>
        {place.kind === 'lake' ? <AdeqGuidance t={t} /> : <><h3>{t.guidance}</h3>{records.some(n => n.guidance) ? records.filter(n => n.guidance).map(n => <blockquote key={n.id}>{n.guidance!.quote}<SourceLink url={n.guidance!.url}>{t.sourceLink}</SourceLink></blockquote>) : <p>{t.guidanceGap}</p>}</>}
        <div className="actions"><SourceLink url={linkedNotice?.url ?? records[0]?.url ?? SOURCES[place.kind === 'system' ? 'ADH' : 'ADEQ']}>{t.sourceLink}</SourceLink>{records.map(n => <button className="secondary" key={n.id} onClick={() => onShare(n)}>{t.share}{records.length > 1 ? ` · ${n.area}` : ''}</button>)}</div>
        <p className="quiet-note">{t.recordsLanguage}</p>
      </section>
    </div><aside><Panel className="detail-disclosures">
      <details open><summary>{t.noticeDetails}</summary>{records.map(n => <dl key={n.id}>
        {records.length > 1 ? <div className="date-row"><dt>{t.affected}</dt><dd>{n.area}</dd></div> : null}
        <DateRow label={t.issued} value={n.issued} /><DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /><AgencyLiftRow notice={n} t={t} />
        <div className="date-row"><dt>{t.source}</dt><dd><SourceLink url={n.url}>{n.agency}</SourceLink></dd></div>
        <DateRow label={t.firstObserved} value={n.firstObservedAt} app language={language} zoneId={place.kind !== 'system'} /><DateRow label={t.lastObserved} value={n.lastObservedAt} app language={language} zoneId={place.kind !== 'system'} />
      </dl>)}{place.kind === 'lake' ? <p className="quiet-note">{t.observationMeaning}</p> : null}<dl><DateRow label={t.checked} value={source?.retrievedAt} app language={language} zoneId={place.kind !== 'system'} /></dl></details>
      {place.kind === 'system' ? <SourceCheckHistory place={place} source={source} unavailable={unavailable} t={t} language={language} compact /> : null}
      <details><summary>{t.originalText}</summary>{records.length ? records.map(n => <div key={n.id}><p>{n.area}</p>{n.reason ? <p>{n.reason}</p> : null}<p>{t.recordsLanguage}</p><SourceLink url={n.url}>{t.sourceLink}</SourceLink></div>) : <p>{t.noHistory}</p>}</details>
      <details><summary>{t.reviewAlerts}</summary><p>{t.disconnected}</p><button className="primary full" onClick={onAlerts}>{t.lift}</button></details>
    </Panel></aside></div>
  </>
}
