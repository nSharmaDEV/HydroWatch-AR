import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { EMPTY_SOURCES, SOURCES, statusFor, type Mode, type Notice, type Place, type SourceSnapshot } from './domain'
import { defaults, loadPreferences, savePreferences, type Preferences } from './storage'
import { SAMPLE_NOW, sampleArchive, samplePlaces, sampleSources } from './sample'
import { APP_NAME, en, es } from './strings'
import { appTimestamp, DateRow, Icon, Panel, SourceLink, StatusCard } from './components'
import { PushPanel } from './PushPanel'
import { disablePush, enablePush, pushDevice, pushSignature, supportsPush, PushSetupError } from './push'
import { ConfirmPlace, SampleIntro, SearchPlace, WelcomeStrip } from './Journey'
import { NoticeDetail } from './NoticeDetail'
import { ObservedHistory } from './ObservedHistory'
import { MapSources } from './MapSources'
import type { ObservedChange } from './check-history'
import { PLACE_CATALOG as FULL_PLACE_CATALOG, noticeMatchesPlace, withPlaceCatalog } from './place-catalog'
import { withDirectory } from './water-system-directory'
import { AnnualReportAiDisclaimer } from './annual-report-disclaimer'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { CDC_GUIDANCE_URL } from './BoilWaterGuidance'
import { RequestWorkspace } from './RequestWorkspace'
import { RequestHistory } from './RequestHistory'
import type { HelpRequest } from './help-requests'
import { LIVE_LOCAL_HELP_KEY, SAMPLE_HELP_KEY } from './help-client'
import { ProviderCarousel } from './ProviderCarousel'
import { HomeWater } from './HomeWater'
import { useContentMotion, useDisclosureMotion } from './interface-motion'

type Page = 'home' | 'browse' | 'managePlaces' | 'map' | 'history' | 'settings' | 'search' | 'confirm' | 'sampleIntro' | 'detail' | 'help' | 'alerts' | 'sources' | 'privacy' | 'installation'
type RemovedPlace = { id: string; index: number; lifted: boolean }
const PLACE_CATALOG = FULL_PLACE_CATALOG.filter(entry => entry.place.kind === 'system')
export interface LiveData { sources: SourceSnapshot[]; places: Place[]; archive: Notice[]; coverageStart: string | null; recentChanges?: ObservedChange[] }
const emptyLive: LiveData = { sources: EMPTY_SOURCES, places: [], archive: [], coverageStart: null }
function savedMode(): Mode { if (new URLSearchParams(window.location.search).has('notice')) return 'live'; try { return localStorage.getItem('water-alert:mode') === 'sample' ? 'sample' : 'live' } catch { return 'live' } }

export default function App({ liveData = emptyLive, onRefresh, onLiveOpen }: { liveData?: LiveData; onRefresh?: () => Promise<void>; onLiveOpen?: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>(savedMode)
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences(savedMode()))
  const [page, setPageState] = useState<Page>(() => window.location.hash.startsWith('#request=') ? 'history' : window.location.hash === '#search' || window.location.hash === '#setup' ? 'search' : 'home')
  const [mapVisited, setMapVisited] = useState(false)
  const [requestId, setRequestId] = useState<string | undefined>(() => window.location.hash.match(/^#request=([a-f0-9-]{36})$/i)?.[1])
  const [resumingRequest, setResumingRequest] = useState<HelpRequest | null>(null)
  const leaveHelp = useRef<(() => Promise<boolean>) | null>(null)
  const registerLeave = useCallback((handler: (() => Promise<boolean>) | null) => { leaveHelp.current = handler }, [])
  const [query, setQuery] = useState('')
  // Home hero search text; submitting hands it to the existing supplier search step.
  const [heroQuery, setHeroQuery] = useState('')
  // The header drops in only with the first Home load; returning to Home keeps the chrome still.
  const [headerIntro, setHeaderIntro] = useState(page === 'home')
  const [kind, setKind] = useState<Place['kind']>('system')
  const [candidate, setCandidate] = useState<Place | null>(null)
  const [helpIntent, setHelpIntent] = useState(false)
  // A hand-checked report finding chosen with "Ask about this".
  const [helpAsk, setHelpAsk] = useState<string | undefined>()
  const [removed, setRemoved] = useState<RemovedPlace | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [linkedId, setLinkedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('notice'))
  const [device, setDevice] = useState(pushDevice)
  const [pushConfig, setPushConfig] = useState<{ state: 'loading' | 'ready' | 'unsupported' | 'unavailable' | 'error'; publicKey?: string }>({ state: 'loading' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [now, setNow] = useState(Date.now)
  const main = useRef<HTMLElement>(null)
  const changeContent = useContentMotion(main)
  useDisclosureMotion(main)
  const destination = useRef(page)
  function setPage(next: Page) {
    if (next === destination.current) return
    destination.current = next
    const tabs: Page[] = ['home', 'browse', 'map', 'history', 'settings']
    const direction = tabs.includes(next) ? tabs.includes(page) ? 'tab' : 'back' : page === 'confirm' && next === 'search' ? 'back' : 'forward'
    // Home's thin hero wave grows into the supplier search's tall wave.
    changeContent(() => setPageState(next), direction, page === 'home' && next === 'search')
  }
  const detailReturn = useRef<'home' | 'browse' | 'map'>('home')
  const helpReturn = useRef<{ page: Page; noticeId: string | null }>({ page: 'home', noticeId: null })
  const restoreHelpFocus = useRef(false)
  const sample = mode === 'sample'
  const words = prefs.language === 'en' ? en : es
  const t = { ...words, catalogWaterbody: '', ...(!sample ? { disconnected: words.pushInfo } : {}) }
  const sources = (sample ? sampleSources(false) : liveData.sources).filter(s => s.agency === 'ADH')
  const livePlaces = useMemo(() => withDirectory(withPlaceCatalog(liveData.places)), [liveData.places])
  const allPlaces = sample ? samplePlaces : livePlaces
  const places = allPlaces.filter(p => p.kind === 'system')
  const activeWatches = prefs.watches.filter(id => !id.startsWith('ADEQ:') && !allPlaces.some(p => p.id === id && p.kind === 'lake'))
  const supplierPrefs = { ...prefs, watches: activeWatches, liftWatches: prefs.liftWatches.filter(id => activeWatches.includes(id)) }
  const archive = (sample ? sampleArchive : liveData.archive).filter(n => n.agency === 'ADH' && n.kind === 'boil')
  const clock = sample ? SAMPLE_NOW : now
  const watched = activeWatches.map(id => places.find(p => p.id === id)).filter((p): p is Place => !!p)
  const missingWatches = activeWatches.filter(id => !places.some(p => p.id === id))
  const selectedObserved = archive.find(n => n.placeId === selected)
  const place = places.find(p => p.id === selected) ?? (selectedObserved ? { id: selectedObserved.placeId, name: selectedObserved.name, county: selectedObserved.county, kind: 'system' as const } : undefined)
  const source = sources.find(s => s.agency === (place?.kind === 'system' ? 'ADH' : 'ADEQ'))
  const selectedStatus = place ? statusFor(place.id, source, clock) : null
  const linkedNotice = linkedId && selected ? archive.find(n => n.id === linkedId && noticeMatchesPlace(selected, n)) : undefined
  const recent = !sample ? (liveData.recentChanges ?? []).filter(e => e.notice.agency === 'ADH' && activeWatches.some(id => noticeMatchesPlace(id, e.notice)) && statusFor(e.notice.placeId, sources.find(s => s.agency === e.notice.agency), clock).state !== 'unavailable') : []

  useEffect(() => {
    if (mode !== 'live' || !linkedId || page === 'help') return
    const notice = liveData.archive.find(n => n.id === linkedId && n.agency === 'ADH' && n.kind === 'boil')
    const target = notice ? withPlaceCatalog(liveData.places).find(p => p.kind === 'system' && noticeMatchesPlace(p.id, notice)) : undefined
    setSelected(target?.id ?? null); setPage('detail')
    if (target) window.history.replaceState(null, '', window.location.pathname)
  }, [mode, linkedId, liveData.archive, liveData.places, page])
  useEffect(() => { document.documentElement.lang = prefs.language }, [prefs.language])
  useEffect(() => {
    if (mode !== 'live' || !prefs.checkOnOpen || !onLiveOpen) return
    let reading = false
    async function read() {
      if (reading) return
      reading = true
      try { await onLiveOpen!() } finally { reading = false }
    }
    void read()
    const timer = setInterval(() => void read(), 30_000)
    return () => clearInterval(timer)
  }, [mode, prefs.checkOnOpen, onLiveOpen])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    if (!supportsPush()) { setPushConfig({ state: 'unsupported' }); return }
    let cancelled = false
    void fetch('/api/push/config').then(async response => {
      if (!response.ok) throw new Error('Unavailable')
      const value = await response.json()
      if (value.enabled !== false && !(value.enabled === true && typeof value.publicKey === 'string' && value.publicKey.trim())) throw new Error('Invalid configuration')
      if (!cancelled) setPushConfig(value.enabled ? { state: 'ready', publicKey: value.publicKey } : { state: 'unavailable' })
    }).catch(() => { if (!cancelled) setPushConfig({ state: 'error' }) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => { if (!savePreferences(mode, prefs)) setMessage(t.storageError) }, [mode, prefs, t.storageError])
  useLayoutEffect(() => {
    if (page === 'help') return
    const trigger = restoreHelpFocus.current ? Array.from(document.querySelectorAll<HTMLButtonElement>('[data-help-place]')).find(el => el.dataset.helpPlace === selected) : undefined
    const helpSection = trigger?.closest<HTMLDetailsElement>('.supplier-help-section')
    if (helpSection) helpSection.open = true
    ;(trigger ?? main.current)?.focus()
    restoreHelpFocus.current = false
    window.scrollTo?.(0, 0)
  }, [page, mode, selected])

  function commitNavigation(next: Page) { if (next === 'map') setMapVisited(true); if (next === 'detail') detailReturn.current = page === 'map' ? 'map' : page === 'browse' ? 'browse' : 'home'; setRequestId(undefined); setResumingRequest(null); window.history.replaceState(null, '', window.location.pathname + window.location.search); setPage(next); setLinkedId(null); setMessage(''); setConfirmDelete(false); setHeaderIntro(false) }
  function navigate(next: Page) { if (page === 'help' && leaveHelp.current) { void leaveHelp.current().then(saved => { if (saved) commitNavigation(next) }); return }; commitNavigation(next) }
  // Home's supplier search is the only in-app step that adds a browser history entry,
  // so browser Back from the supplier glass card (or a step reached from it) returns to Home.
  function historyNavigate(next: 'home' | 'search') { const leaving = page === 'help' && leaveHelp.current; if (next === 'search') search('system'); else navigate(next); if (!leaving) window.history.replaceState({ wavePage: next }, '', window.location.pathname + window.location.search + (next === 'search' ? '#search' : '')) }
  const historyNavigateRef = useRef(historyNavigate)
  historyNavigateRef.current = historyNavigate
  useEffect(() => {
    const onPop = (event: PopStateEvent) => { const target = (event.state as { wavePage?: unknown } | null)?.wavePage; if (target === 'home' || target === 'search') historyNavigateRef.current(target) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  function openSupplierCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const base = window.location.pathname + window.location.search
    search('system')
    // The typed text pre-fills the existing supplier search (name, county or alias matches).
    setQuery(heroQuery.trim())
    window.history.replaceState({ wavePage: 'home' }, '', base)
    window.history.pushState({ wavePage: 'search' }, '', base + '#search')
  }
  function openHelp(id: string, returnTo: Page = page, ask?: string) { helpReturn.current = { page: returnTo, noticeId: linkedId }; setHelpAsk(ask); setHelpIntent(false); setRequestId(undefined); setResumingRequest(null); setSelected(id); setPage('help'); setMessage('') }
  function openRequestHistory(id: string) { setRequestId(id); setPage('history'); window.history.replaceState(null, '', `#request=${id}`) }
  function resumeRequest(request: HelpRequest) { helpReturn.current = { page: 'history', noticeId: null }; setHelpAsk(undefined); setRequestId(request.id); setResumingRequest(request); setSelected(request.draft.place.id); setPage('help'); window.history.replaceState(null, '', `#request=${request.id}`) }
  function closeHelp() { restoreHelpFocus.current = true; setPage(helpReturn.current.page); setLinkedId(helpReturn.current.noticeId) }
  function changeMode(next: Mode) {
    if (page === 'help' && leaveHelp.current) { void leaveHelp.current().then(saved => { if (saved) commitMode(next) }); return }
    commitMode(next)
  }
  function commitMode(next: Mode) {
    const nextPrefs = loadPreferences(next)
    if (next === 'sample') nextPrefs.language = prefs.language
    setMode(next); setPrefs(nextPrefs); setMapVisited(false); setSelected(null); setCandidate(null); setRemoved(null); setLinkedId(null); setQuery(''); setMessage('')
    commitNavigation(next === 'sample' ? 'sampleIntro' : 'home')
    try { localStorage.setItem('water-alert:mode', next) } catch { setMessage(t.storageError) }
  }
  function search(kind: Place['kind'], forHelp = false) { setHelpIntent(forHelp); setKind(kind); setQuery(''); setCandidate(null); navigate('search') }
  function confirmWatch() {
    if (!candidate) return
    setPrefs(p => ({ ...p, watches: p.watches.includes(candidate.id) ? p.watches : [...p.watches, candidate.id] }))
    setRemoved(null); setCandidate(null); navigate('browse')
  }
  function removeWatch(id: string) {
    setRemoved({ id, index: prefs.watches.indexOf(id), lifted: prefs.liftWatches.includes(id) })
    setPrefs(p => ({ ...p, watches: p.watches.filter(v => v !== id), liftWatches: p.liftWatches.filter(v => v !== id) }))
  }
  function undoRemove() {
    if (!removed) return
    const item = removed
    setPrefs(p => {
      const watches = [...p.watches]
      if (!watches.includes(item.id)) watches.splice(Math.min(item.index, watches.length), 0, item.id)
      return { ...p, watches, liftWatches: item.lifted ? [...new Set([...p.liftWatches, item.id])] : p.liftWatches }
    })
    setRemoved(null)
  }
  function sampleList() { setPrefs(p => ({ ...p, watches: ['ADH:sample-creek', 'ADH:sample-ridge'] })); setRemoved(null); navigate('browse') }
  async function refresh() { if (!onRefresh || sample) return; setBusy(true); try { await onRefresh(); setNow(Date.now()) } finally { setBusy(false) } }
  async function share(n: Notice) {
    const title = n.lifted ? t.explicitLift : selectedStatus?.state === 'unavailable' || linkedNotice ? n.kind === 'boil' ? t.previousBoil : t.previousHab : n.kind === 'boil' ? t.boil : t.hab
    const text = `${sample ? t.sampleShare + '\n' : ''}${n.name}\n${title}\n${selectedStatus?.state === 'unavailable' ? t.unverified + '\n' : ''}${t.affected}: ${n.area}\n${t.issued}: ${n.issued ?? t.unknown}\n${n.url}\n${t.noSafety}`
    try { if (navigator.share) await navigator.share({ title: APP_NAME, text }); else { await navigator.clipboard.writeText(text); setMessage(t.shareCopied) } } catch { setMessage(t.shareFailed) }
  }
  function askLift() { if (selected) setPrefs(p => ({ ...p, liftWatches: [...new Set([...p.liftWatches, selected])] })); navigate('alerts') }
  async function deleteDevice() {
    setBusy(true)
    try { await disablePush(); setDevice(null) } catch { setMessage(t.pushFailed); setBusy(false); return }
    try { for (const key of ['water-alert:live:v1', 'water-alert:sample:v1', 'water-alert:mode', 'water-alert:live-check:v1', SAMPLE_HELP_KEY, LIVE_LOCAL_HELP_KEY]) localStorage.removeItem(key) } catch { setMessage(t.storageError); setBusy(false); return }
    setPrefs(defaults()); setMode('live'); setSelected(null); setCandidate(null); setRemoved(null); setLinkedId(null); setMessage(''); setPage('home')
    setBusy(false)
  }
  async function togglePush() {
    if (busy || sample) return
    if (device) {
      setBusy(true); setMessage('')
      try { await disablePush(); setDevice(null); setMessage(t.pushRemoved) }
      catch { setMessage(t.pushFailed) }
      finally { setBusy(false) }
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') { setMessage(t.pushPermissionDenied); return }
    if (!prefs.watches.length) { setMessage(t.pushNeedsPlaces); return }
    if (pushConfig.state !== 'ready' || !pushConfig.publicKey) { setMessage(pushConfig.state === 'unsupported' ? t.pushUnsupported : pushConfig.state === 'unavailable' ? t.pushUnavailable : t.pushSetupFailed); return }
    setBusy(true); setMessage('')
    try { await enablePush(mode, supplierPrefs, pushConfig.publicKey); setDevice(pushDevice()); setMessage(t.pushSaved) }
    catch (error) { setMessage(typeof Notification !== 'undefined' && (Notification.permission === 'denied' || error instanceof Error && error.message.toLowerCase().includes('permission')) ? t.pushPermissionDenied : error instanceof PushSetupError ? error.stage === 'worker' ? t.pushWorkerFailed : error.stage === 'subscription' ? t.pushSubscriptionFailed : t.pushServerFailed : t.pushSetupFailed) }
    finally { setBusy(false) }
  }
  // Help highlights the tab it was opened from, not History.
  const navBase = page === 'help' ? helpReturn.current.page : page
  const navPage = ['alerts', 'sources', 'privacy', 'installation', 'managePlaces'].includes(navBase) ? 'settings' : navBase === 'detail' ? detailReturn.current : ['search', 'confirm'].includes(navBase) ? 'browse' : navBase
  const nav = (['home', 'browse', 'map', 'history', 'settings'] as const).map(item => <button key={item} aria-current={navPage === item ? 'page' : undefined} onClick={() => navigate(item)}><Icon name={({ home: 'house', browse: 'list', map: 'map', history: 'history', settings: 'settings' } as const)[item]} /><span>{item === 'map' ? prefs.language === 'es' ? 'Mapa' : 'Map' : t[item]}</span></button>)
  const settingsLinks = [
    { page: 'alerts' as const, title: t.alertOptions, help: t.alertHelp, icon: 'bell' as const },
    { page: 'managePlaces' as const, title: t.watched, help: t.managePlaces, icon: 'map-pin' as const },
    { page: 'sources' as const, title: t.sources, help: t.sourcesHelp, icon: 'file-text' as const },
    { page: 'privacy' as const, title: t.privacy, help: t.privacyHelp, icon: 'shield' as const },
    { page: 'installation' as const, title: t.installation, help: t.installationHelp, icon: 'smartphone' as const },
  ]

  return <>
    <a className="skip-link" href="#main">{prefs.language === 'en' ? 'Skip to content' : 'Ir al contenido'}</a>
    <header className={page === 'home' && headerIntro ? 'app-header fall' : 'app-header'} onAnimationEnd={event => { if (event.target === event.currentTarget) setHeaderIntro(false) }}><div className="header-inner"><button className="brand" onClick={() => navigate('home')} aria-label={APP_NAME}><img className="brand-logo" src="/wave-logo.png" alt={APP_NAME} width="1830" height="416" /></button><nav aria-label={prefs.language === 'en' ? 'Main navigation' : 'Navegación principal'}>{nav}</nav><div className="lang-switch" aria-label={t.language}><button aria-pressed={prefs.language === 'en'} onClick={() => setPrefs(p => ({ ...p, language: 'en' }))}>EN</button><button aria-pressed={prefs.language === 'es'} onClick={() => setPrefs(p => ({ ...p, language: 'es' }))}>ES</button></div></div></header>
    {sample ? <section className="sample-banner" aria-label={t.sample}><div><b>{t.sample}</b><span>{t.sampleText}</span><button onClick={() => changeMode('live')}>{t.exit}</button></div></section> : null}
    <main id="main" ref={main} tabIndex={-1}>
      <HomeWater paused={page === 'search' || page === 'confirm'} />
      <div className={message ? 'message-toast' : undefined}>
        <div role="status" className={message ? 'message' : 'sr-only'}>{message}</div>
        {message ? <button type="button" className="message-close" aria-label={prefs.language === 'es' ? 'Cerrar notificación' : 'Close notification'} onClick={() => setMessage('')}><Icon name="x" size={18} /></button> : null}
      </div>
      {!sample && page !== 'home' && page !== 'alerts' && device && device.signature !== pushSignature(prefs) ? <p className="info">{t.pushDirty} <button className="text-button" onClick={() => navigate('alerts')}>{t.alertOptions}</button></p> : null}
      {page === 'search' ? helpIntent
        ? <SearchPlace key={`${mode}:${kind}:help`} kind={kind} places={places} query={query} onQuery={setQuery} t={t}
            heading={prefs.language === 'es' ? 'Elige tu proveedor de agua' : 'Choose your water provider'}
            intro={prefs.language === 'es' ? 'Elige el proveedor sobre el que quieres escribir. Te ayudaremos a preparar un mensaje que puedes revisar y copiar. No tienes que seguir a este proveedor.' : 'Pick the provider your message is about. We’ll help you prepare a message you can review and copy. You don’t have to follow this provider.'}
            onBack={() => { setHelpIntent(false); navigate('home') }} onSelect={p => openHelp(p.id, 'home')} />
        : <SearchPlace key={`${mode}:${kind}`} kind={kind} places={places} query={query} onQuery={setQuery} t={t} onBack={() => navigate('home')} onSelect={p => { setCandidate(p); navigate('confirm') }} /> : null}
      {page === 'confirm' && candidate ? <ConfirmPlace place={candidate} t={t} onConfirm={confirmWatch} onBack={() => navigate('search')} /> : null}
      {page === 'sampleIntro' ? <SampleIntro t={t} onStart={() => search('system')} onList={sampleList} /> : null}
      {page === 'home' ? <div className="wave-home">
        <section className="wave-hero" aria-labelledby="wave-hero-title">
          <div className="wave-hero-inner">
            <div className="wave-hero-main">
            <h1 id="wave-hero-title" className="fall fall-headline">{prefs.language === 'es' ? <>Encuentra avisos sobre el agua{' '}<span>en Arkansas.</span></> : <>Find water advisories{' '}<span>in Arkansas.</span></>}</h1>
            <p className="wave-hero-lede fall fall-lede">{prefs.language === 'es' ? 'Busca avisos públicos oficiales, ve de dónde viene la información y comunícate con tu proveedor de agua sobre una inquietud.' : 'Search official public notices, see where the information comes from, and contact your water provider about a concern.'}</p>
            <form className="wave-hero-search fall fall-search" role="search" onSubmit={openSupplierCheck}>
              <div className="wave-hero-field"><label className="sr-only" htmlFor="home-supplier-search">{prefs.language === 'es' ? 'Busca por proveedor o condado' : 'Search by supplier or county'}</label><input id="home-supplier-search" name="home-supplier-search" type="search" autoComplete="off" value={heroQuery} onChange={event => setHeroQuery(event.target.value)} placeholder={prefs.language === 'es' ? 'Nombre del proveedor o condado' : 'Supplier name or county'} /></div>
              <button type="submit" aria-label={prefs.language === 'es' ? 'Buscar' : 'Search'}><Icon name="search" size={24} /></button>
            </form>
            <div className="wave-hero-links fall fall-links"><button type="button" className="wave-hero-pill" onClick={() => navigate('browse')}><Icon name="list" size={18} />{prefs.language === 'es' ? 'Ver todos los lugares' : 'Browse all places'}</button></div>
            </div>
            <div className="wave-home-actions">
              <button className="wave-home-action fall fall-card-1" onClick={() => navigate('map')}><span className="wave-home-icon wave-home-icon--map" aria-hidden="true"><Icon name="map" size={24} /></span><span className="wave-home-action-text"><span className="wave-home-action-title">{prefs.language === 'es' ? 'Explorar el mapa de avisos' : 'Browse the advisory map'}</span><span className="wave-home-action-desc">{prefs.language === 'es' ? 'Ve en un mapa los avisos de todo el estado, con avisos de fuentes oficiales.' : 'See advisories across the state on a map, with notices from official sources.'}</span><b>{prefs.language === 'es' ? 'Abrir el mapa' : 'Open the map'} <Icon name="arrow-right" size={18} /></b></span></button>
              <button className="wave-home-action wave-home-action--help fall fall-card-2" onClick={() => watched[0] ? openHelp(watched[0].id) : search('system', true)}><span className="wave-home-icon wave-home-icon--help" aria-hidden="true"><Icon name="water" size={24} /></span><span className="wave-home-action-text"><span className="wave-home-action-title">{prefs.language === 'es' ? 'Obtener ayuda con un problema de agua' : 'Get help with a water issue'}</span><span className="wave-home-action-desc">{prefs.language === 'es' ? 'Describe lo que ocurre y prepara un mensaje para tu proveedor.' : 'Describe what you’re experiencing and prepare a message to your provider.'}</span><b>{prefs.language === 'es' ? 'Iniciar un informe' : 'Start a report'} <Icon name="arrow-right" size={18} /></b></span></button>
            </div>
          </div>
          <div className="wave-hero-water" aria-hidden="true"><WelcomeStrip /></div>
        </section>
        <footer className="wave-home-footer"><div className="wave-home-footer-inner"><b>WellPower: WAVE</b><p>{prefs.language === 'es' ? 'Solo con fines informativos. En una emergencia, comunícate con tu proveedor de agua o con los servicios de emergencia locales.' : 'For awareness only. In an emergency, contact your water provider or local emergency services.'}</p></div></footer>
      </div> : null}
      {page === 'browse' ? <>
        <WelcomeStrip still />
        <h1 className="sr-only">{t.myWater}</h1>
        <div className="home-layout"><button className="primary add-place" onClick={() => search('system')}>+ {t.add}</button><div className="home-main">
          {recent.length ? <Panel><h2>{t.sinceVisit}</h2><p>{t.sinceVisitInfo}</p>{recent.map(e => <div key={e.id} className="watched-row"><span>{e.notice.name} · {e.type === 'lifted' ? t.agencyLifted : t.active} · {appTimestamp(e.observedAt, prefs.language)}</span><button className="text-button" onClick={() => { setSelected(e.notice.placeId); navigate('detail'); setLinkedId(e.notice.id) }}>{t.view}</button></div>)}</Panel> : null}
          {!prefs.watches.length ? <Panel><p>{t.noWatches}</p><button className="primary" onClick={() => search('system')}>{t.setup}</button></Panel> : <ProviderCarousel language={prefs.language}>{[...watched.map(p => <StatusCard key={p.id} place={p} archive={archive} source={sources.find(s => s.agency === (p.kind === 'system' ? 'ADH' : 'ADEQ'))} now={clock} t={t} language={prefs.language} sample={sample} checking={busy} onRefresh={onRefresh ? refresh : undefined} onSources={() => navigate('sources')} onHelp={() => openHelp(p.id)} onAsk={key => openHelp(p.id, 'home', key)} onView={() => { setSelected(p.id); navigate('detail') }} onViewNotice={id => { setSelected(p.id); navigate('detail'); setLinkedId(id) }} />), ...missingWatches.map(id => <Panel className="status-card unavailable" key={`missing:${id}`}><p className="status-label"><span className="status-symbol" aria-hidden="true">?</span>{t.unavailable}</p><p>{t.missingPlace}</p><p className="quiet-note">{id}</p><button className="secondary" onClick={() => navigate('managePlaces')}>{t.watched}</button></Panel>)]}</ProviderCarousel>}
        </div><aside className="home-sidebar"><section className="home-alert-options"><div className="sidebar-heading-row"><h2><Icon name="bell" />{t.waterUpdates}</h2><button type="button" role="switch" aria-label={t.waterUpdates} aria-checked={!sample && !!device} disabled={busy || sample || pushConfig.state === 'loading'} className="notification-switch" onClick={() => void togglePush()}><span aria-hidden="true" /></button></div></section><section className="about-results"><h2><Icon name="info" />{t.aboutResults}</h2><p>{t.resultsSummary}</p></section></aside></div>
      </> : null}
      {page === 'detail' ? linkedId && !linkedNotice ? <Panel><p>{prefs.language === 'es' ? 'No se puede abrir este aviso guardado con los registros disponibles actualmente. No se ha sustituido por otro aviso.' : 'This saved notice cannot be opened from the currently available records. It has not been replaced with another notice.'}</p><button className="secondary" onClick={() => navigate('browse')}>{t.back}</button></Panel> : place ? <NoticeDetail place={place} source={source} now={clock} linkedNotice={linkedNotice} t={t} language={prefs.language} sample={sample} onBack={() => navigate(detailReturn.current)} onShare={n => void share(n)} onAlerts={askLift} onHelp={() => openHelp(place.id)} /> : null : null}
      {page === 'help' && (resumingRequest?.draft.place ?? place) ? <><WelcomeStrip still /><RequestWorkspace places={places} ask={requestId ? undefined : helpAsk} key={`${mode}:${requestId ?? place?.id}:${helpAsk ?? ''}`} place={(resumingRequest?.draft.place ?? place)!} requestId={requestId} registerLeave={registerLeave} currentAdvisory={!linkedNotice && selectedStatus?.state === 'active'} notices={linkedNotice ? [linkedNotice] : selectedStatus?.records ?? []} notice={linkedNotice ?? (selectedStatus?.records.length === 1 ? selectedStatus.records[0] : undefined)} language={prefs.language} sample={sample} onBack={closeHelp} onHistory={openRequestHistory} /></> : null}
      {page === 'managePlaces' ? <div className="search-stage settings-stage"><WelcomeStrip still /><Panel className="settings-glass settings-detail"><button className="back" onClick={() => navigate('settings')}><Icon name="chevron-left" size={18} />{t.settings}</button><div className="page-heading"><div><h1>{t.watched}</h1></div></div><Panel>
        {!activeWatches.length ? <p>{t.noWatches}</p> : null}
        {activeWatches.map(id => { const p = places.find(p => p.id === id); return <div className="place-row" key={id}><Icon name="map-pin" /><div><h2>{p?.name ?? id}</h2><p>{p ? `${p.county} · ADH` : t.missingPlace}</p></div><button className="text-button" aria-label={`${t.remove} ${p?.name ?? id}`} onClick={() => removeWatch(id)}>{t.remove}</button></div> })}
        {removed ? <div className="undo-row" role="status"><span>{t.removed}</span><button className="text-button" onClick={undoRemove}>{t.undo}</button></div> : null}
        <div className="add-choices"><button onClick={() => search('system')}>+ {t.addSupplier}</button></div>
      </Panel></Panel></div> : null}
      {mapVisited ? <div className="advisory-map-page" hidden={page !== 'map'}><ObservedHistory key={mode} archive={archive} watches={activeWatches} coverageStart={sample ? sampleArchive.find(n => n.lifted)?.firstObservedAt ?? null : liveData.coverageStart} t={t} language={prefs.language} places={places} sources={sources} now={clock} active={page === 'map'} onSources={() => navigate('sources')} /></div> : null}
      {page === 'history' ? <div className="history-stage"><WelcomeStrip still /><RequestHistory key={`${mode}:${requestId ?? ''}`} language={prefs.language} sample={sample} requestId={requestId} onResume={resumeRequest} /></div> : null}
      {page === 'settings' ? <div className="search-stage settings-stage"><WelcomeStrip still /><Panel className="settings-glass"><h1>{t.settings}</h1><div className="settings-menu">{settingsLinks.map(link => <button className="choice" key={link.page} onClick={() => navigate(link.page)}><span className="choice-icon"><Icon name={link.icon} /></span><span><b>{link.title}</b><small>{link.help}</small></span><span aria-hidden="true"><Icon name="chevron-right" size={20} /></span></button>)}
        {/* Sample mode as a sixth row; the row text keeps the fictional-data disclosure. Remove saved
            data lives on Privacy and stored data; auto-refresh lives on Alert Options. */}
        <button className="choice" onClick={() => changeMode(sample ? 'live' : 'sample')}><span className="choice-icon"><Icon name="test-tube" /></span><span><b>{sample ? t.exit : t.trySample}</b><small>{t.sampleText}</small></span><span aria-hidden="true"><Icon name="chevron-right" size={20} /></span></button></div>
      </Panel></div> : null}
      {['alerts', 'sources', 'privacy', 'installation'].includes(page) ? <div className="search-stage settings-stage"><WelcomeStrip still /><Panel className="settings-glass settings-detail"><button className="back" onClick={() => navigate('settings')}><Icon name="chevron-left" size={18} />{t.settings}</button>
        {page === 'sources' ? <><h1>{t.sources}</h1><Panel><h2>{t.advisorySources}</h2><p>{t.resultsSummary}</p>{sources.map(s => <div className="source-entry" key={s.agency}><h3>{s.agency === 'ADH' ? 'Arkansas Department of Health (ADH)' : 'Arkansas Division of Environmental Quality (ADEQ)'}</h3><SourceLink url={SOURCES[s.agency]}>{t.sourceLink}</SourceLink><dl><DateRow label={t.checked} value={s.retrievedAt} app language={prefs.language} />{s.lastSuccessAt ? <DateRow label={t.lastSuccess} value={s.lastSuccessAt} app language={prefs.language} /> : <div><dt>{t.lastSuccess}</dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl><p>{statusFor('', s, clock).state === 'unavailable' ? t.unavailable : t.sourceRetrieved}</p></div>)}</Panel><Panel><h2>{t.coverageHeading}</h2><p>{t.sourceCoverage}</p><p>{t.catalogWaterbody}</p><p>{t.catalogSupplier}</p>{!sample ? <details><summary>{t.catalogSource}<span className="disclosure-icon" aria-hidden="true" /></summary>{PLACE_CATALOG.map(entry => <p key={entry.place.id}><SourceLink url={entry.url}>{entry.place.name}</SourceLink></p>)}</details> : null}</Panel><Panel><h2>{t.cannotTell}</h2><p>{t.limits}</p></Panel><Panel><AnnualReportAiDisclaimer language={prefs.language} as="h2" /></Panel><Panel className="about-wave"><h2>{t.aboutWave}</h2><p>{t.purpose}</p><p>{t.verificationLimit}</p><p>{t.setupIntro}</p><p>{t.coverage}</p></Panel></> : null}
        {page === 'sources' ? <Panel><h2>{prefs.language === 'es' ? 'Referencias seleccionadas — no son fuentes de avisos en vivo' : 'Curated references — not live advisory feeds'}</h2><p>{prefs.language === 'es' ? 'Revisadas el 14 de octubre de 2026. No determinan el estado actual, la responsabilidad, el derecho a reembolso ni la elegibilidad para asistencia legal.' : 'Checked October 14, 2026. These do not determine current advisory status, liability, reimbursement entitlement or legal-aid eligibility.'}</p>{[['CDC — general drinking-water advisory guidance', CDC_GUIDANCE_URL], ['Arkansas Attorney General', RECOVERY_RESOURCES.complaint], ['AG complaint form — English', RECOVERY_RESOURCES.englishForm], ['Formulario de queja — español', RECOVERY_RESOURCES.spanishForm], ['Arkansas Law Help', RECOVERY_RESOURCES.legalHelp], ['Legal-aid intake', RECOVERY_RESOURCES.intake], ['Small-claims process and forms', RECOVERY_RESOURCES.court], ['ADH annual drinking-water reports', RECOVERY_RESOURCES.annualReports]].map(([label, url]) => <p key={url}><SourceLink url={url}>{label}</SourceLink></p>)}<p>{prefs.language === 'es' ? 'Los perfiles de proveedores son datos de directorio, no mediciones actuales. Verifique el proveedor y el año de cada informe. Las plantillas son texto de preparación editable, no consejo legal ni reclamaciones presentadas.' : 'Supplier profiles are directory facts, not live measurements. Verify the system and year of each report. Templates are editable preparation text, not legal advice or submitted claims.'}</p></Panel> : null}
        {page === 'sources' ? <Panel><MapSources language={prefs.language} archive={archive} /></Panel> : null}
        {page === 'alerts' ? <><h1>{t.alertOptions}</h1><Panel><h2>{t.alerts}</h2><label className="checkbox-row"><input type="checkbox" checked={supplierPrefs.liftWatches.length > 0} disabled={!activeWatches.length} onChange={e => setPrefs(p => ({ ...p, liftWatches: e.target.checked ? [...activeWatches] : [] }))} />{t.liftOption}</label><label className="checkbox-row"><input type="checkbox" checked={prefs.checkOnOpen} onChange={e => setPrefs(p => ({ ...p, checkOnOpen: e.target.checked }))} />{t.checkOnOpen}</label><PushPanel mode={mode} prefs={supplierPrefs} t={t} onChange={() => setDevice(pushDevice())} /></Panel></> : null}
        {page === 'privacy' ? <><h1>{t.privacy}</h1><Panel><h2>{t.storedDevice}</h2><p>{t.privacyDevice}</p><p>{prefs.language === 'es' ? 'Los borradores de ejemplo y los borradores reales creados sin cuenta quedan solo en este dispositivo, en el almacenamiento local del navegador. No se envían a WAVE, no aparecen en el Historial privado de una cuenta y no se transfieren a una cuenta. Borrar los datos del dispositivo también los elimina. Los borradores y conversaciones guardados en una cuenta son independientes y requieren iniciar sesión en Historial para eliminarlos.' : 'Sample drafts and live drafts created without an account stay only on this device in browser storage. They are not sent to WAVE, do not appear in private account History, and are not transferred to an account. Deleting device data removes them. Account-backed drafts and conversations are separate; sign in to History to delete those.'}</p><h2>{t.storedPush}</h2><p>{t.privacyPush}</p><h2>{t.retentionDeletion}</h2><p>{t.privacyRetention}</p><p>{prefs.language === 'es' ? 'Borrar datos del dispositivo no borra el Historial privado de la cuenta. Inicia sesión en Historial para borrar solicitudes o todo el Historial. Las copias enviadas permanecen con los destinatarios y el procesador de correo; no se pueden retirar. La eliminación de la cuenta se gestiona por el servicio de cuentas.' : 'Deleting device data does not delete private account History. Sign in to History to delete individual requests or all History. Sent copies remain with recipients and the email processor and cannot be recalled. Managed-account deletion is handled through the account service.'}</p><button className="danger full" disabled={busy} onClick={() => setConfirmDelete(true)}>{t.delete}</button>{confirmDelete ? <section aria-label={t.confirmRemoval}><p>{t.deletionText}</p><button className="danger" disabled={busy} onClick={() => void deleteDevice()}>{t.confirmRemoval}</button><button className="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>{t.cancel}</button></section> : null}</Panel></> : null}
        {page === 'installation' ? <><h1>{t.installation}</h1><Panel><p>{/iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 ? t.iOS : t.installationGeneral}</p><button className="text-button" onClick={() => navigate('alerts')}>{t.setupNotifications}</button></Panel></> : null}
      </Panel></div> : null}
    </main>
  </>
}
