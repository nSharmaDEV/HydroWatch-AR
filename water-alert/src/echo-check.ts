import { useCallback, useEffect, useRef, useState } from 'react'
import { ECHO_RECORD_KEY, type EchoCheck, type EchoRecordSet } from './echo-records'
import { readChecks, writeCheck } from './report-check'
import { directorySystem } from './water-system-directory'

/**
 * One device's on-demand EPA ECHO record lookups, kept beside the existing
 * annual-report check and stored the same way: on this device only, never on
 * WAVE's server, and never written into live advisory state.
 *
 * A failed lookup is never saved. "We could not check" must never be stored or
 * read as "no records", and no record state is ever an all-clear.
 */

export type EchoStatus = 'idle' | 'checking' | 'checked' | 'none' | 'incomplete' | 'unsupported'
export interface EchoCheckState { records?: EchoRecordSet; checkedOn?: string; status: EchoStatus; check: () => void; supported: boolean }

interface StoredEcho { records?: EchoRecordSet; none?: { pwsid: string; retrievedOn: string; extractOn?: string } }

export function useEchoRecords(placeId: string, enabled: boolean): EchoCheckState {
  const [snapshot, setSnapshot] = useState<{ placeId: string; value?: StoredEcho }>()
  const stored = enabled && snapshot?.placeId === placeId ? snapshot.value : undefined
  const generation = useRef(0)
  const inFlight = useRef(false)
  const setStored = (value: StoredEcho | undefined) => setSnapshot({ placeId, value })
  const [status, setStatus] = useState<EchoStatus>('idle')
  const supported = enabled && !!directorySystem(placeId)?.pwsid
  useEffect(() => {
    setStored(enabled ? readChecks<StoredEcho>(ECHO_RECORD_KEY)[placeId] : undefined)
    setStatus('idle')
    generation.current++
    return () => { generation.current++ }
  }, [placeId, enabled])
  const check = useCallback(async () => {
    if (!supported || inFlight.current) return
    inFlight.current = true
    const token = ++generation.current
    setStatus('checking')
    try {
      const response = await fetch('/api/echo-records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }), signal: AbortSignal.timeout(45_000),
      })
      if (token !== generation.current) return
      if (!response.ok) { setStatus('incomplete'); return }
      const result = await response.json() as EchoCheck
      if (token !== generation.current) return
      if (result.state === 'retrieved') {
        const saved: StoredEcho = { records: result.records }
        writeCheck(ECHO_RECORD_KEY, placeId, saved); setStored(saved); setStatus('checked')
      } else if (result.state === 'none') {
        const previous = readChecks<StoredEcho>(ECHO_RECORD_KEY)[placeId]
        const saved: StoredEcho = { ...(previous?.records ? { records: previous.records } : {}), none: { pwsid: result.pwsid, retrievedOn: result.retrievedOn, ...(result.extractOn ? { extractOn: result.extractOn } : {}) } }
        writeCheck(ECHO_RECORD_KEY, placeId, saved); setStored(saved); setStatus('none')
      } else setStatus(result.state === 'unsupported' ? 'unsupported' : 'incomplete')
    } catch { if (token === generation.current) setStatus('incomplete') }
    finally { inFlight.current = false }
  }, [placeId, supported])
  const records = enabled ? stored?.records : undefined
  return {
    ...(records ? { records } : {}),
    ...(stored?.none?.retrievedOn ?? stored?.records?.retrievedOn ? { checkedOn: stored?.none?.retrievedOn ?? stored?.records?.retrievedOn } : {}),
    status: status === 'idle' && enabled && stored ? (stored.none ? 'none' : 'checked') : status,
    check, supported,
  }
}

/** The saved record set for a place, without React. Used by Help and email. */
export function savedEchoRecords(placeId: string, sample: boolean): EchoRecordSet | undefined {
  if (sample) return undefined
  return readChecks<StoredEcho>(ECHO_RECORD_KEY)[placeId]?.records
}
