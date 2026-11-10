import type { Place } from './domain'
import type { Strings } from './strings'
import type { ZipLookup } from './zip-suppliers'
import { supplierName } from './supplier-display'

export function ZipSupplierResults({ result, places, onSelect, onNameSearch, t, checkedOn }: {
  result: ZipLookup; places: Place[]
  onSelect: (place: Place) => void; onNameSearch: () => void; t: Strings; checkedOn?: string
}) {
  const byId = new Map(places.filter(p => p.kind === 'system').map(p => [p.id, p]))
  // Do not turn a directory/index mismatch into a silently truncated candidate list.
  const unavailable = result.state === 'unavailable' || result.candidates.some(s => !byId.has(s.placeId))
  const candidates = unavailable ? [] : result.candidates
  return <>
    <div className="zip-results" role="region" aria-label={t.zipPagination} tabIndex={candidates.length ? 0 : undefined} aria-live="polite" aria-atomic="false">
      {candidates.length ? <>
        {candidates.map(s => <div className="place-row" key={s.pwsid}><div><h2 title={byId.get(s.placeId)!.name}>{supplierName(s.name)}</h2><p>PWS ID {s.pwsid}{s.boundarySource !== 'system-sourced' ? <> · {s.boundarySource === 'modeled' ? t.zipModeled : t.zipUnknownBoundary}</> : null}</p>{s.wholesale ? <p className="quiet-note">{t.zipWholesale}</p> : null}</div><button className="primary" aria-label={`${t.select} ${byId.get(s.placeId)!.name}`} onClick={() => onSelect(byId.get(s.placeId)!)}>{t.select}</button></div>)}
      </> : <p>{unavailable ? t.zipUnavailable : result.state === 'incomplete' || result.state === 'invalid' ? t.zipInputHint : t.zipNoMatch}</p>}
    </div>
    <details className="zip-provenance"><summary>{t.zipSources}<span className="disclosure-icon" aria-hidden="true" /></summary>
      <button className="text-button zip-fallback" onClick={onNameSearch}>{t.zipFallback}</button>
      <p>{t.zipCaution}</p>
      <p>{t.zipSourceExplanation}</p>
      {checkedOn ? <p>{t.zipSnapshotDate}: <time dateTime={checkedOn}>{checkedOn}</time></p> : null}
      <p><a href="https://www.epa.gov/ground-water-and-drinking-water/public-water-system-service-areas" target="_blank" rel="noopener noreferrer">EPA</a> · <a href="https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html" target="_blank" rel="noopener noreferrer">Census ZCTA (2020)</a></p>
      <ul>{candidates.map(s => <li key={s.pwsid}>{supplierName(s.name)}: {s.providers.join(', ') || t.zipUnknownBoundary} · {s.boundaryDates.join(', ') || t.zipUnknownBoundary}</li>)}</ul>
    </details>
  </>
}
