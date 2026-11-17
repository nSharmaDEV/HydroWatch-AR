// One on-demand read of ADH's water-system directory page for a single system.
//
// Directory facts only: identity, source, population and the inspection date
// ADH prints. These are not readings, not findings and not a safety result.
// The EPA PWSID is not ADH's internal ID, so the derived ID is never trusted on
// its own: the page's own published system name must match the directory name
// exactly, or nothing is returned. Wording ADH uses that this code does not
// recognise is passed through as printed rather than guessed at.
import * as cheerio from 'cheerio'

export interface WaterSystemFacts {
  systemId: string
  name: string
  population?: string
  sourceType?: string
  systemType?: string
  sourceNames: string[]
  inspection?: string
}
export type WaterSystemCheck =
  | { state: 'verified'; facts: WaterSystemFacts; sourceUrl: string; checkedAt: string }
  | { state: 'mismatch' }
  | { state: 'incomplete' }

export const systemPageUrl = (adhId: string) => `https://health.arkansas.gov/Eng/WS.aspx?ID=${adhId}`

/** EPA's `AR#######` is not ADH's ID; this is only a candidate to verify by name. */
export function adhIdFromPwsid(pwsid: string): string | undefined {
  const digits = /^AR(\d{7})$/.exec(pwsid.toUpperCase())?.[1]?.replace(/^0+/, '')
  return digits ? digits.padStart(3, '0') : undefined
}

/** "2/29/2024 12:00:00 AM" as printed becomes an ISO day, or undefined. */
export function inspectionDate(printed: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(printed.trim())
  if (!match) return undefined
  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const labelled = (text: string, prefix: string) => text.trim().startsWith(prefix) ? text.trim().slice(prefix.length).trim() : text.trim()

export function parseWaterSystem(html: string): WaterSystemFacts | undefined {
  const $ = cheerio.load(html)
  const span = (id: string) => $(`#MainContent_${id}`).text()
  const name = span('lblPWSName').trim()
  const systemId = labelled(span('lblPWSID'), 'PWS ID:')
  if (!name || !systemId) return undefined
  // Each source is its own line; purchased sources add " - See <system> for
  // Source Water Assessment", which is an upstream pointer, not the name.
  const cell = $('td').filter((_, el) => $(el).text().includes('Sources for this water system')).first()
  const sourceNames = (cell.html() ?? '').split(/<br\s*\/?>/i)
    .map(fragment => cheerio.load(`<div>${fragment}</div>`).text().replace(/\s+/g, ' ').trim())
    .map(line => line.replace(/^Sources for this water system:/i, '').trim())
    .map(line => /^(.+?)\s+-\s+See\b/.exec(line)?.[1]?.trim() ?? line)
    .filter(line => line && !/^Click here/i.test(line))
  const population = labelled(span('lblRetailPop'), 'Retail Population:')
  const sourceType = labelled(span('lblSourceTypes'), 'Source Type(s):')
  const systemType = labelled(span('lblType'), 'Type:')
  const inspection = inspectionDate(span('lblLastInspection'))
  return {
    systemId, name, sourceNames,
    ...(population ? { population } : {}), ...(sourceType ? { sourceType } : {}),
    ...(systemType ? { systemType } : {}), ...(inspection ? { inspection } : {}),
  }
}

const key = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toUpperCase()

export async function checkWaterSystem(system: { pwsid: string; name: string }, doFetch: typeof fetch = fetch, checkedAt: string): Promise<WaterSystemCheck> {
  const adhId = adhIdFromPwsid(system.pwsid)
  if (!adhId) return { state: 'incomplete' }
  const sourceUrl = systemPageUrl(adhId)
  let html: string
  try {
    const response = await doFetch(sourceUrl, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return { state: 'incomplete' }
    html = await response.text()
  } catch { return { state: 'incomplete' } }
  const facts = parseWaterSystem(html)
  if (!facts) return { state: 'incomplete' }
  // The derived ID could land on another system; only ADH's own name confirms it.
  if (key(facts.name) !== key(system.name)) return { state: 'mismatch' }
  return { state: 'verified', facts, sourceUrl, checkedAt }
}
