import { useDeferredValue, useId, useRef, useState } from 'react'
import { resolvePlaces, type Place } from './domain'
import { loadPreferences } from './storage'
import type { HelpDraft } from './help-requests'

/** Resident descriptions, not verified addresses or service boundaries. */
export function RequestLocations({ draft, places, sample, es, edit }: { draft: HelpDraft; places: Place[]; sample: boolean; es: boolean; edit: (patch: Partial<HelpDraft>) => void }) {
  const [query, setQuery] = useState('')
  const listId = useId(), hintId = useId()
  const [open, setOpen] = useState(true), [active, setActive] = useState(-1)
  const search = useDeferredValue(query)
  const [watches] = useState(() => loadPreferences(sample ? 'sample' : 'live').watches)
  const selected = draft.locations ?? []
  const candidates = (search.trim() ? resolvePlaces(search, places) : places.filter(p => watches.includes(p.id))).filter(p => !selected.some(s => s.toLocaleLowerCase() === p.name.toLocaleLowerCase())).slice(0, 5)
  const [addresses, setAddresses] = useState<string[]>([])
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const requestId = useRef(0)
  const options = [...candidates.map(p => ({ name: p.name, detail: p.county })), ...addresses.filter(name => !candidates.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())).map(name => ({ name, detail: es ? 'Dirección de Arkansas — coincidencia de Census' : 'Arkansas address — Census match' }))]
  const expanded = open && query === search && options.length > 0 && selected.length < 10
  function add(value: string) {
    const text = value.trim().slice(0, 200)
    if (text && selected.length < 10 && !selected.some(s => s.toLocaleLowerCase() === text.toLocaleLowerCase())) edit({ locations: [...selected, text] })
    setQuery('')
    setAddresses([])
    setLookupState('idle')
    setActive(-1)
    setOpen(false)
  }
  async function findAddresses() {
    const value = query.trim()
    if (value.length < 8 || value.length > 200 || selected.length >= 10) return
    const id = ++requestId.current
    setLookupState('loading'); setAddresses([]); setOpen(true); setActive(-1)
    try {
      const response = await fetch('/api/geocode-address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: value }), signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error('lookup unavailable')
      const payload: unknown = await response.json()
      const results = (payload as { addresses?: unknown })?.addresses
      if (!Array.isArray(results) || !results.every(address => typeof address === 'string')) throw new Error('invalid lookup response')
      if (requestId.current === id) { setAddresses(results.slice(0, 5)); setLookupState('done') }
    } catch {
      if (requestId.current === id) setLookupState('error')
    }
  }
  return <section className="request-location-panel"><h2>{es ? '¿Dónde lo observaste?' : 'Where did you observe it?'}</h2>
    <p id={hintId} className="quiet-note">{es ? 'Puedes escribir cualquier lugar de Arkansas: ciudad, vecindario, calle, negocio, escuela o vivienda. Si eliges buscar una dirección, enviaremos tu texto a la Oficina del Censo de EE. UU. para buscar una coincidencia. Evita incluir direcciones privadas en la búsqueda. Las sugerencias de lugares de agua son limitadas y no muestran límites del proveedor. Hasta 10 lugares.' : 'Enter any Arkansas location: town, neighborhood, street, business, school, or home. If you choose to find an address, your text is sent to the U.S. Census Bureau to look for a match. Avoid including private addresses in the search. Water-place suggestions are limited and do not show supplier boundaries. Up to 10 places.'}</p>
    <div className="request-location-entry" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setActive(-1) } }}>
      <label>{es ? 'Escribe cualquier lugar afectado en Arkansas (opcional)' : 'Enter any affected location in Arkansas (optional)'}<input type="search" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded && active >= 0 && active < options.length ? `${listId}-${active}` : undefined} aria-describedby={hintId} value={query} maxLength={200} aria-label={es ? 'Escribe cualquier lugar afectado en Arkansas' : 'Enter any affected location in Arkansas'} onFocus={() => setOpen(true)} onChange={e => { requestId.current++; setQuery(e.target.value); setAddresses([]); setLookupState('idle'); setActive(-1); setOpen(true) }} onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1) }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive(i => options.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : -1) }
        else if (e.key === 'Enter') { e.preventDefault(); add(expanded && active >= 0 ? options[active]?.name ?? query : query) }
      }} /></label>
      {expanded ? <ul id={listId} className="request-location-options" role="listbox" aria-label={es ? 'Lugares sugeridos y coincidencias de dirección' : 'Suggested places and address matches'}>{options.map((option, i) => <li id={`${listId}-${i}`} key={`${option.name}-${option.detail}`} role="option" aria-selected={active === i} onMouseDown={e => e.preventDefault()} onClick={() => add(option.name)}>{option.name}<small>{option.detail}</small></li>)}</ul> : null}
    </div>
    <div className="request-location-actions">
      <button className="secondary" disabled={selected.length >= 10 || !query.trim()} onClick={() => add(query)}>{es ? 'Añadir este lugar' : 'Add this location'}</button>
      <button className="secondary" disabled={selected.length >= 10 || query.trim().length < 8 || lookupState === 'loading'} onClick={() => void findAddresses()}>{lookupState === 'loading' ? es ? 'Buscando…' : 'Searching…' : es ? 'Buscar direcciones en Arkansas' : 'Find matching Arkansas addresses'}</button>
    </div>
    <div aria-live="polite">{lookupState === 'error' ? <p role="status" className="quiet-note">{es ? 'No se pudo buscar ahora. Puedes añadir el lugar escrito.' : 'Address search is unavailable right now. You can still add your own wording.'}</p> : lookupState === 'done' && !addresses.length ? <p role="status" className="quiet-note">{es ? 'No se encontró una coincidencia. Prueba la dirección completa o añade tus propias palabras.' : 'No address match found. Try the full street address or add your own wording.'}</p> : lookupState === 'loading' ? <p role="status">{es ? 'Buscando coincidencias de direcciones…' : 'Searching for address matches…'}</p> : !places.length ? <p className="quiet-note">{es ? 'El catálogo limitado de lugares de agua no está disponible; puedes añadir cualquier lugar manualmente.' : 'The limited water-place directory is unavailable; you can add any location manually.'}</p> : !candidates.length && !addresses.length ? <p className="quiet-note">{es ? 'Busca una dirección o añade cualquier lugar con tus propias palabras.' : 'Find an address or add any location in your own words.'}</p> : null}</div>
    <ul className="request-location-chips" aria-label={es ? 'Lugares seleccionados' : 'Selected locations'}>{selected.map(text => <li key={text}>{text}<button className="text-button" aria-label={`${es ? 'Eliminar lugar' : 'Remove location'}: ${text}`} onClick={() => edit({ locations: selected.filter(v => v !== text) })}>×</button></li>)}</ul>
  </section>
}
