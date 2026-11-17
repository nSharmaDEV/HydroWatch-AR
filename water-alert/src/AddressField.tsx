import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './icons'
import { MIN_ADDRESS_QUERY, reverseGeocode, searchAddresses, type AddressResult } from './addressSearch'

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export interface AddressValue { label: string; selection?: AddressResult; manual?: boolean }

/** Pure select/clear rules shared by the component and its tests. */
export function selectAddress(result: AddressResult): AddressValue { return { label: result.label, selection: result, manual: false } }
export function typeAddress(previous: AddressValue, label: string): AddressValue {
  // Editing after a pick drops the stored selection; manual mode stays manual.
  return { label, ...(previous.manual ? { manual: true } : {}) }
}
export function addressError(value: AddressValue, es: boolean, attemptedContinue = false) {
  if (value.manual) return value.label.trim() ? '' : es ? 'Escribe la dirección.' : 'Enter the address.'
  if (value.selection && value.selection.label === value.label) return ''
  if (!value.label.trim() && !attemptedContinue) return ''
  return es ? 'Elige una dirección de la lista o escríbela manualmente.' : 'Choose an address from the list, or enter it manually.'
}

/** Bolds the leading part of a suggestion that matches what was typed. */
function boldMatch(label: string, typed: string) {
  const n = typed.trim().length
  return n && label.toLowerCase().startsWith(typed.trim().toLowerCase()) ? <><strong>{label.slice(0, n)}</strong>{label.slice(n)}</> : label
}

/** Address combobox: suggestions must be picked unless the resident switches to manual entry. */
export function AddressField({ value, es, forceError = false, onChange }: { value: AddressValue; es: boolean; forceError?: boolean; onChange: (value: AddressValue) => void }) {
  const say = (en: string, spanish: string) => es ? spanish : en
  const id = useId(), listId = `${id}-list`, errorId = `${id}-error`, helpId = `${id}-note`
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(''), [results, setResults] = useState<AddressResult[]>([]), [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1), [blurred, setBlurred] = useState(false)
  const [locating, setLocating] = useState(false), [locationMessage, setLocationMessage] = useState(''), [announce, setAnnounce] = useState('')

  // Debounce 250ms, 4+ characters, cancel the previous request when a newer one starts.
  useEffect(() => {
    if (value.manual || query.trim().length < MIN_ADDRESS_QUERY) { setResults([]); setStatus('idle'); return }
    const controller = new AbortController()
    setStatus('loading')
    const timer = setTimeout(() => {
      searchAddresses(query, controller.signal).then(found => { setResults(found); setStatus(found.length ? 'ready' : 'empty'); setActive(-1) }).catch(e => { if ((e as Error).name !== 'AbortError') { setResults([]); setStatus('error') } })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, value.manual])

  const typed = value.label.trim()
  // A last row lets residents keep the exact address they typed when the map data lacks their house number.
  const canKeepTyped = !value.manual && !value.selection && typed.length >= MIN_ADDRESS_QUERY && (status === 'ready' || status === 'empty' || status === 'error')
  const rowCount = results.length + (canKeepTyped ? 1 : 0)
  function keepTyped() { onChange({ label: typed, manual: true }); setQuery(''); setResults([]); setStatus('idle'); setOpen(false); setActive(-1); setBlurred(false); setAnnounce(say('Manual entry', 'Entrada manual')); queueMicrotask(() => input.current?.focus()) }
  function chooseRow(i: number) { if (i < results.length) pick(results[i]); else keepTyped() }
  function pick(result: AddressResult) { onChange(selectAddress(result)); setQuery(''); setResults([]); setStatus('idle'); setOpen(false); setActive(-1); setBlurred(false); setLocationMessage(''); setAnnounce(say('Address selected', 'Dirección seleccionada')) }
  function type(label: string) { onChange(typeAddress(value, label)); setQuery(label); setOpen(true); setBlurred(false); setLocationMessage('') }
  function manual(on: boolean) { onChange({ label: value.label, ...(on ? { manual: true } : {}) }); setQuery(''); setResults([]); setStatus('idle'); setOpen(false); setBlurred(false); setLocationMessage(''); setAnnounce(on ? say('Manual entry', 'Entrada manual') : say('Search mode', 'Modo de búsqueda')); queueMicrotask(() => input.current?.focus()) }
  function key(e: KeyboardEvent<HTMLInputElement>) {
    if (value.manual) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!rowCount) return
      e.preventDefault(); setOpen(true)
      setActive(i => e.key === 'ArrowDown' ? (i + 1) % rowCount : (i <= 0 ? rowCount : i) - 1)
    } else if (e.key === 'Enter' && open && active >= 0 && active < rowCount) { e.preventDefault(); chooseRow(active) }
    else if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); setActive(-1) }
    else if (e.key === 'Tab') { setOpen(false); setActive(-1) }
  }
  const locationFailed = say('We couldn’t get your location. You can type your address instead.', 'No pudimos obtener tu ubicación. Puedes escribir tu dirección.')
  function locate() {
    setLocationMessage('')
    if (!('geolocation' in navigator)) { setLocationMessage(locationFailed); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const found = await reverseGeocode(position.coords.latitude, position.coords.longitude)
        if (found) pick(found)
        else setLocationMessage(locationFailed)
      } catch { setLocationMessage(locationFailed) }
      setLocating(false)
    }, () => { setLocating(false); setLocationMessage(locationFailed) }, { timeout: 20000, maximumAge: 60000 })
  }
  function change() { onChange({ label: '' }); setQuery(''); setResults([]); setStatus('idle'); setOpen(false); setBlurred(false); setAnnounce(say('Address cleared', 'Dirección borrada')); queueMicrotask(() => input.current?.focus()) }
  function clear() { type(''); queueMicrotask(() => input.current?.focus()) }

  const error = addressError(value, es, forceError) && (blurred || forceError) ? addressError(value, es, forceError) : ''
  const showList = open && !value.manual && !value.selection && (status === 'loading' || status === 'ready' || status === 'empty' || status === 'error')
  const live = status === 'loading' ? say('Searching…', 'Buscando…') : status === 'ready' ? say(`${rowCount} option${rowCount === 1 ? '' : 's'} available. Use the up and down arrow keys, then Enter to choose.`, `${rowCount} opci${rowCount === 1 ? 'ón' : 'ones'} disponible${rowCount === 1 ? '' : 's'}. Usa las flechas arriba y abajo y Enter para elegir.`) : status === 'empty' ? say('No matches.', 'Sin coincidencias.') : status === 'error' ? say('Address search is unavailable.', 'La búsqueda de direcciones no está disponible.') : ''
  const label = say('Address where this happened (required)', 'Dirección donde pasó (obligatorio)')
  const selected = !value.manual && !!value.selection && value.selection.label === value.label
  const state = value.manual ? 'manual' : selected ? 'selected' : typed ? 'typing' : 'default'
  const describedBy = [error ? errorId : '', selected || value.manual ? helpId : ''].filter(Boolean).join(' ') || undefined
  return <div className="address-field">
    <label htmlFor={`${id}-input`}>{label}</label>
    <p className="quiet-note address-privacy">{say('Addresses you type are sent to lookup services to find suggestions. “Use my location” sends your coordinates to the map service.', 'Las direcciones que escribes se envían a servicios de búsqueda para encontrar sugerencias. “Usar mi ubicación” envía tus coordenadas al servicio de mapas.')}</p>
    <div className={`address-input-wrap is-${state}`} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setOpen(false); setActive(-1); setBlurred(true) } }}>
      {!value.manual ? <span className="address-pin" aria-hidden="true"><Icon name={selected ? 'circle-check' : 'map-pin'} size={22} /></span> : null}
      <input id={`${id}-input`} ref={input} maxLength={200} autoComplete={value.manual ? 'street-address' : 'off'} value={value.label} placeholder={say('Start typing an address', 'Empieza a escribir una dirección')}
        {...(value.manual ? {} : { role: 'combobox', 'aria-expanded': showList, 'aria-controls': listId, 'aria-autocomplete': 'list' as const, 'aria-activedescendant': showList && active >= 0 ? `${id}-opt-${active}` : undefined })}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy} aria-required="true"
        onChange={e => type(e.target.value)} onKeyDown={key} onFocus={() => { if (!value.manual && (results.length || status === 'loading')) setOpen(true) }} />
      {value.manual ? <span className="address-tag">{say('Entered manually', 'Escrita manualmente')}</span>
        : selected ? <button type="button" className="action-chip address-change" onClick={change}><Icon name="edit" size={16} />{say('Change', 'Cambiar')}</button>
        : typed ? <button type="button" className="address-icon-button" aria-label={say('Clear address', 'Borrar dirección')} title={say('Clear address', 'Borrar dirección')} onClick={clear}><Icon name="x" size={20} /></button>
        : <button type="button" className="address-icon-button" aria-label={say('Use my location', 'Usar mi ubicación')} title={say('Use my location', 'Usar mi ubicación')} disabled={locating} onClick={locate}><Icon name="locate" size={24} /></button>}
      {showList ? <ul id={listId} className="address-listbox" role="listbox" aria-label={label}>
        {status === 'loading' ? <li role="presentation" className="address-status">{say('Searching…', 'Buscando…')}</li> : null}
        {status === 'empty' ? <li role="presentation" className="address-status">{say('No matches', 'Sin coincidencias')}</li> : null}
        {status === 'error' ? <li role="presentation" className="address-status">{say('Address search is unavailable right now. Check your connection, or enter the address manually.', 'La búsqueda de direcciones no está disponible ahora. Revisa tu conexión o escribe la dirección manualmente.')}</li> : null}
        {status === 'ready' || status === 'empty' || status === 'error' ? results.map((r, i) => <li key={r.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === active} className={i === active ? 'is-active' : undefined} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(r)}><span className="address-pin-row" aria-hidden="true"><Icon name="map-pin" size={18} /></span>{boldMatch(r.label, typed)}</li>) : null}
        {canKeepTyped ? <li id={`${id}-opt-${results.length}`} role="option" aria-selected={active === results.length} className={`address-keep${active === results.length ? ' is-active' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(results.length)} onClick={keepTyped}>{say('Can’t find it? Enter it manually', '¿No la encuentras? Escríbela manualmente')}</li> : null}
      </ul> : null}
    </div>
    <p className="sr-only" aria-live="polite">{announce || live}</p>
    {!value.manual && !value.selection && /^\d+$/.test(typed) ? <p className="quiet-note address-number-hint" role="status">{say('Add the street name to find your address, for example “100 NE A St”.', 'Agrega el nombre de la calle para encontrar tu dirección, por ejemplo “100 NE A St”.')}</p> : null}
    {error ? <p id={errorId} className="address-error" role="alert"><Icon name="triangle-alert" size={16} />{error}</p> : null}
    {locationMessage ? <p role="status" className="address-error">{locationMessage}</p> : null}
    {selected ? <p id={helpId} className="quiet-note address-note">{say('Confirmed from a map result.', 'Confirmada con un resultado del mapa.')}</p> : null}
    {value.manual ? <p id={helpId} className="quiet-note address-note">{say('Not verified. The provider may ask you to confirm the location.', 'No verificada. El proveedor puede pedirte que confirmes la ubicación.')}</p> : null}
    {!selected ? <div className="address-actions"><button type="button" className="action-chip" onClick={() => manual(!value.manual)}><Icon name={value.manual ? 'search' : 'edit'} size={16} />{value.manual ? say('Search for an address instead', 'Buscar una dirección en su lugar') : say('Can’t find it? Enter it manually', '¿No la encuentras? Escríbela manualmente')}</button></div> : null}
  </div>
}
