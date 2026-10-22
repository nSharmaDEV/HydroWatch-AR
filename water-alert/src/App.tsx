import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EMPTY_SOURCES, SOURCES, statusFor, type Mode, type Notice, type Place, type SourceSnapshot } from './domain'
import { defaults, loadPreferences, savePreferences, type Preferences } from './storage'
import { SAMPLE_NOW, sampleArchive, samplePlaces, sampleSources } from './sample'
import { APP_NAME, en, es } from './strings'
import { appTimestamp, DateRow, Icon, Panel, SourceLink, StatusCard } from './components'
import { PushPanel } from './PushPanel'
import { disablePush, enablePush, pushDevice, pushSignature, supportsPush } from './push'
import { ConfirmPlace, PrivateWell, SampleIntro, SearchPlace, Welcome } from './Journey'
import { NoticeDetail } from './NoticeDetail'
import { ObservedHistory } from './ObservedHistory'
import type { ObservedChange } from './check-history'
import { PLACE_CATALOG as FULL_PLACE_CATALOG, noticeMatchesPlace, withPlaceCatalog } from './place-catalog'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { CDC_GUIDANCE_URL } from './BoilWaterGuidance'
import { recoveryStrings } from './recovery-strings'
import { HelpGuide } from './HelpGuide'
import { ProviderCarousel } from './ProviderCarousel'

type Page = 'home' | 'browse' | 'history' | 'settings' | 'setup' | 'search' | 'confirm' | 'well' | 'sampleIntro' | 'detail' | 'help' | 'alerts' | 'sources' | 'privacy' | 'installation'
type RemovedPlace = { id: string; index: number; lifted: boolean }
const PLACE_CATALOG = FULL_PLACE_CATALOG.filter(entry => entry.place.kind === 'system')
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
  const [pushConfig, setPushConfig] = useState<{ state: 'loading' | 'ready' | 'unsupported' | 'unavailable' | 'error'; publicKey?: string }>({ state: 'loading' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [now, setNow] = useState(Date.now)
  const main = useRef<HTMLElement>(null)
  const helpReturn = useRef<{ page: Page; noticeId: string | null }>({ page: 'home', noticeId: null })
  const restoreHelpFocus = useRef(false)
  const sample = mode === 'sample'
  const words = prefs.language === 'en' ? en : es
  const t = { ...words, catalogWaterbody: '', ...(!sample ? { disconnected: words.pushInfo } : {}) }
  const sources = (sample ? sampleSources(false) : liveData.sources).filter(s => s.agency === 'ADH')
  const allPlaces = sample ? samplePlaces : withPlaceCatalog(liveData.places)
  const places = allPlaces.filter(p => p.kind === 'system')
  const activeWatches = prefs.watches.filter(id => !id.startsWith('ADEQ:') && !allPlaces.some(p => p.id === id && p.kind === 'lake'))
  const supplierPrefs = { ...prefs, watches: activeWatches, liftWatches: prefs.liftWatches.filter(id => activeWatches.includes(id)) }
  const archive = (sample ? sampleArchive : liveData.archive).filter(n => n.agency === 'ADH' && n.kind === 'boil')
  const clock = sample ? SAMPLE_NOW : now
  const watched = activeWatches.map(id => places.find(p => p.id === id)).filter((p): p is Place => !!p)
  const missingWatches = activeWatches.filter(id => !places.some(p => p.id === id))
  const place = places.find(p => p.id === selected)
  const source = sources.find(s => s.agency === (place?.kind === 'system' ? 'ADH' : 'ADEQ'))
  const selectedStatus = place ? statusFor(place.id, source, clock) : null
  const linkedNotice = linkedId && selected ? archive.find(n => n.id === linkedId && noticeMatchesPlace(selected, n)) : undefined
  const activeHelp = selectedStatus?.state === 'active' && (!linkedId || !!linkedNotice && selectedStatus.records.some(n => n.id === linkedNotice.id))
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

  function navigate(next: Page) { setPage(next); setLinkedId(null); setMessage(''); setConfirmDelete(false) }
  function openHelp(id: string) { helpReturn.current = { page, noticeId: linkedId }; setSelected(id); setPage('help'); setMessage('') }
  function closeHelp() { restoreHelpFocus.current = true; setPage(helpReturn.current.page); setLinkedId(helpReturn.current.noticeId) }
  function changeMode(next: Mode) {
    const nextPrefs = loadPreferences(next)
    if (next === 'sample') nextPrefs.language = prefs.language
    setMode(next); setPrefs(nextPrefs); setSelected(null); setCandidate(null); setRemoved(null); setLinkedId(null); setQuery(''); setMessage('')
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
  function sampleList() { setPrefs(p => ({ ...p, watches: ['ADH:sample-creek', 'ADH:sample-ridge'] })); setRemoved(null); navigate('home') }
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
    try { for (const key of ['water-alert:live:v1', 'water-alert:sample:v1', 'water-alert:mode', 'water-alert:live-check:v1']) localStorage.removeItem(key) } catch { setMessage(t.storageError); setBusy(false); return }
    setPrefs(defaults()); setMode('live'); setSelected(null); setCandidate(null); setRemoved(null); setLinkedId(null); setMessage(''); setPage('setup')
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
    catch (error) { setMessage(typeof Notification !== 'undefined' && (Notification.permission === 'denied' || error instanceof Error && error.message.toLowerCase().includes('permission')) ? t.pushPermissionDenied : t.pushSetupFailed) }
    finally { setBusy(false) }
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
    <header className="app-header"><div className="header-inner"><button className="brand" onClick={() => navigate('home')} aria-label={APP_NAME}><img className="brand-logo" src="/wave-logo.png" alt={APP_NAME} width="1830" height="416" /></button><nav aria-label={prefs.language === 'en' ? 'Main navigation' : 'Navegación principal'}>{nav}</nav><div className="lang-switch" aria-label={t.language}><button aria-pressed={prefs.language === 'en'} onClick={() => setPrefs(p => ({ ...p, language: 'en' }))}>EN</button><button aria-pressed={prefs.language === 'es'} onClick={() => setPrefs(p => ({ ...p, language: 'es' }))}>ES</button></div></div></header>
    {sample ? <section className="sample-banner" aria-label={t.sample}><div><b>{t.sample}</b><span>{t.sampleText}</span><button onClick={() => changeMode('live')}>{t.exit}</button></div></section> : null}
    <main id="main" ref={main} tabIndex={-1}>
      <div role="status" className={message ? 'message' : 'sr-only'}>{message}</div>
      {!sample && page !== 'home' && page !== 'alerts' && device && device.signature !== pushSignature(prefs) ? <p className="info">{t.pushDirty} <button className="text-button" onClick={() => navigate('alerts')}>{t.alertOptions}</button></p> : null}
      {page === 'setup' ? <Welcome t={t} onSearch={search} onWell={() => navigate('well')} onSample={() => sample ? navigate('sampleIntro') : changeMode('sample')} /> : null}
      {page === 'search' ? <SearchPlace key={`${mode}:${kind}`} kind={kind} places={places} query={query} onQuery={setQuery} t={t} onBack={() => navigate('setup')} onSelect={p => { setCandidate(p); navigate('confirm') }} /> : null}
      {page === 'confirm' && candidate ? <ConfirmPlace place={candidate} t={t} onConfirm={confirmWatch} onBack={() => navigate('search')} /> : null}
      {page === 'well' ? <PrivateWell t={t} onBack={() => navigate('setup')} /> : null}
      {page === 'sampleIntro' ? <SampleIntro t={t} onStart={() => search('system')} onList={sampleList} /> : null}
      {page === 'home' ? <>
        <h1 className="sr-only">{t.myWater}</h1>
        <div className="home-layout"><button className="primary add-place" onClick={() => navigate('setup')}>+ {t.add}</button><div className="home-main">
          {recent.length ? <Panel><h2>{t.sinceVisit}</h2><p>{t.sinceVisitInfo}</p>{recent.map(e => <div key={e.id} className="watched-row"><span>{e.notice.name} · {e.type === 'lifted' ? t.agencyLifted : t.active} · {appTimestamp(e.observedAt, prefs.language)}</span><button className="text-button" onClick={() => { setSelected(e.notice.placeId); navigate('detail'); setLinkedId(e.notice.id) }}>{t.view}</button></div>)}</Panel> : null}
          {!prefs.watches.length ? <Panel><p>{t.noWatches}</p><button className="primary" onClick={() => navigate('setup')}>{t.setup}</button></Panel> : <ProviderCarousel language={prefs.language}>{[...watched.map(p => <StatusCard key={p.id} place={p} archive={archive} source={sources.find(s => s.agency === (p.kind === 'system' ? 'ADH' : 'ADEQ'))} now={clock} t={t} language={prefs.language} sample={sample} checking={busy} onRefresh={onRefresh ? refresh : undefined} onHelp={() => openHelp(p.id)} onView={() => { setSelected(p.id); navigate('detail') }} onViewNotice={id => { setSelected(p.id); navigate('detail'); setLinkedId(id) }} />), ...missingWatches.map(id => <Panel className="status-card unavailable" key={`missing:${id}`}><p className="status-label"><span className="status-symbol" aria-hidden="true">?</span>{t.unavailable}</p><p>{t.missingPlace}</p><p className="quiet-note">{id}</p><button className="secondary" onClick={() => navigate('browse')}>{t.watched}</button></Panel>)]}</ProviderCarousel>}
        </div><aside className="home-sidebar"><section className="home-alert-options"><div className="sidebar-heading-row"><h2><Icon name="bell" />{t.waterUpdates}</h2><button type="button" role="switch" aria-label={t.waterUpdates} aria-checked={!sample && !!device} disabled={busy || sample} className="notification-switch" onClick={() => void togglePush()}><span aria-hidden="true" /></button></div>{sample || device ? <p className="delivery-status">{sample ? t.disconnected : device ? device.signature !== pushSignature(prefs) ? t.pushDirty : t.pushSaved : ''}</p> : null}<button className="text-button" onClick={() => navigate('alerts')}>{t.manageAlerts}</button></section><section className="about-results"><h2><Icon name="info" />{t.aboutResults}</h2><p>{t.resultsSummary}</p><button className="text-button" onClick={() => navigate('sources')}>{t.sources}</button></section></aside></div>
      </> : null}
      {page === 'detail' ? linkedId && !linkedNotice ? <Panel><p>{prefs.language === 'es' ? 'No se puede abrir este aviso guardado con los registros disponibles actualmente. No se ha sustituido por otro aviso.' : 'This saved notice cannot be opened from the currently available records. It has not been replaced with another notice.'}</p><button className="secondary" onClick={() => navigate('home')}>{t.back}</button></Panel> : place ? <NoticeDetail place={place} source={source} now={clock} linkedNotice={linkedNotice} t={t} language={prefs.language} sample={sample} onBack={() => navigate('home')} onShare={n => void share(n)} onAlerts={askLift} onHelp={() => openHelp(place.id)} /> : null : null}
      {page === 'help' && place ? <HelpGuide key={`${mode}:${place.id}:${linkedId ?? selectedStatus?.records.map(n => n.id).sort().join('|')}:${prefs.language}`} place={place} notice={linkedNotice ?? (selectedStatus?.records.length === 1 ? selectedStatus.records[0] : undefined)} active={activeHelp} language={prefs.language} sample={sample} onBack={closeHelp} /> : null}
      {page === 'browse' ? <div className="narrow-page"><div className="page-heading"><div><h1>{t.watched}</h1></div></div><Panel>
        {!activeWatches.length ? <p>{t.noWatches}</p> : null}
        {activeWatches.map(id => { const p = places.find(p => p.id === id); return <div className="place-row" key={id}><Icon name="browse" /><div><h2>{p?.name ?? id}</h2><p>{p ? `${p.county} · ADH` : t.missingPlace}</p></div><button className="text-button" aria-label={`${t.remove} ${p?.name ?? id}`} onClick={() => removeWatch(id)}>{t.remove}</button></div> })}
        {removed ? <div className="undo-row" role="status"><span>{t.removed}</span><button className="text-button" onClick={undoRemove}>{t.undo}</button></div> : null}
        <div className="add-choices"><button onClick={() => search('system')}>+ {t.addSupplier}</button></div>
      </Panel></div> : null}
      {page === 'history' ? <ObservedHistory archive={archive} watches={activeWatches} coverageStart={sample ? sampleArchive.find(n => n.lifted)?.firstObservedAt ?? null : liveData.coverageStart} t={t} language={prefs.language} /> : null}
      {page === 'settings' ? <div className="narrow-page"><div className="page-heading"><div><h1>{t.settings}</h1></div></div><Panel className="settings-menu">{settingsLinks.map(link => <button className="choice" key={link.page} onClick={() => navigate(link.page)}><span className="choice-icon"><Icon name={link.icon} /></span><span><b>{link.title}</b><small>{link.help}</small></span><span aria-hidden="true">›</span></button>)}</Panel>
        <label className="checkbox-row"><input type="checkbox" checked={prefs.checkOnOpen} onChange={e => setPrefs(p => ({ ...p, checkOnOpen: e.target.checked }))} />{t.checkOnOpen}</label><hr /><h2>{t.sample}</h2><p>{t.sampleText}</p><button className="secondary full" onClick={() => changeMode(sample ? 'live' : 'sample')}>{sample ? t.exit : t.trySample}</button><hr /><button className="danger full" disabled={busy} onClick={() => setConfirmDelete(true)}>{t.delete}</button>
        {confirmDelete ? <section aria-label={t.confirmRemoval}><p>{t.deletionText}</p><button className="danger" disabled={busy} onClick={() => void deleteDevice()}>{t.confirmRemoval}</button><button className="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>{t.cancel}</button></section> : null}
      </div> : null}
      {['alerts', 'sources', 'privacy', 'installation'].includes(page) ? <div className="narrow-page"><button className="back" onClick={() => navigate('settings')}>‹ {t.settings}</button>
        {page === 'sources' ? <><h1>{t.sources}</h1><Panel><h2>{t.advisorySources}</h2><p>{t.resultsSummary}</p>{sources.map(s => <div className="source-entry" key={s.agency}><h3>{s.agency === 'ADH' ? 'Arkansas Department of Health (ADH)' : 'Arkansas Division of Environmental Quality (ADEQ)'}</h3><SourceLink url={SOURCES[s.agency]}>{t.sourceLink}</SourceLink><dl><DateRow label={t.checked} value={s.retrievedAt} app language={prefs.language} />{s.lastSuccessAt ? <DateRow label={t.lastSuccess} value={s.lastSuccessAt} app language={prefs.language} /> : <div><dt>{t.lastSuccess}</dt><dd>{t.noSuccessfulCheck}</dd></div>}</dl><p>{statusFor('', s, clock).state === 'unavailable' ? t.unavailable : t.sourceRetrieved}</p></div>)}</Panel><Panel><h2>{t.coverageHeading}</h2><p>{t.sourceCoverage}</p><p>{t.catalogWaterbody}</p><p>{t.catalogSupplier}</p>{!sample ? <details><summary>{t.catalogSource}<span className="disclosure-icon" aria-hidden="true" /></summary>{PLACE_CATALOG.map(entry => <p key={entry.place.id}><SourceLink url={entry.url}>{entry.place.name}</SourceLink></p>)}</details> : null}</Panel><Panel><h2>{t.cannotTell}</h2><p>{t.limits}</p></Panel></> : null}
        {page === 'sources' ? <Panel><h2>{prefs.language === 'es' ? 'Referencias seleccionadas — no son fuentes de avisos en vivo' : 'Curated references — not live advisory feeds'}</h2><p>{prefs.language === 'es' ? 'Revisadas el 14 de octubre de 2026. No determinan el estado actual, la responsabilidad, el derecho a reembolso ni la elegibilidad para asistencia legal.' : 'Checked October 14, 2026. These do not determine current advisory status, liability, reimbursement entitlement or legal-aid eligibility.'}</p>{[['CDC — general drinking-water advisory guidance', CDC_GUIDANCE_URL], ['Arkansas Attorney General', RECOVERY_RESOURCES.complaint], ['AG complaint form — English', RECOVERY_RESOURCES.englishForm], ['Formulario de queja — español', RECOVERY_RESOURCES.spanishForm], ['Arkansas Law Help', RECOVERY_RESOURCES.legalHelp], ['Legal-aid intake', RECOVERY_RESOURCES.intake], ['Small-claims process and forms', RECOVERY_RESOURCES.court], ['ADH annual drinking-water reports', RECOVERY_RESOURCES.annualReports]].map(([label, url]) => <p key={url}><SourceLink url={url}>{label}</SourceLink></p>)}<p>{prefs.language === 'es' ? 'Los perfiles de proveedores son datos de directorio, no mediciones actuales. Verifique el proveedor y el año de cada informe. Las plantillas son texto de preparación editable, no consejo legal ni reclamaciones presentadas.' : 'Supplier profiles are directory facts, not live measurements. Verify the system and year of each report. Templates are editable preparation text, not legal advice or submitted claims.'}</p></Panel> : null}
        {page === 'alerts' ? <><h1>{t.alertOptions}</h1><Panel><h2>{t.alerts}</h2><label className="checkbox-row"><input type="checkbox" checked={supplierPrefs.liftWatches.length > 0} disabled={!activeWatches.length} onChange={e => setPrefs(p => ({ ...p, liftWatches: e.target.checked ? [...activeWatches] : [] }))} />{t.liftOption}</label><PushPanel mode={mode} prefs={supplierPrefs} t={t} onChange={() => setDevice(pushDevice())} /></Panel></> : null}
        {page === 'privacy' ? <><h1>{t.privacy}</h1><Panel><h2>{t.storedDevice}</h2><p>{t.privacyDevice}</p><p>{recoveryStrings[prefs.language].privacy}</p><h2>{t.storedPush}</h2><p>{t.privacyPush}</p><h2>{t.retentionDeletion}</h2><p>{t.privacyRetention}</p><button className="danger full" disabled={busy} onClick={() => setConfirmDelete(true)}>{t.delete}</button>{confirmDelete ? <section aria-label={t.confirmRemoval}><p>{t.deletionText}</p><button className="danger" disabled={busy} onClick={() => void deleteDevice()}>{t.confirmRemoval}</button><button className="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>{t.cancel}</button></section> : null}</Panel></> : null}
        {page === 'installation' ? <><h1>{t.installation}</h1><Panel><p>{/iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 ? t.iOS : t.installationGeneral}</p><button className="text-button" onClick={() => navigate('alerts')}>{t.setupNotifications}</button></Panel></> : null}
      </div> : null}
    </main>
  </>
}
