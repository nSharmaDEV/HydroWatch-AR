import { useEffect, useId, useRef } from 'react'
import './welcome.css'
import { STRIP_HEIGHT, STRIP_MAX_STEP_MS, STRIP_SPEED, STRIP_WIDTH, stripPaths } from './welcome-strip'
import { SOURCES, resolvePlaces, type Place } from './domain'
import { CatalogCoverage, Icon, Panel, SourceLink } from './components'
import type { Strings } from './strings'
import { supplierCounty } from './supplier-display'
import { catalogEntry } from './place-catalog'

// The WAVE logo's teal and aqua bands as one continuous strip flowing right to left (geometry in
// welcome-strip.ts). Paths are updated through refs each frame, not React state. Under reduced
// motion (or if it changes to reduced) the strip is drawn once and stays still. `still` draws it
// once and never animates (Settings and History, where the controls should get attention first),
// always from the same fixed seed so the still strip has one identical shape on every page/visit.
export const STILL_STRIP_SEED = 0x5a7e
export function WelcomeStrip({ still = false }: { still?: boolean } = {}) {
  const id = useId().replace(/:/g, '')
  const aqua = useRef<SVGPathElement>(null)
  const teal = useRef<SVGPathElement>(null)
  useEffect(() => {
    const seed = still ? STILL_STRIP_SEED : Math.floor(Math.random() * 0x100000000)
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
    if (still) return
    sync()
    motion?.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { cancelAnimationFrame(frame); motion?.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync) }
  }, [still])
  return <div className={still ? 'welcome-strip welcome-strip--still' : 'welcome-strip'} aria-hidden="true">
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

// The search card fits on one screen without scrolling: the top three matches, then coverage
// details. Typing narrows the list; there is no "show more".
const SEARCH_RESULT_LIMIT = 3

export function SearchPlace({ kind, places, query, t, onQuery, onSelect, onBack, heading, intro }: { kind: Place['kind']; places: Place[]; query: string; t: Strings; onQuery: (q: string) => void; onSelect: (p: Place) => void; onBack: () => void; heading?: string; intro?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const system = kind === 'system'
  const matches = resolvePlaces(query, places).filter(p => p.kind === kind)
  const noMatch = !!query.trim() && !matches.length
  // The flowing WAVE strip behind a frosted version of the search card.
  return <div className="search-stage">
    <WelcomeStrip />
    <Panel className="journey-panel search-glass">
    <button className="back" onClick={onBack}><Icon name="chevron-left" size={18} />{t.backStep}</button>
    <h1>{noMatch ? system ? t.noSupplier : t.noLake : heading ?? (system ? t.findSupplier : t.findLake)}</h1>
    <p>{intro ?? (system ? t.supplierIntro : t.lakeIntro)}</p>
    <label className="sr-only" htmlFor="place-search">{system ? t.supplierSearch : t.lakeSearch}</label>
    <div className="search-field"><Icon name="search" /><input ref={input} id="place-search" name="place-search" type="search" autoComplete="off" value={query} placeholder={system ? t.supplierSearch : t.lakeSearch} onChange={e => onQuery(e.target.value)} /></div>
    <div className="search-results" aria-live="polite">
      {matches.slice(0, SEARCH_RESULT_LIMIT).map(p => <div className="place-row" key={p.id}><div><h2>{supplierCounty(p.name)}</h2><p>{supplierCounty(p.county)} · {system ? 'ADH' : 'ADEQ'}</p></div><button className="primary" aria-label={`${t.select} ${p.name}`} onClick={() => onSelect(p)}>{t.select}</button></div>)}
      {!matches.length ? <p>{t.noResults}</p> : null}
    </div>
    {noMatch ? <p className="quiet-note">{t.noAdvisoryMeaning}</p> : null}
    {noMatch ? <SourceLink url={SOURCES[system ? 'ADH' : 'ADEQ']}>{system ? t.checkADH : t.checkADEQ}</SourceLink> : null}
    <details><summary>{t.coverageDetails}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.limitedCatalog}</p><p>{t.catalogHelp}</p><p>{system ? t.catalogSupplier : t.catalogWaterbody}</p>{!noMatch ? <SourceLink url={SOURCES[system ? 'ADH' : 'ADEQ']}>{system ? t.checkADH : t.checkADEQ}</SourceLink> : null}</details>
    {noMatch ? <button className="secondary full" onClick={() => { input.current?.focus(); input.current?.select() }}>{t.editSearch}</button> : null}
    </Panel>
  </div>
}

export function ConfirmPlace({ place, t, onConfirm, onBack }: { place: Place; t: Strings; onConfirm: () => void; onBack: () => void }) {
  // Same flowing strip and frosted card as the search step that leads here.
  return <div className="search-stage">
    <WelcomeStrip />
    <Panel className="journey-panel search-glass confirm-glass"><button className="back" onClick={onBack}><Icon name="chevron-left" size={18} />{t.backStep}</button><h1>{place.kind === 'system' ? t.confirmSupplier : t.confirmLake}</h1>
    <div className="confirm-place"><h2>{supplierCounty(place.name)}</h2><p>{supplierCounty(place.county)}</p><p>{t.source}: {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p></div>
    <p>{place.kind === 'system' ? t.confirmBill : t.confirmArea}</p><details><summary>{t.coverageDetails}<span className="disclosure-icon" aria-hidden="true" /></summary>{catalogEntry(place.id) ? <CatalogCoverage placeId={place.id} t={t} /> : <><p>{place.kind === 'system' ? t.coverage : t.catalogWaterbody}</p><SourceLink url={SOURCES[place.kind === 'system' ? 'ADH' : 'ADEQ']}>{t.sourceLink}</SourceLink></>}</details><button className="primary full" onClick={onConfirm}>{t.confirmWatch}</button><button className="secondary full" onClick={onBack}>{t.differentPlace}</button>
    </Panel>
  </div>
}

export function SampleIntro({ t, onStart, onList }: { t: Strings; onStart: () => void; onList: () => void }) {
  return <Panel className="journey-panel"><h1>{t.sampleJourney}</h1><p>{t.sampleText}</p><button className="primary full" onClick={onStart}>{t.startSample}</button><button className="text-button full" onClick={onList}>{t.sampleList}</button></Panel>
}
