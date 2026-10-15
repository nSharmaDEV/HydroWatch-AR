import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EMPTY_SOURCES, SOURCES, statusFor, type Mode, type Notice, type Place, type SourceSnapshot } from './domain'
import { defaults, loadPreferences, savePreferences, type Preferences } from './storage'
import { SAMPLE_NOW, sampleArchive, samplePlaces, sampleSources } from './sample'
import { en, es } from './strings'
import { appTimestamp, DateRow, Icon, Panel, SourceLink, StatusCard } from './components'
import { PushPanel } from './PushPanel'
import { disablePush, pushDevice, pushSignature } from './push'
import { ConfirmPlace, PrivateWell, SampleIntro, SearchPlace, Welcome } from './Journey'
import { NoticeDetail } from './NoticeDetail'
import { ObservedHistory } from './ObservedHistory'
import type { ObservedChange } from './check-history'
import { PLACE_CATALOG, noticeMatchesPlace, withPlaceCatalog } from './place-catalog'

type Page = 'home' | 'browse' | 'history' | 'settings' | 'setup' | 'search' | 'confirm' | 'well' | 'sampleIntro' | 'detail' | 'alerts' | 'sources' | 'privacy' | 'installation'
type RemovedPlace = { id: string; index: number; lifted: boolean }
export interface LiveData { sources: SourceSnapshot[]; places: Place[]; archive: Notice[]; coverageStart: string | null; recentChanges?: ObservedChange[] }
const emptyLive: LiveData = { sources: EMPTY_SOURCES, places: [], archive: [], coverageStart: null }
function savedMode(): Mode { if (new URLSearchParams(window.location.search).has('notice')) return 'live'; try { return localStorage.getItem('water-alert:mode') === 'sample' ? 'sample' : 'live' } catch { return 'live' } }

export default function App({ liveData = emptyLive, onRefresh, onLiveOpen }: { liveData?: LiveData; onRefresh?: () => Promise<void>; onLiveOpen?: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>(savedMode)
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences(savedMode()))
  const [page, setPage] = useState<Page>(() => loadPreferences(savedMode()).watches.length ? 'home' : 'setup')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Place['kind']>('system')
  const [candidate, setCandidate] = useState<Place | null>(null)
  const [removed, setRemoved] = useState<RemovedPlace | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [linkedId, setLinkedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('notice'))
  const [device, setDevice] = useState(pushDevice)
  const [habAvailable, setHabAvailable] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)
  const main = useRef<HTMLElement>(null)
  const sample = mode === 'sample'
  const words = prefs.language === 'en' ? en : es
  const t = sample ? words : { ...words, disconnected: words.pushInfo }
  const sources = sample ? sampleSources(habAvailable) : liveData.sources
  const places = sample ? samplePlaces : withPlaceCatalog(liveData.places)
  const archive = sample ? sampleArchive : liveData.archive
  const clock = sample ? SAMPLE_NOW : now
  const watched = prefs.watches.map(id => places.find(p => p.id === id)).filter((p): p is Place => !!p)
  const missingWatches = prefs.watches.filter(id => !places.some(p => p.id === id))
  const place = places.find(p => p.id === selected)
  const source = sources.find(s => s.agency === (place?.kind === 'system' ? 'ADH' : 'ADEQ'))
  const selectedStatus = place ? statusFor(place.id, source, clock) : null
  const linkedNotice = !sample && linkedId && selected ? archive.find(n => n.id === linkedId && noticeMatchesPlace(selected, n)) : undefined
  const recent = !sample ? (liveData.recentChanges ?? []).filter(e => prefs.watches.some(id => noticeMatchesPlace(id, e.notice)) && statusFor(e.notice.placeId, sources.find(s => s.agency === e.notice.agency), clock).state !== 'unavailable') : []

  useEffect(() => {
    if (mode !== 'live' || !linkedId) return
    const notice = liveData.archive.find(n => n.id === linkedId)
    const target = notice ? withPlaceCatalog(liveData.places).find(p => noticeMatchesPlace(p.id, notice)) : undefined
    if (target) { setSelected(target.id); setPage('detail'); window.history.replaceState(null, '', window.location.pathname) }
  }, [mode, linkedId, liveData.archive, liveData.places])
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
  useEffect(() => { if (!savePreferences(mode, prefs)) setMessage(t.storageError) }, [mode, prefs, t.storageError])
  useLayoutEffect(() => { main.current?.focus(); window.scrollTo?.(0, 0) }, [page, mode])

  function navigate(next: Page) { setPage(next); setLinkedId(null); setMessage('') }
  function changeMode(next: Mode) {
    const nextPrefs = loadPreferences(next)
    setMode(next); setPrefs(nextPrefs); setSelected(null); setCandidate(null); setRemoved(null); setLinkedId(null); setQuery(''); setHabAvailable(false); setMessage('')
    navigate(next === 'sample' ? 'sampleIntro' : nextPrefs.watches.length ? 'home' : 'setup')
    try { localStorage.setItem('water-alert:mode', next) } catch { setMessage(t.storageError) }
  }
  function search(kind: Place['kind']) { setKind(kind); setQuery(''); setCandidate(null); navigate('search') }
  function confirmWatch() {
    if (!candidate) return
    setPrefs(p => ({ ...p, watches: p.watches.includes(candidate.id) ? p.watches : [...p.watches, candidate.id] }))
    setRemoved(null); setCandidate(null); navigate('home')
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
  function sampleList() { setPrefs(p => ({ ...p, watches: ['ADH:sample-creek', 'ADH:sample-ridge', 'ADEQ:sample-cove'] })); setRemoved(null); navigate('home') }
  async function refresh() { if (!onRefresh || sample) return; setBusy(true); try { await onRefresh(); setNow(Date.now()) } finally { setBusy(false) } }
  async function share(n: Notice) {
    const title = n.lifted ? t.explicitLift : selectedStatus?.state === 'unavailable' || linkedNotice ? n.kind === 'boil' ? t.previousBoil : t.previousHab : n.kind === 'boil' ? t.boil : t.hab
    const text = `${sample ? t.sampleShare + '\n' : ''}${n.name}\n${title}\n${selectedStatus?.state === 'unavailable' ? t.unverified + '\n' : ''}${t.affected}: ${n.area}\n${t.issued}: ${n.issued ?? t.unknown}\n${n.url}\n${t.noSafety}`
    try { if (navigator.share) await navigator.share({ title: 'Water Alert', text }); else { await navigator.clipboard.writeText(text); setMessage(t.shareCopied) } } catch { setMessage(t.shareFailed) }
  }
  function askLift() { if (selected) setPrefs(p => ({ ...p, liftWatches: [...new Set([...p.liftWatches, selected])] })); navigate('alerts') }
  async function deleteDevice() {
    setBusy(true)
    try { await disablePush(); setDevice(null) } catch { setMessage(t.pushFailed); setBusy(false); return }
    try { for (const key of ['water-alert:live:v1', 'water-alert:sample:v1', 'water-alert:mode', 'water-alert:live-check:v1']) localStorage.removeItem(key) } catch { setMessage(t.storageError); setBusy(false); return }
    setPrefs(defaults()); setMode('live'); setSelected(null); setCandidate(null); setRemoved(null); setLinkedId(null); setMessage(''); setPage('setup')
    setBusy(false)
  }
  const navPage = ['alerts', 'sources', 'privacy', 'installation'].includes(page) ? 'settings' : page === 'detail' ? 'home' : ['search', 'confirm', 'well'].includes(page) ? 'browse' : page
  const nav = (['home', 'browse', 'history', 'settings'] as const).map(item => <button key={item} aria-current={navPage === item ? 'page' : undefined} onClick={() => navigate(item)}><Icon name={item} /><span>{t[item]}</span></button>)
  const settingsLinks = [
    { page: 'alerts' as const, title: t.alertOptions, help: t.alertHelp, icon: 'bell' as const },
    { page: 'browse' as const, title: t.watched, help: t.managePlaces, icon: 'browse' as const },
    { page: 'sources' as const, title: t.sources, help: t.sourcesHelp, icon: 'water' as const },
    { page: 'privacy' as const, title: t.privacy, help: t.privacyHelp, icon: 'settings' as const },
    { page: 'installation' as const, title: t.installation, help: t.installationHelp, icon: 'home' as const },
  ]

  return <>
    <a className="skip-link" href="#main">{prefs.language === 'en' ? 'Skip to content' : 'Ir al contenido'}</a>
    <header className="app-header"><div className="header-inner"><button className="brand" onClick={() => navigate('home')} aria-label="Water Alert"><span className="brand-mark"><Icon name="water" /></span><span>Water Alert<small>Arkansas</small></span></button><nav aria-label={prefs.language === 'en' ? 'Main navigation' : 'Navegación principal'}>{nav}</nav><div className="lang-switch" aria-label={t.language}><button aria-pressed={prefs.language === 'en'} onClick={() => setPrefs(p => ({ ...p, language: 'en' }))}>EN</button><button aria-pressed={prefs.language === 'es'} onClick={() => setPrefs(p => ({ ...p, language: 'es' }))}>ES</button></div></div></header>
    {sample ? <section className="sample-banner" aria-label={t.sample}><div><b>{t.sample}</b><span>{t.sampleText}</span><button onClick={() => changeMode('live')}>{t.exit}</button></div></section> : null}
    <main id="main" ref={main} tabIndex={-1}>
      <div role="status" className={message ? 'message' : 'sr-only'}>{message}</div>
      {!sample && device && device.signature !== pushSignature(prefs) ? <p className="info">{t.pushDirty} <button className="text-button" onClick={() => navigate('alerts')}>{t.alertOptions}</button></p> : null}
      {page === 'setup' ? <Welcome t={t} onSearch={search} onWell={() => navigate('well')} onSample={() => sample ? navigate('sampleIntro') : changeMode('sample')} /> : null}
      {page === 'search' ? <SearchPlace key={`${mode}:${kind}`} kind={kind} places={places} query={query} onQuery={setQuery} t={t} onBack={() => navigate('setup')} onSelect={p => { setCandidate(p); navigate('confirm') }} /> : null}
      {page === 'confirm' && candidate ? <ConfirmPlace place={candidate} t={t} onConfirm={confirmWatch} onBack={() => navigate('search')} /> : null}
      {page === 'well' ? <PrivateWell t={t} onBack={() => navigate('setup')} onLake={() => search('lake')} /> : null}
      {page === 'sampleIntro' ? <SampleIntro t={t} onStart={() => search('system')} onList={sampleList} /> : null}
      {page === 'home' ? <>
        <div className="page-heading"><div><h1>{t.myWater}</h1><p>{t.subtitle}</p></div>{!sample ? <button className="secondary" onClick={refresh} disabled={busy || !onRefresh}>{busy ? t.refreshing : t.refresh}</button> : null}</div>
        {sample ? <p className="sample-home">{t.sampleHome}</p> : null}
        <div className="home-layout"><div className="home-main">
          {recent.length ? <Panel><h2>{t.sinceVisit}</h2><p>{t.sinceVisitInfo}</p>{recent.map(e => <div key={e.id} className="watched-row"><span>{e.notice.name} · {e.type === 'lifted' ? t.agencyLifted : t.active} · {appTimestamp(e.observedAt, prefs.language)}</span><button className="text-button" onClick={() => { setSelected(e.notice.placeId); navigate('detail'); setLinkedId(e.notice.id) }}>{t.view}</button></div>)}</Panel> : null}
          {!prefs.watches.length ? <Panel><p>{t.noWatches}</p><button className="primary" onClick={() => navigate('setup')}>{t.setup}</button></Panel> : <div className="status-grid">{watched.map(p => <StatusCard key={p.id} place={p} archive={archive} source={sources.find(s => s.agency === (p.kind === 'system' ? 'ADH' : 'ADEQ'))} now={clock} t={t} language={prefs.language} sample={sample} onView={() => { setSelected(p.id); navigate('detail') }} />)}{missingWatches.map(id => <Panel className="status-card unavailable" key={id}><p className="status-label"><span className="status-symbol" aria-hidden="true">?</span>{t.unavailable}</p><p>{t.missingPlace}</p><p className="quiet-note">{id}</p><button className="secondary" onClick={() => navigate('browse')}>{t.watched}</button></Panel>)}</div>}
          <button className="add-place" onClick={() => navigate('setup')}>+ {t.add}</button>
          {sample ? <label className="scenario-toggle"><input type="checkbox" checked={habAvailable} onChange={e => setHabAvailable(e.target.checked)} />{t.habScenario}</label> : null}
        </div><aside className="home-sidebar"><section className="about-results"><h2>{t.aboutResults}</h2><p>{t.resultsSummary}</p><button className="text-button" onClick={() => navigate('sources')}>{t.sources}</button></section><section className="home-alert-options"><h2><Icon name="bell" />{t.alertOptions}</h2><p>{t.alertSummary}</p><button className="text-button" onClick={() => navigate('alerts')}>{t.manageAlerts}</button><p className="delivery-status">{sample ? t.disconnected : device ? device.signature !== pushSignature(prefs) ? t.pushDirty : t.pushSaved : t.deliveryOff}</p></section></aside></div>
      </> : null}
      {page === 'detail' && place ? <NoticeDetail place={place} source={source} now={clock} linkedNotice={linkedNotice} t={t} language={prefs.language} sample={sample} onBack={() => navigate('home')} onShare={n => void share(n)} onAlerts={askLift} /> : null}
      {page === 'browse' ? <div className="narrow-page"><div className="page-heading"><div><h1>{t.watched}</h1><p>{t.placesIntro}</p></div></div><Panel>
        {!prefs.watches.length ? <p>{t.noWatches}</p> : null}
        {prefs.watches.map(id => { const p = places.find(p => p.id === id); return <div className="place-row" key={id}><Icon name={p?.kind === 'lake' ? 'water' : 'browse'} /><div><h2>{p?.name ?? id}</h2><p>{p ? `${p.county} · ${p.kind === 'system' ? 'ADH' : 'ADEQ'}` : t.missingPlace}</p></div><button className="text-button" aria-label={`${t.remove} ${p?.name ?? id}`} onClick={() => removeWatch(id)}>{t.remove}</button></div> })}
        {removed ? <div className="undo-row" role="status"><span>{t.removed}</span><button className="text-button" onClick={undoRemove}>{t.undo}</button></div> : null}
        <div className="add-choices"><button onClick={() => search('system')}>+ {t.addSupplier}</button><button onClick={() => search('lake')}>+ {t.addLake}</button></div><p className="info">{t.coverage}</p>
      </Panel></div> : null}
      {page === 'history' ? <ObservedHistory archive={archive} watches={prefs.watches} coverageStart={sample ? sampleArchive.find(n => n.lifted)?.firstObservedAt ?? null : liveData.coverageStart} t={t} language={prefs.language} /> : null}
      {page === 'settings' ? <div className="narrow-page"><div className="page-heading"><div><h1>{t.settings}</h1><p>{t.settingsIntro}</p></div></div><Panel className="settings-menu">{settingsLinks.map(link => <button className="choice" key={link.page} onClick={() => navigate(link.page)}><span className="choice-icon"><Icon name={link.icon} /></span><span><b>{link.title}</b><small>{link.help}</small></span><span aria-hidden="true">›</span></button>)}</Panel>
        <label className="checkbox-row"><input type="checkbox" checked={prefs.checkOnOpen} onChange={e => setPrefs(p => ({ ...p, checkOnOpen: e.target.checked }))} />{t.checkOnOpen}</label><hr /><h2>{t.sample}</h2><p>{t.sampleText}</p><button className="secondary full" onClick={() => changeMode(sample ? 'live' : 'sample')}>{sample ? t.exit : t.trySample}</button><hr /><p>{t.deletionText}</p><button className="danger full" disabled={busy} onClick={() => void deleteDevice()}>{t.delete}</button>
      </div> : null}
      {['alerts', 'sources', 'privacy', 'installation'].includes(page) ? <div className="narrow-page"><button className="back" onClick={() => navigate('settings')}>‹ {t.settings}</button>
        {page === 'alerts' ? <><h1>{t.alertOptions}</h1><Panel><h2>{t.alerts}</h2><p>{t.disconnected}</p><label className="checkbox-row"><input type="checkbox" checked={prefs.liftWatches.length > 0} disabled={!prefs.watches.length} onChange={e => setPrefs(p => ({ ...p, liftWatches: e.target.checked ? [...p.watches] : [] }))} />{t.liftOption}</label><PushPanel mode={mode} prefs={prefs} t={t} onChange={() => setDevice(pushDevice())} /><p>{t.iOS}</p></Panel><p className="info">{t.noSafety}</p></> : null}
        {page === 'privacy' ? <><h1>{t.privacy}</h1><Panel><p>{t.privacyText}</p><p>{t.deletionText}</p><button className="danger full" disabled={busy} onClick={() => void deleteDevice()}>{t.delete}</button></Panel></> : null}
        {page === 'installation' ? <><h1>{t.installation}</h1><Panel><p>{t.iOS}</p><p>{t.pushUnsupported}</p><p className="info">{t.pushInfo}</p></Panel></> : null}
        {page === 'sources' ? <><h1>{t.sources}</h1><Panel><p>{t.retrieval}</p><p>{t.limits}</p><p>{t.sourceCoverage}</p>{sources.map(s => <div className="source-entry" key={s.agency}><h2>{s.agency === 'ADH' ? 'Arkansas Department of Health (ADH)' : 'Arkansas Division of Environmental Quality (ADEQ)'}</h2><SourceLink url={SOURCES[s.agency]}>{t.sourceLink}</SourceLink><dl><DateRow label={t.checked} value={s.retrievedAt} app language={prefs.language} /><DateRow label={t.lastSuccess} value={s.lastSuccessAt} app language={prefs.language} /></dl><p>{statusFor('', s, clock).state === 'unavailable' ? t.unavailable : t.sourceRetrieved}</p></div>)}</Panel>{!sample ? <Panel><h2>{t.catalogSource}</h2><p>{t.catalogHelp}</p><p>{t.catalogWaterbody}</p><p>{t.catalogSupplier}</p>{PLACE_CATALOG.map(entry => <p key={entry.place.id}><SourceLink url={entry.url}>{entry.place.name}</SourceLink></p>)}</Panel> : null}<p className="info">{t.noSafety}</p></> : null}
      </div> : null}
    </main><footer className="app-footer">ADH · ADEQ <span>{prefs.language === 'en' ? 'Published notices, not a safety assessment.' : 'Avisos publicados, no una evaluación de seguridad.'}</span></footer>
  </>
}
