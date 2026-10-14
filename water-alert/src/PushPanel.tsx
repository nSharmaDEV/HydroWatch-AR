import type { Mode } from './domain'
import type { Preferences } from './storage'
import type { Strings } from './strings'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushDevice, pushSignature, supportsPush } from './push'
export function PushPanel({ mode, prefs, t, onChange }: { mode: Mode; prefs: Preferences; t: Strings; onChange: () => void }) {
  const [config, setConfig] = useState<{ enabled: boolean; publicKey: string | null } | null>(null)
  const [device, setDevice] = useState(pushDevice)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'saved' | 'removed' | 'failed' | null>(null)
  useEffect(() => {
    if (mode !== 'live') return
    let cancelled = false
    const controller = new AbortController()
    void fetch('/api/push/config', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unavailable')
      const value = await response.json()
      if (!cancelled) setConfig({ enabled: value.enabled === true && typeof value.publicKey === 'string', publicKey: typeof value.publicKey === 'string' ? value.publicKey : null })
    }).catch(() => { if (!cancelled) setConfig({ enabled: false, publicKey: null }) })
    return () => { cancelled = true; controller.abort() }
  }, [mode])
  if (mode === 'sample') return <p className="info">{t.disconnected}</p>
  async function apply(remove = false) {
    setBusy(true); setResult(null)
    try {
      if (remove) await disablePush(); else await enablePush(mode, prefs, config!.publicKey!)
      setDevice(pushDevice()); setResult(remove ? 'removed' : 'saved'); onChange()
    } catch { setResult('failed') } finally { setBusy(false) }
  }
  const dirty = device && device.signature !== pushSignature(prefs)
  return <div className="push-controls">
    <p>{t.pushInfo}</p>
    <p className="info">{!config ? t.pushChecking : !config.enabled ? t.pushUnavailable : !supportsPush() ? t.pushUnsupported : device ? t.pushSaved : t.iOS}</p>
    {dirty ? <p className="info">{t.pushDirty}</p> : null}
    {!prefs.watches.length ? <p>{t.pushNeedsPlaces}</p> : null}
    <div className="actions"><button className="primary" disabled={busy || !config?.enabled || !supportsPush() || !prefs.watches.length} onClick={() => void apply()}>{busy ? t.pushBusy : device ? t.pushUpdate : t.pushEnable}</button>{device ? <button className="secondary" disabled={busy} onClick={() => void apply(true)}>{t.pushDisable}</button> : null}</div>
    <p role="status">{result === 'failed' ? t.pushFailed : result === 'saved' ? t.pushSaved : result === 'removed' ? t.pushRemoved : ''}</p>
  </div>
}
