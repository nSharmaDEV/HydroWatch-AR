import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from './domain'
import { readChecks, writeCheck } from './report-check'

/**
 * One device's on-demand reads of ADH's water-system directory page. Directory
 * facts only, shown with the date they were read. A refreshed page is held on
 * this device; the shipped, hand-reviewed reference snapshot is not modified.
 */
export const WATER_SYSTEM_CHECK_KEY = 'wave:water-system-check:v1'

export interface SystemFacts {
  systemId: string
  population?: string
  sourceType?: string
  systemType?: string
  sourceNames: string[]
  inspection?: string
}
export interface StoredSystem { facts: SystemFacts; sourceUrl: string; checkedAt: string }
export type SystemStatus = 'idle' | 'checking' | 'mismatch' | 'incomplete'
export interface SystemCheckState { record?: StoredSystem; status: SystemStatus; check: () => void }

/**
 * ADH's printed wording, translated only where the exact phrase is known.
 * Anything else is shown as ADH prints it rather than guessed at.
 */
const SOURCE_TYPES: Record<string, Record<Language, string>> = {
  'GROUND': { en: 'Groundwater', es: 'Agua subterránea' },
  'SURFACE': { en: 'Surface water', es: 'Agua superficial' },
  'SURFACE PURCHASED': { en: 'Purchased surface water', es: 'Agua superficial comprada' },
  'GROUND PURCHASED': { en: 'Purchased groundwater', es: 'Agua subterránea comprada' },
}
const SYSTEM_TYPES: Record<string, Record<Language, string>> = {
  'COMMUNITY': { en: 'Community system', es: 'Sistema comunitario' },
  'NON-TRANSIENT NON-COMMUNITY': { en: 'Non-transient non-community system', es: 'Sistema no transitorio no comunitario' },
  'TRANSIENT NON-COMMUNITY': { en: 'Transient non-community system', es: 'Sistema transitorio no comunitario' },
}
const asPrinted = (value: string): Record<Language, string> => ({ en: value, es: value })
export const sourceTypeText = (value?: string) => value ? SOURCE_TYPES[value.toUpperCase()] ?? asPrinted(value) : undefined
export const systemTypeText = (value?: string) => value ? SYSTEM_TYPES[value.toUpperCase()] ?? asPrinted(value) : undefined

export function useWaterSystemCheck(placeId: string, enabled: boolean): SystemCheckState {
  const [record, setRecord] = useState<StoredSystem>()
  const [status, setStatus] = useState<SystemStatus>('idle')
  const inFlight = useRef(false)
  const generation = useRef(0)
  useEffect(() => {
    setRecord(enabled ? readChecks<StoredSystem>(WATER_SYSTEM_CHECK_KEY)[placeId] : undefined)
    setStatus('idle')
    generation.current++
    return () => { generation.current++ }
  }, [placeId, enabled])
  const check = useCallback(async () => {
    if (!enabled || inFlight.current) return
    inFlight.current = true
    const token = generation.current
    setStatus('checking')
    try {
      const response = await fetch('/api/water-system/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }), signal: AbortSignal.timeout(40_000),
      })
      if (token !== generation.current) return
      if (!response.ok) { setStatus('incomplete'); return }
      const result = await response.json() as { state: string; facts?: SystemFacts; sourceUrl?: string; checkedAt?: string }
      if (token !== generation.current) return
      // Only a page ADH published under this system's own name is recorded.
      if (result.state === 'verified' && result.facts && result.sourceUrl && result.checkedAt) {
        const saved: StoredSystem = { facts: result.facts, sourceUrl: result.sourceUrl, checkedAt: result.checkedAt }
        writeCheck(WATER_SYSTEM_CHECK_KEY, placeId, saved); setRecord(saved); setStatus('idle')
      } else setStatus(result.state === 'mismatch' ? 'mismatch' : 'incomplete')
    } catch { if (token === generation.current) setStatus('incomplete') }
    finally { inFlight.current = false }
  }, [placeId, enabled])
  return { record: enabled ? record : undefined, status, check }
}
