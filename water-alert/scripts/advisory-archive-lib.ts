// Pure pieces of `npm run advisory:archive`. Network is injected so tests run
// on saved captures.
//
// Source: Internet Archive captures of ADH's own boil-water page. Each capture
// is the agency's active-and-recently-lifted list at that moment, so this
// recovers advisories from before WAVE began collecting. It is a SAMPLE, never
// a complete record: an advisory issued and lifted between two captures was
// never on a captured page and cannot be recovered. Absence here is a gap in
// the capture timeline and never evidence that a system had no advisory.
import { createHash } from 'node:crypto'
import * as cheerio from 'cheerio'

export const ADH_BOIL_URL = 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx'
export const CDX_URL = 'https://web.archive.org/cdx/search/cdx'
/** `id_` returns the original bytes rather than the Archive's rewritten page. */
export const captureUrl = (timestamp: string) => `https://web.archive.org/web/${timestamp}id_/${ADH_BOIL_URL}`
/** The human-facing copy, for the provenance link shown in the app. */
export const captureViewUrl = (timestamp: string) => `https://web.archive.org/web/${timestamp}/${ADH_BOIL_URL}`

export interface CaptureRow { issued: string; lifted: string | null; system: string; area: string; reason: string; county: string }
export interface ArchivedAdvisory extends CaptureRow { capture: string }

/** Exact capture timestamps; a rounded one redirects instead of returning bytes. */
export async function captureTimestamps(doFetch: typeof fetch = fetch, limit = 3000): Promise<string[]> {
  const query = new URLSearchParams({ url: ADH_BOIL_URL.replace(/^https?:\/\//, ''), output: 'json', fl: 'timestamp', filter: 'statuscode:200', limit: String(limit) })
  const response = await doFetch(`${CDX_URL}?${query}`, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`Internet Archive index ${response.status}`)
  const rows = JSON.parse(await response.text()) as string[][]
  return rows.slice(1).map(row => row[0]).filter(ts => /^\d{14}$/.test(ts))
}

const text = ($: cheerio.CheerioAPI, el: ReturnType<cheerio.CheerioAPI>) => $(el).text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

/** The agency's own six-column table, kept exactly as published. */
export function parseCapture(html: string): CaptureRow[] {
  const $ = cheerio.load(html)
  const rows: CaptureRow[] = []
  $('tr').each((_, tr) => {
    const cells = $(tr).find('td').map((__, td) => text($, $(td) as never)).get()
    if (cells.length < 6) return
    const [issued, lifted, system, area, reason, county] = cells
    // A header or layout row has no date in the first cell.
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(issued) || !system) return
    rows.push({ issued, lifted: lifted?.trim() ? lifted.trim() : null, system, area, reason, county })
  })
  return rows
}

/** One advisory can be listed once per affected county; that is one event. */
export const advisoryKey = (row: Pick<CaptureRow, 'system' | 'issued' | 'area'>) => `${row.system}\u0000${row.issued}\u0000${row.area}`

/**
 * Earliest capture wins for first sighting, but a later capture may be the one
 * that first shows a lift date, so a known lift is never dropped.
 */
export function mergeCaptures(existing: ArchivedAdvisory | undefined, row: CaptureRow, capture: string): ArchivedAdvisory {
  if (!existing) return { ...row, capture }
  return { ...existing, lifted: existing.lifted ?? row.lifted, capture: capture < existing.capture ? capture : existing.capture }
}

/** ADH prints month/day/year. */
export const isoDate = (printed: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(printed.trim())
  if (!match) return undefined
  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
export const captureDate = (timestamp: string) => `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`

/** Stable across runs: the same advisory keeps its id as new captures are added. */
export const advisoryId = (pwsid: string, row: CaptureRow) =>
  `archive:${pwsid}:${isoDate(row.issued) ?? 'undated'}:${createHash('sha256').update(advisoryKey(row)).digest('hex').slice(0, 8)}`
