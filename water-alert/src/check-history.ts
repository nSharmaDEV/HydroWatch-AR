import { statusFor, type Agency, type Notice, type SourceSnapshot } from './domain'
export interface ObservedChange { id: string; type: 'new' | 'lifted'; notice: Notice; observedAt: string }
export type CheckCursor = Partial<Record<Agency, string>>
const KEY = 'water-alert:live-check:v1'
export function checkedChanges(data: { sources: SourceSnapshot[]; events?: ObservedChange[] }, cursor: CheckCursor, now: number): ObservedChange[] {
  return (data.events ?? []).filter(event => {
    const source = data.sources.find(s => s.agency === event.notice.agency)
    const current = source?.records.find(n => n.id === event.notice.id)
    const since = Date.parse(cursor[event.notice.agency] ?? '')
    const observed = Date.parse(event.observedAt)
    return Number.isFinite(since) && observed > since && observed <= Date.parse(source?.lastSuccessAt ?? '') && statusFor(event.notice.placeId, source, now).state !== 'unavailable' && !!current && current.liftStatus !== 'unknown' && (event.type === 'new' ? !current.lifted : event.type === 'lifted' && !!current.lifted)
  }).slice(-50)
}
export function readCheckCursor(): CheckCursor {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return Object.fromEntries((['ADH', 'ADEQ'] as const).filter(agency => typeof value?.[agency] === 'string' && Number.isFinite(Date.parse(value[agency]))).map(agency => [agency, value[agency]]))
  } catch { return {} }
}
export function saveCheckCursor(sources: SourceSnapshot[], now: number): void {
  const cursor = readCheckCursor()
  for (const source of sources) if (source.lastSuccessAt && statusFor('', source, now).state !== 'unavailable') cursor[source.agency] = source.lastSuccessAt
  try { localStorage.setItem(KEY, JSON.stringify(cursor)) } catch { /* Check history is best-effort; never blocks current status. */ }
}
