import { noticeMatchesPlace } from './place-catalog.js'

export type Agency = 'ADH' | 'ADEQ'
export type Mode = 'live' | 'sample'
export type Language = 'en' | 'es'
export interface Place { id: string; name: string; kind: 'system' | 'lake'; county: string; aliases?: string[] }
export interface Notice {
  id: string; placeId: string; name: string; agency: Agency; kind: 'boil' | 'hab';
  area: string; county: string; issued: string | null; lifted: string | null;
  reason: string; url: string; sourceUpdatedAt?: string;
  firstObservedAt?: string; lastObservedAt?: string;
  guidance?: { quote: string; url: string; verifiedAt: string };
  liftStatus?: 'unknown';
}
export type SourceCheck = { at: string; outcome: 'success'; records: Notice[] } | { at: string; outcome: 'failure'; error: string }
export interface SourceSnapshot {
  agency: Agency; records: Notice[]; retrievedAt: string | null; lastSuccessAt: string | null; error: string | null;
  checks?: SourceCheck[];
  lastSuccessfulCheck?: Extract<SourceCheck, { outcome: 'success' }> | null;
  historyStartedAt?: string;
}
export const SOURCES = {
  ADH: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx',
  ADEQ: 'https://adeq.state.ar.us/water/planning/hab/advisories.json',
} as const
export const EMPTY_SOURCES: SourceSnapshot[] = (['ADH', 'ADEQ'] as const).map(agency => ({ agency, records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }))

export function statusFor(placeId: string, snapshot: SourceSnapshot | undefined, now = Date.now()) {
  const records = snapshot?.records.filter(n => noticeMatchesPlace(placeId, n) && !n.lifted) ?? []
  const age = snapshot?.lastSuccessAt ? now - Date.parse(snapshot.lastSuccessAt) : NaN
  const unavailable = !snapshot || !!snapshot.error || !Number.isFinite(age) || age < 0 || age >= 900_000 || records.some(n => n.liftStatus === 'unknown')
  return { state: unavailable ? 'unavailable' as const : records.length ? 'active' as const : 'none' as const, records }
}
export function resolvePlaces(query: string, places: Place[]) {
  const q = query.trim().toLocaleLowerCase()
  return places.filter(p => !q || [p.name, p.county, ...(p.aliases ?? [])].some(value => value.toLocaleLowerCase().includes(q)))
    .sort((a, b) => Number(!/Benton|Washington|Carroll|Madison/i.test(a.county)) - Number(!/Benton|Washington|Carroll|Madison/i.test(b.county)) || a.name.localeCompare(b.name))
}
export function changes(previous: Notice[], next: Notice[]) {
  const old = new Map(previous.map(n => [n.id, n]))
  return next.flatMap<{ type: 'new' | 'lifted'; notice: Notice }>(n => !old.has(n.id) && !n.lifted && n.liftStatus !== 'unknown' ? [{ type: 'new', notice: n }] : old.has(n.id) && !old.get(n.id)!.lifted && old.get(n.id)!.liftStatus !== 'unknown' && n.lifted ? [{ type: 'lifted', notice: n }] : [])
}
