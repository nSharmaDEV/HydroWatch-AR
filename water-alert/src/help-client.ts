import type { HelpDraft, HelpRequest } from './help-requests'
export interface HelpSession { enabled: boolean; user: { id: string; email: string } | null; delivery: boolean; accountUrl: string | null }
export const SAMPLE_HELP_KEY = 'water-alert:sample-help:v1'
export const LIVE_LOCAL_HELP_KEY = 'water-alert:live-help:v1'
export async function helpApi<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const r = await fetch(`/api/help${path}`, { method, credentials: 'same-origin', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!r.ok) throw new Error(r.status === 401 ? 'signin' : r.status === 409 ? 'conflict' : 'unavailable')
  return r.status === 204 ? undefined as T : await r.json()
}
function deviceRequests(key: string, label: string): HelpRequest[] { const raw = localStorage.getItem(key); if (!raw) return []; const value = JSON.parse(raw); if (!Array.isArray(value)) throw new Error(`Invalid ${label} storage`); return value }
export function sampleRequests(): HelpRequest[] { return deviceRequests(SAMPLE_HELP_KEY, 'sample') }
export function liveLocalRequests(): HelpRequest[] { return deviceRequests(LIVE_LOCAL_HELP_KEY, 'live local') }
export async function listRequests(sample: boolean, deviceOnly = false): Promise<HelpRequest[]> { return sample ? sampleRequests() : deviceOnly ? liveLocalRequests() : helpApi('/requests') }
export async function saveRequest(sample: boolean, draft: HelpDraft, revision: number, deviceOnly = false): Promise<HelpRequest> {
  if (!sample && !deviceOnly) return helpApi('/requests', { draft, revision })
  const records = sample ? sampleRequests() : liveLocalRequests(), old = records.find(r => r.id === draft.id)
  if (old && old.revision !== revision) throw new Error('conflict')
  const record: HelpRequest = { id: draft.id, owner: sample ? 'sample' : 'device', draft, revision: revision + 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }
  const key = sample ? SAMPLE_HELP_KEY : LIVE_LOCAL_HELP_KEY
  localStorage.setItem(key, JSON.stringify([record, ...records.filter(r => r.id !== draft.id)].slice(0, 20))); return record
}
export async function removeRequest(sample: boolean, id?: string, deviceOnly = false) { if (!sample && !deviceOnly) return helpApi(id ? `/requests/${id}` : '/requests', undefined, 'DELETE'); const key = sample ? SAMPLE_HELP_KEY : LIVE_LOCAL_HELP_KEY, records = sample ? sampleRequests() : liveLocalRequests(); localStorage.setItem(key, JSON.stringify(id ? records.filter(r => r.id !== id) : [])) }
export function downloadText(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
