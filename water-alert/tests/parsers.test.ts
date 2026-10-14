// @vitest-environment node
import { readFileSync } from 'node:fs'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'
import { parseADH, parseADEQ } from '../server/parsers'
import { changes, statusFor, SOURCES } from '../src/domain'
import { PLACE_CATALOG, withPlaceCatalog } from '../src/place-catalog'

const adh = readFileSync(new URL('./fixtures/adh-recorded.html', import.meta.url), 'utf8')
const adeq = readFileSync(new URL('./fixtures/adeq-recorded.json', import.meta.url), 'utf8')
const headers = '<tr><th>Date Issued</th><th>Date Lifted</th><th>System</th><th>Area Impacted</th><th>Reason</th><th>County</th></tr>'
const row = (lifted = '') => `<tr><td>10/9/2026 5:57:28 PM</td><td>${lifted}</td><td>Test Water</td><td>Entire system</td><td>Main break</td><td>Benton</td></tr>`
const table = (body: string) => `<table id="GridView1">${headers}${body}</table>`
describe('recorded ADH HTML', () => {
  it('uses the existing parser identity for each catalog supplier without duplicate places', () => {
    for (const { place } of PLACE_CATALOG.filter(entry => entry.place.kind === 'system')) {
      const notice = parseADH(table(row().replace('Test Water', place.name)))[0]
      expect(notice.placeId).toBe(place.id)
      const projected = withPlaceCatalog([{ ...place, county: 'Published county', aliases: ['Published alias'] }])
      expect(projected.filter(p => p.id === place.id)).toHaveLength(1)
      expect(projected.find(p => p.id === place.id)).toMatchObject({ county: 'Published county', aliases: ['Published alias'] })
    }
  })
  it('reads real issued/lifted rows, retaining raw agency date text', () => {
    const records = parseADH(adh)
    expect(records.find(n => n.name === 'BANKS WATERWORKS')).toMatchObject({ issued: '10/9/2026 5:57:28 PM', lifted: null, agency: 'ADH', url: SOURCES.ADH })
    expect(records.find(n => n.name === 'WALDRON WATERWORKS')?.lifted).toBe('10/12/2026 12:37:30 PM')
    expect(records.filter(n => !n.lifted)).toHaveLength(5)
  })
  it('counts one cross-county notice and retains all counties', () => {
    const records = parseADH(adh).filter(n => n.name === 'CROSS COUNTY RURAL WATER SYS')
    expect(records).toHaveLength(1)
    expect(records[0].county).toBe('CRAIGHEAD, JACKSON, POINSETT')
  })
  it('keeps identities stable when lifted and when rows reorder', () => {
    const initial = parseADH(table(row('&nbsp;')))
    const lifted = parseADH(table(row('10/12/2026 12:37:30 PM')))
    expect(lifted[0].id).toBe(initial[0].id)
    expect(changes(initial, lifted).map(e => e.type)).toEqual(['lifted'])
    const $ = load(adh)
    const rows = $('#GridView1 tr').toArray().slice(1).map(r => $.html(r)).reverse()
    expect(parseADH(table(rows.join(''))).map(n => n.id).sort()).toEqual(parseADH(adh).map(n => n.id).sort())
  })
  it.each(['<html>Unavailable</html>', table(''), table(row('N/A')), table(row().replace('10/9/2026', '2/30/2026')), table(row()).replace('Date Issued', 'Unknown'), table('<tr><td colspan="6">No records</td></tr>')])('rejects missing, empty, malformed or changed tables: %s', html => {
    expect(() => parseADH(html)).toThrow()
  })
  it('rejects conflicting lift statuses for county copies of the same event', () => {
    expect(() => parseADH(table(row() + row('10/12/2026 12:37:30 PM')))).toThrow()
  })
})
describe('recorded ADEQ JSON', () => {
  it('reads seven blank-lifted advisories and separates N/A unknowns', () => {
    const records = parseADEQ(adeq)
    expect(records).toHaveLength(52)
    expect(records.filter(n => !n.lifted && n.liftStatus !== 'unknown')).toHaveLength(7)
    const active = records.find(n => n.name === 'Lake Hamilton')!
    expect(active).toMatchObject({ lifted: null, sourceUpdatedAt: 'September 28, 2026', agency: 'ADEQ', url: SOURCES.ADEQ })
    expect(records.find(n => n.name === 'Lake Nimrod *')?.lifted).toBe('August 1, 2014')
  })
  it('does not turn N/A into either active or a fabricated lift', () => {
    const records = parseADEQ(adeq)
    const unknown = records.find(n => n.liftStatus === 'unknown')!
    expect(unknown.lifted).toBeNull()
    expect(changes([], [unknown])).toEqual([])
    expect(statusFor(unknown.placeId, { agency: 'ADEQ', records: [unknown], retrievedAt: '2026-10-13T12:00:00Z', lastSuccessAt: '2026-10-13T12:00:00Z', error: null }, Date.parse('2026-10-13T12:00:00Z')).state).toBe('unavailable')
  })
  it('normalizes footnote marks and county spelling without changing source names', () => {
    const records = parseADEQ(adeq)
    const june = records.filter(n => n.name === 'Lake June')
    expect(new Set(june.map(n => n.placeId)).size).toBe(1)
    const bennett = records.filter(n => n.name.replace(/\s*\*$/, '') === 'Lake Bennett')
    expect(new Set(bennett.map(n => n.placeId)).size).toBe(1)
  })
  it('keeps event IDs stable on reordering and a real lift', () => {
    const feed = JSON.parse(adeq)
    const initial = parseADEQ(adeq)
    feed.advisories.reverse()
    const current = feed.advisories.find((n: { waterbody: string }) => n.waterbody === "Mom's Lake")
    current.lifted = 'October 13, 2026'
    const next = parseADEQ(JSON.stringify(feed))
    expect(next.map(n => n.id).sort()).toEqual(initial.map(n => n.id).sort())
    expect(changes(initial, next).map(e => e.type)).toEqual(['lifted'])
  })
  it.each(['{}', '[]', '<html>Error</html>', '{"updated":"September 28, 2026","advisories":[]}', adeq.replace('"waterbody"', '"unknown"'), adeq.replace('July 29, 2014', 'February 30, 2014'), adeq.replace('"lifted": ""', '"lifted": null')])('rejects unknown schema, unverified emptiness and invalid dates', input => {
    expect(() => parseADEQ(input)).toThrow()
  })
})
