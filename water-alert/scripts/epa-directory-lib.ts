import { adhSystemPlaceId } from '../server/parsers.js'

/**
 * EPA SDWIS is a DIRECTORY-ONLY source: system identity, county and contact
 * fields. It is never an advisory feed and never changes advisory status.
 */
export interface DirectoryEntry {
  pwsid: string; name: string; county: string; placeId: string; population?: number
  email?: string; phone?: string
}
export interface DirectorySnapshot { source: string; checkedOn: string; filter: string; systems: DirectoryEntry[] }
export interface EpaSystemRow { pwsid: string; pws_name: string; pws_activity_code: string; pws_type_code: string; primacy_agency_code: string; population_served_count?: number | null; email_addr?: string | null; phone_number?: string | null }
export interface EpaGeoRow { pwsid: string; area_type_code: string; county_served?: string | null }

export const EPA_SOURCE = 'https://data.epa.gov/efservice/'
export const EPA_FILTER = 'WATER_SYSTEM: PRIMACY_AGENCY_CODE=AR, PWS_ACTIVITY_CODE=A, PWS_TYPE_CODE=CWS; county from GEOGRAPHIC_AREA AREA_TYPE_CODE=CN'

const clean = (v: unknown) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() : ''
// Copied exactly when well-formed; never corrected, lower-cased or guessed.
const email = (v: unknown) => { const e = clean(v); return /^[^\s@,;?&<>"]+@[^\s@,;?&<>"]+\.[A-Za-z]{2,}$/.test(e) ? e : undefined }
const phone = (v: unknown) => { const p = clean(v); return p.replace(/\D/g, '').length === 10 ? p : undefined }

export function normalizeDirectory(rows: EpaSystemRow[], geo: EpaGeoRow[], checkedOn: string): DirectorySnapshot {
  const counties = new Map<string, string[]>()
  for (const g of geo) if (g.area_type_code === 'CN' && clean(g.county_served)) counties.set(g.pwsid, [...(counties.get(g.pwsid) ?? []), clean(g.county_served)])
  const systems = rows
    .filter(r => r.primacy_agency_code === 'AR' && r.pws_activity_code === 'A' && r.pws_type_code === 'CWS' && /^AR[0-9A-Z]{7}$/.test(r.pwsid) && clean(r.pws_name))
    .map((r): DirectoryEntry => {
      const name = clean(r.pws_name)
      return {
        pwsid: r.pwsid, name, county: [...new Set(counties.get(r.pwsid) ?? [])].sort().join(', ') || 'County not listed', placeId: adhSystemPlaceId(name),
        ...(typeof r.population_served_count === 'number' && r.population_served_count > 0 ? { population: r.population_served_count } : {}),
        ...(email(r.email_addr) ? { email: email(r.email_addr) } : {}),
        ...(phone(r.phone_number) ? { phone: phone(r.phone_number) } : {}),
      }
    })
    .sort((a, b) => a.pwsid.localeCompare(b.pwsid))
  const ids = new Set<string>()
  for (const s of systems) { if (ids.has(s.pwsid)) throw new Error(`Duplicate PWSID ${s.pwsid}`); ids.add(s.pwsid) }
  return { source: EPA_SOURCE, checkedOn, filter: EPA_FILTER, systems }
}

export interface DirectoryDiff { added: DirectoryEntry[]; removed: DirectoryEntry[]; changed: { pwsid: string; fields: { field: string; from: unknown; to: unknown }[] }[] }
export function diffDirectory(previous: DirectorySnapshot | undefined, next: DirectorySnapshot): DirectoryDiff {
  const old = new Map((previous?.systems ?? []).map(s => [s.pwsid, s])), now = new Map(next.systems.map(s => [s.pwsid, s]))
  const fields = ['name', 'county', 'placeId', 'population', 'email', 'phone'] as const
  return {
    added: next.systems.filter(s => !old.has(s.pwsid)),
    removed: (previous?.systems ?? []).filter(s => !now.has(s.pwsid)),
    changed: next.systems.flatMap(s => {
      const o = old.get(s.pwsid)
      if (!o) return []
      const diff = fields.filter(f => o[f] !== s[f]).map(f => ({ field: f, from: o[f], to: s[f] }))
      return diff.length ? [{ pwsid: s.pwsid, fields: diff }] : []
    }),
  }
}
export function formatDiff(d: DirectoryDiff): string {
  return [
    `Added ${d.added.length}, removed ${d.removed.length}, changed ${d.changed.length}.`,
    ...d.added.map(s => `+ ${s.pwsid} ${s.name} (${s.county})`),
    ...d.removed.map(s => `- ${s.pwsid} ${s.name} (${s.county})`),
    ...d.changed.map(c => `~ ${c.pwsid} ${c.fields.map(f => `${f.field}: ${JSON.stringify(f.from)} → ${JSON.stringify(f.to)}`).join('; ')}`),
  ].join('\n')
}
