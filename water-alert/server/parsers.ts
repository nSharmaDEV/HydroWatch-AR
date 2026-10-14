import { createHash } from 'node:crypto'
import { load } from 'cheerio'
import { SOURCES, type Notice } from '../src/domain'

const text = (value: string) => value.replace(/\s+/g, ' ').trim()
const key = (value: string) => text(value).normalize('NFKC').replace(/[’‘]/g, "'").toLowerCase()
const id = (agency: string, values: string[]) => `${agency}:${createHash('sha256').update(JSON.stringify(values)).digest('hex')}`
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Validate the published calendar/time fields without inventing a timezone.
function dateKey(raw: string, agency: 'ADH' | 'ADEQ'): string {
  const match = agency === 'ADH'
    ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}):(\d{2}) (AM|PM))?$/.exec(raw)
    : /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(raw)
  if (!match) throw new Error('Invalid agency date')
  const month = agency === 'ADH' ? Number(match[1]) : months.indexOf(match[1]) + 1
  const day = Number(match[2]), year = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  if (year < 1900 || month < 1 || month > 12 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error('Invalid agency calendar date')
  if (match[4] && (Number(match[4]) < 1 || Number(match[4]) > 12 || Number(match[5]) > 59 || Number(match[6]) > 59)) throw new Error('Invalid agency time')
  return [year, month, day, ...(match[4] ? [Number(match[4]), Number(match[5]), Number(match[6]), match[7]] : [])].join(':')
}

export function parseADH(html: string): Notice[] {
  const $ = load(html)
  const table = $('table#GridView1')
  if (table.length !== 1) throw new Error('ADH GridView1 missing or duplicated')
  const rows = table.find('tr').toArray()
  const headers = rows.length ? $(rows[0]).children('th').toArray().map(cell => key($(cell).text())) : []
  const expected = ['date issued', 'date lifted', 'system', 'area impacted', 'reason', 'county']
  if (headers.length !== 6 || new Set(headers).size !== 6 || expected.some(h => !headers.includes(h))) throw new Error('ADH columns changed')
  if (rows.length < 2) throw new Error('ADH empty-feed format not verified')
  const records = new Map<string, { notice: Notice; counties: Set<string> }>()
  for (const row of rows.slice(1)) {
    const cells = $(row).children('td')
    if (cells.length !== 6 || cells.toArray().some(c => $(c).attr('colspan') || $(c).attr('rowspan'))) throw new Error('ADH malformed or paginated row')
    const values = cells.toArray().map(c => text($(c).text()))
    const get = (header: string) => values[headers.indexOf(header)]
    const issued = get('date issued'), lifted = get('date lifted'), name = get('system'), area = get('area impacted'), reason = get('reason'), county = get('county')
    if (!name || !area || !county) throw new Error('ADH required field missing')
    const issuedKey = dateKey(issued, 'ADH')
    if (lifted) dateKey(lifted, 'ADH')
    const placeId = id('ADH', ['system', key(name)])
    // County copies describe one notice; lifting must not change its identity.
    const eventId = id('ADH', [placeId, issuedKey, key(area)])
    const existing = records.get(eventId)
    if (existing) {
      if (existing.notice.lifted !== (lifted || null) || existing.notice.reason !== reason) throw new Error('ADH conflicting duplicate rows')
      existing.counties.add(county)
    } else records.set(eventId, { notice: { id: eventId, placeId, name, agency: 'ADH', kind: 'boil', area, county, issued, lifted: lifted || null, reason, url: SOURCES.ADH }, counties: new Set([county]) })
  }
  return [...records.values()].map(({ notice, counties }) => ({ ...notice, county: [...counties].sort().join(', ') }))
}

export function parseADEQ(json: string): Notice[] {
  const feed = JSON.parse(json)
  if (!feed || Array.isArray(feed) || typeof feed.updated !== 'string' || !Array.isArray(feed.advisories)) throw new Error('ADEQ feed schema changed')
  const updated = text(feed.updated)
  dateKey(updated, 'ADEQ')
  if (!feed.advisories.length) throw new Error('ADEQ empty-feed semantics not verified')
  const records = new Map<string, Notice>()
  for (const row of feed.advisories) {
    const fields = ['waterbody', 'county', 'area', 'date', 'lifted'] as const
    if (!row || fields.some(f => typeof row[f] !== 'string')) throw new Error('ADEQ advisory schema changed')
    const [name, county, area, issued, lifted] = fields.map(f => text(row[f]))
    if (!name || !county || !area) throw new Error('ADEQ required field missing')
    const issuedKey = dateKey(issued, 'ADEQ')
    const unknown = lifted === 'N/A'
    if (lifted && !unknown) dateKey(lifted, 'ADEQ')
    const countyKey = key(county).replace(/\bcount(?:y|ies)\b/g, '').split(/\band\b|&|,/).map(text).filter(Boolean).sort().join(',')
    const placeId = id('ADEQ', ['waterbody', key(name.replace(/\s*\*$/, '')), countyKey, key(area)])
    const eventId = id('ADEQ', [placeId, issuedKey])
    const notice: Notice = { id: eventId, placeId, name, agency: 'ADEQ', kind: 'hab', area, county, issued, lifted: unknown ? null : lifted || null, reason: '', url: SOURCES.ADEQ, sourceUpdatedAt: updated, ...(unknown ? { liftStatus: 'unknown' as const } : {}) }
    const previous = records.get(eventId)
    if (previous && (previous.lifted !== notice.lifted || previous.liftStatus !== notice.liftStatus)) throw new Error('ADEQ conflicting duplicate rows')
    records.set(eventId, notice)
  }
  return [...records.values()]
}
