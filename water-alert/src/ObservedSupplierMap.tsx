import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { statusFor, type Language, type Notice, type Place, type SourceSnapshot } from './domain'
import { DateRow } from './components'
import { unavailableReason } from './source-checks'
import { SUPPLIER_LOCATIONS, projectArkansas } from './supplier-locations'
import { ARKANSAS_OUTLINE } from './arkansas-outline'
import { mapEn, mapEs } from './map-strings'
import { MapSupplierDetails } from './MapSupplierDetails'
import { noticeMatchesPlace } from './place-catalog'
import type { Strings } from './strings'
import './observed-map.css'

const locations = new Map(SUPPLIER_LOCATIONS.map(point => [point.placeId, point]))
type StatusFilter = 'all' | 'active' | 'none' | 'unavailable' | 'stale'

export function ObservedSupplierMap({ archive, watches, places, sources, now, t, language, coverageStart, active }: {
  archive: Notice[]; watches: string[]; places: Place[]; sources: SourceSnapshot[]; now: number; t: Strings; language: Language; coverageStart: string | null; active: boolean
}) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'mine'>('all')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [view, setView] = useState<'map' | 'list'>('map')
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState({ x: 310, y: 270 })
  const [selected, setSelected] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 760px)').matches ?? false)
  const dialog = useRef<HTMLDialogElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const trigger = useRef<Element | null>(null)
  const restoreFocus = useRef(false)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const id = useId()
  const m = language === 'es' ? mapEs : mapEn
  const labels = { active: m.mapActive, none: m.mapNone, unavailable: m.mapUnavailable, stale: m.mapStale }
  const source = sources.find(s => s.agency === 'ADH')
  const reason = unavailableReason(source, now)
  const checkExplanation = { offline: t.checkOffline, never: t.checkNever, format: t.checkFormatFailed, failed: t.checkRetrievalFailed, stale: t.checkStale, unconfirmed: t.checkUnconfirmed }[reason]
  const observed = new Map<string, Place>()
  const directory = new Map(places.map(p => [p.id, p]))
  for (const n of archive) {
    if (n.agency !== 'ADH' || n.kind !== 'boil') continue
    // A verified exact affected-area association may identify a different supplier than the agency System cell.
    const matches = places.filter(p => p.kind === 'system' && noticeMatchesPlace(p.id, n))
    for (const p of matches.length ? matches : [directory.get(n.placeId) ?? { id: n.placeId, name: n.name, county: n.county, kind: 'system' as const }]) observed.set(p.id, p)
  }
  const q = query.trim().toLocaleLowerCase()
  const suppliers = [...observed.values()].map(place => {
    const status = statusFor(place.id, source, now)
    const state = status.state === 'unavailable' && reason === 'stale' ? 'stale' : status.state
    return { place, state, label: labels[state], point: locations.get(place.id) }
  }).filter(({ place, state }) => (scope === 'all' || watches.includes(place.id)) && (filter === 'all' || state === filter) && (!q || [place.name, place.county].some(s => s.toLocaleLowerCase().includes(q))))
    .sort((a, b) => Number(b.state === 'active') - Number(a.state === 'active') || a.place.name.localeCompare(b.place.name))
  const mapped = suppliers.filter(p => p.point)
  const selection = suppliers.find(s => s.place.id === selected)
  const showDetails = detailsOpen && !!selection
  const width = 620 / zoom, height = 540 / zoom
  const viewBox = `${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 760px)')
    if (!media) return
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useLayoutEffect(() => {
    const modal = dialog.current
    if (showDetails && mobile && active) {
      if (!modal?.open) { modal?.showModal(); modal?.querySelector('button')?.focus({ preventScroll: true }) }
      const overflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { modal?.close(); document.body.style.overflow = overflow }
    }
    if (showDetails && !mobile && active) back.current?.focus({ preventScroll: true })
    if (restoreFocus.current && !showDetails) {
      ;(trigger.current as HTMLElement | SVGElement | null)?.focus({ preventScroll: true })
      restoreFocus.current = false
    }
  }, [showDetails, mobile, active, selected])
  function select(place: Place, element: Element) { trigger.current = element; setSelected(place.id); setDetailsOpen(true) }
  function closeDetails() { restoreFocus.current = true; setDetailsOpen(false) }
  function changeFilter() { setDetailsOpen(false) }
  const details = selection ? <MapSupplierDetails key={selection.place.id} {...selection} archive={archive} source={source} now={now} t={t} language={language} /> : null

  return <section className="observed-map">
    <div className="map-toolbar">
      <label className="map-search"><span className="sr-only">{m.mapSearch}</span><input type="search" placeholder={m.mapSearch} value={query} onChange={e => { setQuery(e.target.value); changeFilter() }} /></label>
      <div className="map-scope" role="group" aria-label={t.myPlaces}><button aria-pressed={scope === 'mine'} onClick={() => { setScope('mine'); changeFilter() }}>{t.myPlaces}</button><button aria-pressed={scope === 'all'} onClick={() => { setScope('all'); changeFilter() }}>{m.allPlaces}</button></div>
      <label className="map-status-filter"><span>{m.status}</span><select value={filter} onChange={e => { setFilter(e.target.value as StatusFilter); changeFilter() }}><option value="all">{m.allStatuses}</option>{Object.entries(labels).map(([state, label]) => <option key={state} value={state}>{label}</option>)}</select></label>
    </div>
    <div className="map-mobile-tabs" role="group" aria-label={m.view}><button aria-pressed={view === 'map'} onClick={() => setView('map')}>{m.map}</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>{m.list}</button></div>
    <div className={`map-workspace mobile-${view}`}>
      <div className="map-geography">
        <div className="map-legend" aria-label={m.legend}>{Object.entries(labels).map(([state, label]) => <span key={state}><span className={`map-status-dot ${state}`} aria-hidden="true" />{label}</span>)}</div>
        <div className="map-canvas">
          <div className="map-controls"><button className="secondary" aria-label={m.mapZoomIn} disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .5))}>+</button><button className="secondary" aria-label={m.mapZoomOut} disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .5))}>−</button><button className="secondary" onClick={() => { setZoom(1); setCenter({ x: 310, y: 270 }) }}>{m.mapReset}</button></div>
          <svg viewBox={viewBox} role="group" tabIndex={0} aria-label={m.mapTitle} aria-describedby={`${id}-pan`} className="supplier-map-svg"
            onKeyDown={e => { const offset = { ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] }[e.key]; if (offset) { e.preventDefault(); setCenter(c => ({ x: c.x + offset[0] / zoom, y: c.y + offset[1] / zoom })) } }}
            onPointerDown={e => { if ((e.target as Element).closest('.supplier-marker') || e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, cx: center.x, cy: center.y }; e.currentTarget.setPointerCapture(e.pointerId) }}
            onPointerMove={e => { if (!drag.current) return; const scale = Math.min(e.currentTarget.clientWidth / width, e.currentTarget.clientHeight / height); setCenter({ x: drag.current.cx - (e.clientX - drag.current.x) / scale, y: drag.current.cy - (e.clientY - drag.current.y) / scale }) }}
            onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
            <path d={ARKANSAS_OUTLINE} className="arkansas-outline" aria-hidden="true" />
            {mapped.map(({ place, point, state, label }) => {
              const { x, y } = projectArkansas(point!.longitude, point!.latitude)
              return <g key={place.id} role="button" tabIndex={0} aria-pressed={place.id === selected} aria-label={`${place.name}, ${place.county}: ${label}. ${m.mapView}`} className={`supplier-marker ${state}`} transform={`translate(${x} ${y}) scale(${1 / zoom})`} onClick={e => select(place, e.currentTarget)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(place, e.currentTarget) } }}>
                <title>{place.name}: {label}</title><circle r="22" className="marker-hit" /><circle r="17" className="marker-pulse" /><circle r="10" className="marker-core" /><path d="M-4,0 L4,0" className="marker-symbol" />
              </g>
            })}
          </svg>
          <p className="map-count" role="status">{mapped.length} / {suppliers.length} {m.mapCount}</p>
        </div>
        <p id={`${id}-pan`} className="sr-only">{m.pan}</p>
        {!mapped.length ? <p className="map-no-points">{m.mapNoPoints}</p> : null}
      </div>
      <div className="map-side-panel">
        <section className="map-results" aria-label={m.results} hidden={!mobile && showDetails}>
          <h2>{m.results} <span role="status">({suppliers.length})</span></h2>
          {!suppliers.length ? <p role="status">{m.mapNoMatches}</p> : null}
          <ul className="map-supplier-list">{suppliers.map(({ place, state, label, point }) => <li key={place.id}><button aria-pressed={place.id === selected} onClick={e => select(place, e.currentTarget)} className="map-supplier-button"><span className={`map-status-dot ${state}`} aria-hidden="true" /><span><strong>{place.name}</strong><span>{place.county}</span><span className={state === 'active' ? 'map-active-label' : undefined}>{label}</span>{!point ? <span>{m.locationUnavailable}</span> : null}</span><span aria-hidden="true">›</span></button></li>)}</ul>
          <div className="map-freshness"><dl><DateRow label={t.successfulCheck} value={source?.lastSuccessAt} app language={language} /><DateRow label={t.since} value={coverageStart} app language={language} /></dl>{!source?.lastSuccessAt ? <p>{t.noSuccessfulCheck}</p> : null}{statusFor('', source, now).state === 'unavailable' ? <p>{checkExplanation}</p> : null}</div>
        </section>
        {!mobile && showDetails ? <section className="map-details" aria-label={selection?.place.name}><button ref={back} className="map-back" onClick={closeDetails}>‹ {m.back}</button>{details}</section> : null}
      </div>
    </div>
    <p className="map-boundary-note">{m.boundary}</p><p className="map-safety-note">{m.mapNoSafety}</p>
    <dialog ref={dialog} className="map-detail-sheet" aria-label={selection?.place.name} onKeyDown={e => {
      if (e.key !== 'Tab') return
      const focusable = e.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }} onCancel={e => { e.preventDefault(); closeDetails() }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right) closeDetails() } }}>
      <div className="map-sheet-heading"><button className="map-back" onClick={closeDetails}>‹ {m.back}</button><button className="map-sheet-close" aria-label={m.close} onClick={closeDetails}>×</button></div>
      {mobile && showDetails ? details : null}
    </dialog>
  </section>
}
