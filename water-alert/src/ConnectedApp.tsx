import { useCallback, useRef, useState } from 'react'
import App, { type LiveData } from './App'
import { EMPTY_SOURCES, statusFor } from './domain'
import { checkedChanges, readCheckCursor, saveCheckCursor, type CheckCursor } from './check-history'

export default function ConnectedApp() {
  const [data, setData] = useState<LiveData>({ sources: EMPTY_SOURCES, places: [], archive: [], coverageStart: null })
  const baseline = useRef<CheckCursor | null>(null)
  const load = useCallback(async (check = false) => {
    try {
      const response = await fetch(check ? '/api/check' : '/api/status', { method: check ? 'POST' : 'GET', signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error('Local API unavailable')
      const next = await response.json()
      if (!Array.isArray(next.sources) || next.sources.length !== 2 || !Array.isArray(next.places) || !Array.isArray(next.archive)) throw new Error('Invalid local API response')
      baseline.current ??= readCheckCursor()
      const now = Date.now()
      for (const source of next.sources as LiveData['sources']) if (!baseline.current[source.agency] && source.lastSuccessAt && statusFor('', source, now).state !== 'unavailable') baseline.current[source.agency] = source.lastSuccessAt
      const recentChanges = checkedChanges(next, baseline.current, now)
      saveCheckCursor(next.sources, now)
      setData({ ...next, recentChanges })
    } catch { setData(previous => ({ ...previous, sources: previous.sources.map(s => ({ ...s, error: 'Local API unavailable' })) })) }
  }, [])
  const refresh = useCallback(() => load(true), [load])
  const open = useCallback(() => load(false), [load])
  return <App liveData={data} onRefresh={refresh} onLiveOpen={open} />
}
