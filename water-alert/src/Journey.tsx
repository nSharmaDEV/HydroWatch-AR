import { useId, useLayoutEffect, useRef } from 'react'
import './welcome.css'
import { STRIP_HEIGHT, STRIP_MAX_STEP_MS, STRIP_SPEED, STRIP_WIDTH, blendedStripPaths, cubicBezier, stripPaths } from './welcome-strip'
import { SOURCES, resolvePlaces, type Place } from './domain'
import { CatalogCoverage, Icon, Panel, SourceLink } from './components'
import { directorySystem, epaRecordUrl } from './water-system-directory'
import type { Strings } from './strings'
import { supplierCounty, supplierName } from './supplier-display'
import { catalogEntry } from './place-catalog'
import { lookupZip, type ZipIndex } from './zip-suppliers'
import { ZipSupplierResults } from './ZipSupplierResults'

// The WAVE logo's teal and aqua bands as one continuous strip flowing right to left (geometry in
// welcome-strip.ts). Paths are updated through refs each frame, not React state. Under reduced
// motion (or if it changes to reduced) the strip is drawn once and stays still. `still` draws it
// once and never animates (Settings and History, where the controls should get attention first),
// always from the same fixed seed so the still strip has one identical shape on every page/visit.
export const STILL_STRIP_SEED = 0x5a7e
// A flowing strip that replaces another within a moment (Home hero -> supplier search, search ->
// confirm) continues the same shape and position, so the page-change morph between them is one
// continuous wave rather than two unrelated ones.
const STRIP_HANDOFF_MS = 1000
let stripHandoff: { seed: number; offset: number; at: number } | undefined
// Supplier confirm -> Places "settle" morph (html[data-wave-strip=settle], interface-motion.css):
// the still Places strip starts as the confirm strip's shape and brightness and, in step with the
// page-change move (the new side of a view transition is live), reshapes into its fixed shape and
// dims, so one wave travels into place and ends clear of the Places sidebar text. Progress follows
// the move's own animation (so pausing or skipping it is respected), with the move's curve.
const SETTLE_FROM_OPACITY = '.64'
const settleEase = cubicBezier(.31, .24, .14, 1)
function settleStrip(svg: SVGSVGElement, aqua: SVGPathElement | null, teal: SVGPathElement | null, from: { seed: number; offset: number }, to: { seed: number; offset: number }) {
  const root = document.documentElement
  const finalOpacity = Number(getComputedStyle(svg).opacity)
  let frame = 0, seen = false
  const begun = performance.now()
  const draw = (t: number) => {
    const eased = settleEase(t)
    const paths = blendedStripPaths(from, to, eased)
    aqua?.setAttribute('d', paths.aqua)
    teal?.setAttribute('d', paths.teal)
    svg.style.opacity = t >= 1 ? '' : String(Number(SETTLE_FROM_OPACITY) + (finalOpacity - Number(SETTLE_FROM_OPACITY)) * eased)
  }
  const move = () => document.getAnimations().find(a => a.effect instanceof KeyframeEffect && a.effect.pseudoElement === '::view-transition-group(wave-strip)')
  const step = () => {
    const animation = move()
    if (animation) seen = true
    const progress = animation?.effect?.getComputedTiming().progress
    // Done once the move has ended or been skipped, or if it never started.
    const done = root.dataset.waveStrip !== 'settle' || (seen && !animation) || (!seen && performance.now() - begun > STRIP_HANDOFF_MS)
    draw(done ? 1 : animation && typeof progress === 'number' ? progress : 0)
    if (!done) frame = requestAnimationFrame(step)
  }
  draw(0)
  frame = requestAnimationFrame(step)
  return () => { cancelAnimationFrame(frame); draw(1) }
}
export function WelcomeStrip({ still = false }: { still?: boolean } = {}) {
  const id = useId().replace(/:/g, '')
  const aqua = useRef<SVGPathElement>(null)
  const teal = useRef<SVGPathElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  // Layout effect: the path is drawn before a page-change snapshot of the new page is taken.
  useLayoutEffect(() => {
    const recent = stripHandoff && performance.now() - stripHandoff.at < STRIP_HANDOFF_MS ? stripHandoff : undefined
    const handoff = still ? undefined : recent
    const settleFrom = still && document.documentElement.dataset.waveStrip === 'settle' ? recent : undefined
    const seed = still ? STILL_STRIP_SEED : handoff?.seed ?? Math.floor(Math.random() * 0x100000000)
    let offset = handoff?.offset ?? 0, previous: number | undefined, frame = 0
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
    if (settleFrom && svg.current) return settleStrip(svg.current, aqua.current, teal.current, settleFrom, { offset, seed })
    draw()
    if (still) return
    sync()
    motion?.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { cancelAnimationFrame(frame); motion?.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); stripHandoff = { seed, offset, at: performance.now() } }
  }, [still])
  return <div className={still ? 'welcome-strip welcome-strip--still' : 'welcome-strip'} aria-hidden="true">
    <svg ref={svg} viewBox={`0 0 ${STRIP_WIDTH} ${STRIP_HEIGHT}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-teal`} x2="0" y2="1"><stop stopColor="#009eae" /><stop offset="1" stopColor="#00647e" /></linearGradient>
        <linearGradient id={`${id}-aqua`} x2="0" y2="1"><stop stopColor="#57ffea" /><stop offset="1" stopColor="#00c8ce" /></linearGradient>
      </defs>
      <path ref={aqua} className="welcome-band welcome-band--aqua" fill={`url(#${id}-aqua)`} stroke={`url(#${id}-aqua)`} strokeWidth="0" />
      <path ref={teal} className="welcome-band welcome-band--teal" fill={`url(#${id}-teal)`} stroke={`url(#${id}-teal)`} strokeWidth="0" />
    </svg>
  </div>
}

// Name search shows three matches; typing narrows the list. ZIP suggestions separately
// expose all mapped candidates in an internally scrollable alphabetical list.
const SEARCH_RESULT_LIMIT = 3

export function SearchPlace({ kind, places, query, t, onQuery, onSelect, onBack, heading, intro, enableZip = true, zipIndex = null }: { kind: Place['kind']; places: Place[]; query: string; t: Strings; onQuery: (q: string) => void; onSelect: (p: Place) => void; onBack: () => void; heading?: string; intro?: string; enableZip?: boolean; zipIndex?: ZipIndex | null }) {
  const input = useRef<HTMLInputElement>(null)
  const system = kind === 'system'
  const zipResult = system && enableZip ? lookupZip(query, zipIndex) : null
  const zipSearch = zipResult && zipResult.state !== 'not-zip'
  const matches = resolvePlaces(query, places).filter(p => p.kind === kind)
  // Population is directory metadata, not popularity, service-area or safety evidence.
  // Only reorder empty supplier searches; preserve query relevance and sample-only lists.
  const largeSuppliers = system && !query.trim() && matches.some(p => directorySystem(p.id)?.population)
  if (largeSuppliers) matches.sort((a, b) => (directorySystem(b.id)?.population ?? 0) - (directorySystem(a.id)?.population ?? 0) || a.name.localeCompare(b.name))
  const noMatch = !zipSearch && !!query.trim() && !matches.length
  const searchLabel = system ? enableZip ? t.supplierZipSearch : t.supplierSearch : t.lakeSearch
  // The flowing WAVE strip behind a frosted version of the search card.
  return <div className={`search-stage${zipSearch ? ' zip-search-stage' : ''}`}>
    <WelcomeStrip />
    <Panel className="journey-panel search-glass">
    <button className="back" onClick={onBack}><Icon name="chevron-left" size={18} />{t.backStep}</button>
    <h1>{noMatch ? system ? t.noSupplier : t.noLake : heading ?? (system ? t.findSupplier : t.findLake)}</h1>
    <p>{intro ?? (system ? t.supplierIntro : t.lakeIntro)}</p>
    <label className="sr-only" htmlFor="place-search">{searchLabel}</label>
    <div className="search-field"><Icon name="search" /><input ref={input} id="place-search" name="place-search" type="search" autoComplete="off" value={query} placeholder={searchLabel} onChange={e => onQuery(e.target.value)} /></div>
    {zipSearch ? <ZipSupplierResults result={zipResult} places={places} onSelect={onSelect} onNameSearch={() => { onQuery(''); input.current?.focus() }} t={t} checkedOn={zipIndex?.provenance?.checkedOn} /> : <div className="search-results" aria-live="polite">
      {system && matches.length > 0 && !largeSuppliers ? <div className="directory-match-heading"><strong>{t.directoryMatches}</strong><p>{t.directoryMatchHint}</p></div> : null}
      {matches.slice(0, SEARCH_RESULT_LIMIT).map(p => <div className="place-row" key={p.id}><div><h2 title={p.name}>{system ? supplierName(p.name) : supplierCounty(p.name)}</h2><p>{supplierCounty(p.county)} · {system ? directorySystem(p.id) ? `PWS ID ${directorySystem(p.id)!.pwsid}` : 'ADH' : 'ADEQ'}</p></div><button className="primary" aria-label={`${t.select} ${p.name}`} onClick={() => onSelect(p)}>{t.select}</button></div>)}
      {!matches.length ? <p>{t.noResults}</p> : null}
    </div>}
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
    <div className="confirm-place"><h2>{place.kind === 'system' ? supplierName(place.name) : supplierCounty(place.name)}</h2><p>{supplierCounty(place.county)}</p><p>{t.source}: {place.kind === 'system' ? 'ADH' : 'ADEQ'}</p>{place.kind === 'system' && directorySystem(place.id) ? <p>PWS ID {directorySystem(place.id)!.pwsid} · <a href={epaRecordUrl(directorySystem(place.id)!.pwsid)} target="_blank" rel="noreferrer">EPA</a></p> : null}</div>
    <p>{place.kind === 'system' ? t.confirmBill : t.confirmArea}</p><details><summary>{t.coverageDetails}<span className="disclosure-icon" aria-hidden="true" /></summary>{catalogEntry(place.id) ? <CatalogCoverage placeId={place.id} t={t} /> : <><p>{place.kind === 'system' ? t.coverage : t.catalogWaterbody}</p><SourceLink url={SOURCES[place.kind === 'system' ? 'ADH' : 'ADEQ']}>{t.sourceLink}</SourceLink></>}</details><button className="primary full" onClick={onConfirm}>{t.confirmWatch}</button><button className="secondary full" onClick={onBack}>{t.differentPlace}</button>
    </Panel>
  </div>
}

export function SampleIntro({ t, onStart, onList }: { t: Strings; onStart: () => void; onList: () => void }) {
  return <Panel className="journey-panel"><h1>{t.sampleJourney}</h1><p>{t.sampleText}</p><button className="primary full" onClick={onStart}>{t.startSample}</button><button className="text-button full" onClick={onList}>{t.sampleList}</button></Panel>
}
