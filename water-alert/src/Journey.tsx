import { useRef, useState } from 'react'
import { SOURCES, resolvePlaces, type Place } from './domain'
import { CatalogCoverage, Icon, Panel, SourceLink } from './components'
import type { Strings } from './strings'

export function Welcome({ t, onSearch, onWell, onSample }: { t: Strings; onSearch: (kind: Place['kind']) => void; onWell: () => void; onSample: () => void }) {
  return <Panel className="journey-panel"><h1>{t.welcome}</h1><p>{t.welcomeQuestion}</p>
    <button className="choice" onClick={() => onSearch('system')}><span className="choice-icon"><Icon name="water" /></span><span><b>{t.supplierChoice}</b><small>{t.supplierHelp}</small></span><span aria-hidden="true">›</span></button>
    <button className="choice" onClick={() => onSearch('lake')}><span className="choice-icon"><Icon name="water" /></span><span><b>{t.lakeChoice}</b><small>{t.lakeHelp}</small></span><span aria-hidden="true">›</span></button>
    <div className="choice-links"><button onClick={onWell}>{t.privateWell}<span aria-hidden="true">›</span></button><button onClick={onSample}>{t.trySample}<span aria-hidden="true">›</span></button></div>
    <p className="info">{t.welcomeLimit}</p>
  </Panel>
}

export function SearchPlace({ kind, places, query, t, onQuery, onSelect, onBack }: { kind: Place['kind']; places: Place[]; query: string; t: Strings; onQuery: (q: string) => void; onSelect: (p: Place) => void; onBack: () => void }) {
  const [limit, setLimit] = useState(5)
  const input = useRef<HTMLInputElement>(null)
  const system = kind === 'system'
  const matches = resolvePlaces(query, places).filter(p => p.kind === kind)
  const noMatch = !!query.trim() && !matches.length
  return <Panel className="journey-panel">
    <button className="back" onClick={onBack}>‹ {t.backStep}</button>
    <h1>{noMatch ? system ? t.noSupplier : t.noLake : system ? t.findSupplier : t.findLake}</h1>
    <p>{system ? t.supplierIntro : t.lakeIntro}</p>
    <label className="sr-only" htmlFor="place-search">{system ? t.supplierSearch : t.lakeSearch}</label>
    <div className="search-field"><Icon name="search" /><input ref={input} id="place-search" name="place-search" type="search" autoComplete="off" value={query} placeholder={system ? t.supplierSearch : t.lakeSearch} onChange={e => { setLimit(5); onQuery(e.target.value) }} /></div>
    {query && system && matches.length > 1 ? <p className="info">{t.ambiguous}</p> : null}
    <div className="search-results" aria-live="polite">
      {matches.slice(0, limit).map(p => <div className="place-row" key={p.id}><div><h2>{p.name}</h2><p>{p.county} · {system ? 'ADH' : 'ADEQ'}</p></div><button className="primary" aria-label={`${t.select} ${p.name}`} onClick={() => onSelect(p)}>{t.select}</button></div>)}
      {!matches.length ? <p>{t.noResults}</p> : null}
    </div>
    {matches.length > limit ? <button className="text-button" onClick={() => setLimit(n => n + 5)}>{t.moreMatches} <span aria-hidden="true">⌄</span></button> : null}
    <div className="info"><p>{noMatch ? t.noAdvisoryMeaning : t.catalogHelp}</p><SourceLink url={SOURCES[system ? 'ADH' : 'ADEQ']}>{system ? t.checkADH : t.checkADEQ}</SourceLink></div>
    {noMatch ? <button className="secondary full" onClick={() => { input.current?.focus(); input.current?.select() }}>{t.editSearch}</button> : null}
  </Panel>
}

export function ConfirmPlace({ place, t, onConfirm, onBack }: { place: Place; t: Strings; onConfirm: () => void; onBack: () => void }) {
  return <Panel className="journey-panel"><button className="back" onClick={onBack}>‹ {t.backStep}</button><h1>{place.kind === 'system' ? t.confirmSupplier : t.confirmLake}</h1>
    <div className="confirm-place"><h2>{place.name}</h2><p>{place.county}</p><p>{t.source}: {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p></div>
    <p>{place.kind === 'system' ? t.confirmBill : t.confirmArea}</p><CatalogCoverage placeId={place.id} t={t} /><button className="primary full" onClick={onConfirm}>{t.confirmWatch}</button><button className="secondary full" onClick={onBack}>{t.differentPlace}</button>
  </Panel>
}

export function PrivateWell({ t, onBack, onLake }: { t: Strings; onBack: () => void; onLake: () => void }) {
  return <Panel className="journey-panel"><button className="back" onClick={onBack}>‹ {t.backStep}</button><h1>{t.wellInfo}</h1><p>{t.wellText}</p><SourceLink url={SOURCES.ADH}>{t.checkADH}</SourceLink><hr /><button className="choice" onClick={onLake}><span className="choice-icon"><Icon name="water" /></span><b>{t.lakeInstead}</b><span aria-hidden="true">›</span></button><p className="info">{t.limits}</p></Panel>
}

export function SampleIntro({ t, onStart, onList }: { t: Strings; onStart: () => void; onList: () => void }) {
  return <Panel className="journey-panel"><h1>{t.sampleJourney}</h1><p>{t.sampleJourneyText}</p><ol className="journey-steps">{[[t.sampleStep1, t.sampleStep1Text], [t.sampleStep2, t.sampleStep2Text], [t.sampleStep3, t.sampleStep3Text]].map(([title, text]) => <li key={title}><b>{title}</b><p>{text}</p></li>)}</ol><button className="primary full" onClick={onStart}>{t.startSample}</button><button className="text-button full" onClick={onList}>{t.sampleList}</button></Panel>
}
