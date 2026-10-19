import type { Mode } from './domain'
import type { Preferences } from './storage'
import type { Strings } from './strings'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushDevice, pushSignature, supportsPush } from './push'
export function PushPanel({ mode, prefs, t, onChange }: { mode: Mode; prefs: Preferences; t: Strings; onChange: () => void }) {
  const [config, setConfig] = useState<{ state: 'loading' | 'ready' | 'unsupported' | 'unavailable' | 'error'; publicKey?: string }>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [device, setDevice] = useState(pushDevice)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'saved' | 'removed' | 'failed' | null>(null)
  useEffect(() => {
    if (mode !== 'live') return
    if (!supportsPush()) { setConfig({ state: 'unsupported' }); return }
    setConfig({ state: 'loading' })
    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => { cancelled = true; controller.abort(); setConfig({ state: 'error' }) }, 10_000)
    void fetch('/api/push/config', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unavailable')
      const value = await response.json()
      if (value.enabled !== false && !(value.enabled === true && typeof value.publicKey === 'string' && value.publicKey.trim())) throw new Error('Invalid configuration')
      if (!cancelled) setConfig(value.enabled ? { state: 'ready', publicKey: value.publicKey } : { state: 'unavailable' })
    }).catch(() => { if (!cancelled) setConfig({ state: 'error' }) }).finally(() => clearTimeout(timeout))
    return () => { cancelled = true; clearTimeout(timeout); controller.abort() }
  }, [mode, attempt])
  if (mode === 'sample') return <p className="info">{t.disconnected}</p>
  async function apply(remove = false) {
    setBusy(true); setResult(null)
    try {
      if (remove) await disablePush(); else await enablePush(mode, prefs, config!.publicKey!)
      setDevice(pushDevice()); setResult(remove ? 'removed' : 'saved'); onChange()
    } catch { setResult('failed') } finally { setBusy(false) }
  }
  const dirty = device && device.signature !== pushSignature(prefs)
  const spanish = prefs.language === 'es'
  const status = result === 'failed' ? t.pushFailed : config.state === 'loading' ? t.pushChecking : config.state === 'unsupported' ? t.pushUnsupported : config.state === 'unavailable' ? t.pushUnavailable : config.state === 'error' ? t.pushSetupFailed : dirty ? t.pushDirty : result === 'removed' ? t.pushRemoved : device ? t.pushSaved : t.deliveryOff
  return <div className="push-controls" data-testid="push-controls" data-state={config.state}>
    <p>{t.pushInfo}</p>
    <p className="info" role="status">{status}</p>
    {config.state === 'error' || config.state === 'unavailable' ? <button className="secondary" onClick={() => setAttempt(n => n + 1)}>{spanish ? 'Reintentar configuración' : 'Retry configuration'}</button> : null}
    {!status.includes(t.deliveryUnverified) ? <p className="quiet-note">{t.deliveryUnverified}</p> : null}
    <details><summary>{t.notificationDetails}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.pushEvidence}</p><dl className="notification-facts"><div><dt>{spanish ? 'Preferencias locales' : 'Local preferences'}</dt><dd>{spanish ? 'Guardadas en este navegador; no activan envíos.' : 'Saved in this browser; do not enable delivery.'}</dd></div><div><dt>{spanish ? 'Permiso del navegador' : 'Browser permission'}</dt><dd>{typeof Notification === 'undefined' ? '—' : Notification.permission}</dd></div><div><dt>{spanish ? 'Registro del servidor' : 'Server registration'}</dt><dd>{device ? spanish ? 'Credencial guardada; estado actual no comprobado.' : 'Saved device credential; current registration not rechecked.' : spanish ? 'Sin credencial guardada.' : 'No saved device credential.'}</dd></div></dl></details>
    {!prefs.watches.length ? <p>{t.pushNeedsPlaces}</p> : null}
    <div className="actions"><button className="primary" disabled={busy || config.state !== 'ready' || !prefs.watches.length} onClick={() => void apply()}>{busy ? t.pushBusy : device ? t.pushUpdate : t.pushEnable}</button>{device ? <button className="secondary" disabled={busy} onClick={() => void apply(true)}>{t.pushDisable}</button> : null}</div>
    <p className="quiet-note">{t.notificationFooter}</p>
  </div>
}
