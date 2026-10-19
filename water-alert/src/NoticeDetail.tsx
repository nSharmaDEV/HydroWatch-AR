import { SOURCES, statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { AgencyLiftRow, CatalogCoverage, DateRow, Panel, SourceLink } from './components'
import { AdeqGuidance } from './AdeqGuidance'
import type { Strings } from './strings'
import { SourceCheckHistory } from './SourceCheckHistory'
import { ProviderContact } from './ProviderContact'
import { RecoveryActions } from './RecoveryActions'
import { SupplierProfile } from './SupplierProfile'
import { BoilWaterGuidance } from './BoilWaterGuidance'
import { supplierCounty } from './supplier-display'
import { catalogEntry } from './place-catalog'
import { helpGuideStrings } from './help-guide-strings'

export function NoticeDetail({ place, source, now, linkedNotice, t, language, sample = false, onBack, onShare, onAlerts, onHelp }: { place: Place; source?: SourceSnapshot; now: number; linkedNotice?: Notice; t: Strings; language: Language; sample?: boolean; onBack: () => void; onShare: (n: Notice) => void; onAlerts: () => void; onHelp?: () => void }) {
  const status = statusFor(place.id, source, now)
  const records = linkedNotice ? [linkedNotice] : status.records
  const unavailable = status.state === 'unavailable'
  const tone = linkedNotice ? linkedNotice.lifted ? 'none' : 'unavailable' : status.state === 'active' ? place.kind === 'system' ? 'boil' : 'hab' : status.state
  const heading = linkedNotice ? linkedNotice.lifted ? t.explicitLift : t.unverified : status.state === 'active' ? place.kind === 'system' ? t.activeBoil : t.activeHab : unavailable ? t.unavailable : t.none
  return <>
    <button className="back" onClick={onBack}>‹ {t.back}</button>
    <div className="page-heading"><div><h1>{supplierCounty(place.name)}</h1><p>{supplierCounty(place.county)} · {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p>{sample ? <span className="sample-tag">{t.sample} · {t.fictional}</span> : null}</div></div>
      <Panel className={`detail-status ${tone}`}><p className="status-label"><span className="status-symbol" aria-hidden="true">{linkedNotice ? linkedNotice.lifted ? '—' : '?' : status.state === 'active' ? '!' : unavailable ? '?' : '—'}</span>{heading}</p>
        {unavailable ? <p>{t.unavailableText}</p> : !linkedNotice && status.state === 'none' ? <p>{t.noneText}</p> : null}
        {records.some(n => n.liftStatus === 'unknown') ? <p className="info">{t.unknownLift}</p> : null}
        <dl>{source?.lastSuccessAt ? <DateRow label={t.successfulCheck} value={source.lastSuccessAt} app language={language} zoneId={false} /> : <div className="date-row"><dt>{t.successfulCheck}</dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl>
        <a className="primary official-list" href={linkedNotice?.url ?? SOURCES[place.kind === 'system' ? 'ADH' : 'ADEQ']} target="_blank" rel="noreferrer">{t.officialSource} <span aria-hidden="true">↗</span></a>
        {records.map(n => <section className="detail-record" key={n.id}>
          {!n.lifted && unavailable && !linkedNotice ? <p className="unverified-label">{t.unverified}</p> : null}
          <div className="record-facts"><div><h2>{t.affected}</h2><p>{n.area}</p></div><div><h2>{t.reason}</h2><p>{n.reason || t.unknown}</p></div></div>
        </section>)}
      </Panel>
      <ProviderContact place={place} language={language} sample={sample} />
      {place.kind === 'system' && onHelp ? <button className="secondary guide-entry" data-help-place={place.id} onClick={onHelp}>{helpGuideStrings[language].entry}</button> : null}
      {place.kind === 'system' ? <RecoveryActions key={`${sample}:${place.id}:${records.map(n => n.id).sort().join('|')}:${language}`} place={place} notice={records.length === 1 ? records[0] : undefined} language={language} sample={sample} /> : null}
    <div className="detail-layout"><div>
      <SupplierProfile place={place} language={language} sample={sample} />
      {status.state !== 'none' || linkedNotice ? <p className="quiet-note">{t.noSafety}</p> : null}<details><summary>{t.coverageDetails}<span className="disclosure-icon" aria-hidden="true" /></summary>{catalogEntry(place.id) ? <CatalogCoverage placeId={place.id} t={t} /> : <p>{place.kind === 'system' ? t.coverage : t.catalogWaterbody}</p>}</details><section className="next-step"><h2>{t.nextStep}</h2>
        {place.kind === 'lake' ? <AdeqGuidance t={t} /> : <><h3>{t.guidance}</h3>{records.some(n => n.guidance) ? records.filter(n => n.guidance).map(n => <blockquote key={n.id}>{n.guidance!.quote}<SourceLink url={n.guidance!.url}>{t.sourceLink}</SourceLink></blockquote>) : <p>{t.guidanceGap}</p>}</>}
        <div className="actions"><SourceLink url={linkedNotice?.url ?? records[0]?.url ?? SOURCES[place.kind === 'system' ? 'ADH' : 'ADEQ']}>{t.sourceLink}</SourceLink>{records.map(n => <button className="secondary" key={n.id} onClick={() => onShare(n)}>{t.share}{records.length > 1 ? ` · ${n.area}` : ''}</button>)}</div>
        <p className="quiet-note">{t.recordsLanguage}</p>
        {place.kind === 'system' ? <BoilWaterGuidance key={`${place.id}:${linkedNotice?.id ?? 'current'}:${status.state}`} current={!linkedNotice && status.state === 'active'} language={language} /> : null}
      </section>
    </div><aside><Panel className="detail-disclosures">
      <details open><summary>{t.noticeDetails}<span className="disclosure-icon" aria-hidden="true" /></summary>{records.map(n => <dl key={n.id}>
        {records.length > 1 ? <div className="date-row"><dt>{t.affected}</dt><dd>{n.area}</dd></div> : null}
        {n.issued ? <DateRow label={t.issued} value={n.issued} /> : <div className="date-row"><dt>{t.issued}</dt><dd>{t.unknown}</dd></div>}<AgencyLiftRow notice={n} t={t} />
        {place.kind === 'system' && !n.lifted ? <div className="date-row"><dt>{t.agencyLifted}</dt><dd>{language === 'es' ? 'No se publica fecha de levantamiento en este registro. No hay fecha de finalización verificada; consulte al proveedor.' : 'No agency lift date is published in this record. No verified end time is available; check with the provider.'}</dd></div> : null}
        <div className="date-row"><dt>{t.source}</dt><dd><SourceLink url={n.url}>{n.agency}</SourceLink></dd></div>
      </dl>)}</details>
      <details><summary>{t.observationDetails}<span className="disclosure-icon" aria-hidden="true" /></summary>{records.map(n => <dl key={n.id}><DateRow label={t.sourceUpdated} value={n.sourceUpdatedAt} /><DateRow label={t.firstObserved} value={n.firstObservedAt} app language={language} zoneId={place.kind !== 'system'} /><DateRow label={t.lastObserved} value={n.lastObservedAt} app language={language} zoneId={place.kind !== 'system'} /></dl>)}<p className="quiet-note">{t.observationMeaning}</p><dl><DateRow label={t.checked} value={source?.retrievedAt} app language={language} zoneId={place.kind !== 'system'} /></dl></details>
      {place.kind === 'system' ? <SourceCheckHistory place={place} source={source} unavailable={unavailable} t={t} language={language} compact /> : null}
      <details><summary>{t.originalText}<span className="disclosure-icon" aria-hidden="true" /></summary>{records.length ? records.map(n => <div key={n.id}><p>{n.area}</p>{n.reason ? <p>{n.reason}</p> : null}<p>{t.recordsLanguage}</p><SourceLink url={n.url}>{t.sourceLink}</SourceLink></div>) : <p>{t.noHistory}</p>}</details>
      <details><summary>{t.reviewAlerts}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.disconnected}</p><button className="primary full" onClick={onAlerts}>{t.lift}</button></details>
    </Panel></aside></div>
  </>
}
