import { useEffect, useId, useRef, useState } from 'react'
import './welcome.css'
import { STRIP_HEIGHT, STRIP_MAX_STEP_MS, STRIP_SPEED, STRIP_WIDTH, stripPaths } from './welcome-strip'
import { SOURCES, resolvePlaces, type Place } from './domain'
import { CatalogCoverage, Icon, Panel, SourceLink } from './components'
import type { Strings } from './strings'
import { supplierCounty } from './supplier-display'
import { catalogEntry } from './place-catalog'

export function Welcome({ t, onSearch, onWell, onSample }: { t: Strings; onSearch: (kind: Place['kind']) => void; onWell: () => void; onSample: () => void }) {
  // One centred column: question, subtitle, the three choices, then the safety note. The wave
  // strip runs full width behind the frosted card and is decoration only.
  return <div className="welcome-stage">
    <WelcomeStrip />
    <Panel className="welcome">
      <h1 className="welcome-title">{t.welcome}</h1>
      <p className="welcome-subtitle">{t.welcomeSubtitle}</p>
      <div className="welcome-options">
        <button className="welcome-option welcome-option--primary" onClick={() => onSearch('system')}><span className="welcome-option-icon"><Icon name="water" /></span><span className="welcome-option-text"><b>{t.supplierChoice}</b><small>{t.supplierHelp}</small></span><span className="welcome-option-arrow" aria-hidden="true">›</span></button>
        <button className="welcome-option welcome-option--secondary" onClick={onWell}><span className="welcome-option-text">{t.privateWell}</span><span className="welcome-option-arrow" aria-hidden="true">›</span></button>
        <button className="welcome-option welcome-option--sample" onClick={onSample}><span className="welcome-option-text">{t.trySample}</span><span className="welcome-option-arrow" aria-hidden="true">›</span></button>
      </div>
      <p className="quiet-note">{t.shortLimit}</p>
    </Panel>
  </div>
}

// The WAVE logo's teal and aqua bands as one continuous strip flowing right to left (geometry in
// welcome-strip.ts). Paths are updated through refs each frame, not React state. Under reduced
// motion (or if it changes to reduced) the strip is drawn once and stays still.
function WelcomeStrip() {
  const id = useId().replace(/:/g, '')
  const aqua = useRef<SVGPathElement>(null)
  const teal = useRef<SVGPathElement>(null)
  useEffect(() => {
    const seed = Math.floor(Math.random() * 0x100000000)
    let offset = 0, previous: number | undefined, frame = 0
    const draw = () => {
      const paths = stripPaths(offset, seed)
      aqua.current?.setAttribute('d', paths.aqua)
      teal.current?.setAttribute('d', paths.teal)
    }
    const animate = (now: number) => {
      if (previous !== undefined) offset += Math.min(now - previous, STRIP_MAX_STEP_MS) * STRIP_SPEED
      previous = now
      draw()
      frame = requestAnimationFrame(animate)
    }
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const sync = () => {
      cancelAnimationFrame(frame)
      previous = undefined
      // Unknown motion preference or reduced motion: a still strip.
      if (motion && !motion.matches && !document.hidden) frame = requestAnimationFrame(animate)
    }
    draw()
    sync()
    motion?.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { cancelAnimationFrame(frame); motion?.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync) }
  }, [])
  return <div className="welcome-strip" aria-hidden="true">
    <svg viewBox={`0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-teal`} x2="0" y2="1"><stop stopColor="#009eae" /><stop offset="1" stopColor="#00647e" /></linearGradient>
        <linearGradient id={`${id}-aqua`} x2="0" y2="1"><stop stopColor="#57ffea" /><stop offset="1" stopColor="#00c8ce" /></linearGradient>
      </defs>
      <path ref={aqua} className="welcome-band welcome-band--aqua" fill={`url(#${id}-aqua)`} />
      <path ref={teal} className="welcome-band welcome-band--teal" fill={`url(#${id}-teal)`} />
    </svg>
  </div>
}

export function SearchPlace({ kind, places, query, t, onQuery, onSelect, onBack, heading, intro }: { kind: Place['kind']; places: Place[]; query: string; t: Strings; onQuery: (q: string) => void; onSelect: (p: Place) => void; onBack: () => void; heading?: string; intro?: string }) {
  const [limit, setLimit] = useState(5)
  const input = useRef<HTMLInputElement>(null)
  const system = kind === 'system'
  const matches = resolvePlaces(query, places).filter(p => p.kind === kind)
  const noMatch = !!query.trim() && !matches.length
  return <Panel className="journey-panel">
    <button className="back" onClick={onBack}>‹ {t.backStep}</button>
    <h1>{noMatch ? system ? t.noSupplier : t.noLake : heading ?? (system ? t.findSupplier : t.findLake)}</h1>
    <p>{intro ?? (system ? t.supplierIntro : t.lakeIntro)}</p>
    <label className="sr-only" htmlFor="place-search">{system ? t.supplierSearch : t.lakeSearch}</label>
    <div className="search-field"><Icon name="search" /><input ref={input} id="place-search" name="place-search" type="search" autoComplete="off" value={query} placeholder={system ? t.supplierSearch : t.lakeSearch} onChange={e => { setLimit(5); onQuery(e.target.value) }} /></div>
    {query && system && matches.length > 1 ? <p className="info">{t.ambiguous}</p> : null}
    <div className="search-results" aria-live="polite">
      {matches.slice(0, limit).map(p => <div className="place-row" key={p.id}><div><h2>{supplierCounty(p.name)}</h2><p>{supplierCounty(p.county)} · {system ? 'ADH' : 'ADEQ'}</p></div><button className="primary" aria-label={`${t.select} ${p.name}`} onClick={() => onSelect(p)}>{t.select}</button></div>)}
      {!matches.length ? <p>{t.noResults}</p> : null}
    </div>
    {matches.length > limit ? <button className="text-button" onClick={() => setLimit(n => n + 5)}>{t.moreMatches} <span aria-hidden="true">⌄</span></button> : null}
    <p className="quiet-note">{noMatch ? t.noAdvisoryMeaning : t.limitedCatalog}</p>
    {noMatch ? <SourceLink url={SOURCES[system ? 'ADH' : 'ADEQ']}>{system ? t.checkADH : t.checkADEQ}</SourceLink> : null}
    <details><summary>{t.coverageDetails}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.catalogHelp}</p><p>{system ? t.catalogSupplier : t.catalogWaterbody}</p>{!noMatch ? <SourceLink url={SOURCES[system ? 'ADH' : 'ADEQ']}>{system ? t.checkADH : t.checkADEQ}</SourceLink> : null}</details>
    {noMatch ? <button className="secondary full" onClick={() => { input.current?.focus(); input.current?.select() }}>{t.editSearch}</button> : null}
  </Panel>
}

export function ConfirmPlace({ place, t, onConfirm, onBack }: { place: Place; t: Strings; onConfirm: () => void; onBack: () => void }) {
  return <Panel className="journey-panel"><button className="back" onClick={onBack}>‹ {t.backStep}</button><h1>{place.kind === 'system' ? t.confirmSupplier : t.confirmLake}</h1>
    <div className="confirm-place"><h2>{supplierCounty(place.name)}</h2><p>{supplierCounty(place.county)}</p><p>{t.source}: {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p></div>
    <p>{place.kind === 'system' ? t.confirmBill : t.confirmArea}</p><details><summary>{t.coverageDetails}<span className="disclosure-icon" aria-hidden="true" /></summary>{catalogEntry(place.id) ? <CatalogCoverage placeId={place.id} t={t} /> : <><p>{place.kind === 'system' ? t.coverage : t.catalogWaterbody}</p><SourceLink url={SOURCES[place.kind === 'system' ? 'ADH' : 'ADEQ']}>{t.sourceLink}</SourceLink></>}</details><button className="primary full" onClick={onConfirm}>{t.confirmWatch}</button><button className="secondary full" onClick={onBack}>{t.differentPlace}</button>
  </Panel>
}

export function PrivateWell({ t, onBack }: { t: Strings; onBack: () => void }) {
  return <Panel className="journey-panel"><button className="back" onClick={onBack}>‹ {t.backStep}</button><h1>{t.wellInfo}</h1><p>{t.wellText}</p><SourceLink url={SOURCES.ADH}>{t.checkADH}</SourceLink><p className="info">{t.limits}</p></Panel>
}

export function SampleIntro({ t, onStart, onList }: { t: Strings; onStart: () => void; onList: () => void }) {
  return <Panel className="journey-panel"><h1>{t.sampleJourney}</h1><p>{t.sampleText}</p><button className="primary full" onClick={onStart}>{t.startSample}</button><button className="text-button full" onClick={onList}>{t.sampleList}</button></Panel>
}
