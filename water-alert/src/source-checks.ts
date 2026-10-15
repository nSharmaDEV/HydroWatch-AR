import type { SourceCheck, SourceSnapshot } from './domain'
import { noticeMatchesPlace } from './place-catalog'

export function resultForCheck(placeId: string, check: SourceCheck) {
  const records = check.outcome === 'success' ? check.records.filter(n => noticeMatchesPlace(placeId, n)) : []
  const state = check.outcome === 'failure' ? 'failure' : records.some(n => n.liftStatus === 'unknown' && !n.lifted) ? 'unknown' : records.some(n => !n.lifted) ? 'active' : 'none'
  return { state, records }
}
function signature(placeId: string, check: SourceCheck) {
  if (check.outcome === 'failure') return JSON.stringify(['failure', check.error])
  // Observation times change each check; published facts and identity do not.
  const records = resultForCheck(placeId, check).records.map(({ firstObservedAt: _first, lastObservedAt: _last, ...facts }) => facts).sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify(['success', records])
}
export function groupChecks(placeId: string, checks: SourceCheck[], dateKey?: (at: string) => string): SourceCheck[][] {
  const groups: SourceCheck[][] = []
  let previous = ''
  for (const check of checks) {
    const key = JSON.stringify([signature(placeId, check), dateKey?.(check.at)])
    if (check.outcome === 'success' && groups.length && key === previous) groups[groups.length - 1].push(check)
    else groups.push([check])
    previous = key
  }
  return groups
}
export function unavailableReason(source: SourceSnapshot | undefined, now: number) {
  if (source?.error === 'Local API unavailable') return 'offline'
  if (!source?.retrievedAt) return 'never'
  if (source.error) return source.error.includes('format') ? 'format' : 'failed'
  const age = source.lastSuccessAt ? now - Date.parse(source.lastSuccessAt) : NaN
  if (Number.isFinite(age) && age >= 900000) return 'stale'
  return 'unconfirmed'
}
