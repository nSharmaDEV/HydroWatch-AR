// @vitest-environment node
import { expect, it } from 'vitest'
import { advisoryId, advisoryKey, captureDate, captureUrl, captureViewUrl, isoDate, mergeCaptures, parseCapture, type CaptureRow } from '../scripts/advisory-archive-lib'
import { supplierHistory, type ImportedAdvisory } from '../src/imported-advisories'
import type { Notice } from '../src/domain'

const row = (cells: string[]) => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
const page = (rows: string[]) => `<table>${row(['Date Issued', 'Date Lifted', 'System', 'Area Impacted', 'Reason', 'County'])}${rows.join('')}</table>`

it('keeps the agency table exactly as published and skips header rows', () => {
  const html = page([
    row(['1/29/2025 4:25:05 PM', '1/31/2025 1:23:45 PM', 'CENTRAL ARKANSAS WATER', 'CENTRAL ARKANSAS WATER for the customers on Woodline Dr', 'main break', 'PULASKI']),
    row(['1/31/2025 9:10:44 AM', '&nbsp;', 'MIDWAY WATER ASSOCIATION', 'MIDWAY WATER ASSOCIATION for the customers south of Proctor Rd', 'water line break', 'CRITTENDEN']),
  ])
  const rows = parseCapture(html)
  expect(rows).toHaveLength(2)
  expect(rows[0]).toEqual({ issued: '1/29/2025 4:25:05 PM', lifted: '1/31/2025 1:23:45 PM', system: 'CENTRAL ARKANSAS WATER', area: 'CENTRAL ARKANSAS WATER for the customers on Woodline Dr', reason: 'main break', county: 'PULASKI' })
  // A blank lift cell is "not lifted as of this capture", never a lift.
  expect(rows[1].lifted).toBeNull()
})

it('reads month/day/year the way ADH prints it', () => {
  expect(isoDate('9/2/2021 10:56:30 AM')).toBe('2021-09-02')
  expect(isoDate('1/29/2025 4:25:05 PM')).toBe('2025-01-29')
  expect(isoDate('11/16/2026 8:34:21 AM')).toBe('2026-11-16')
  expect(isoDate('not a date')).toBeUndefined()
  expect(captureDate('20250201103140')).toBe('2025-02-01')
})

it('treats one advisory listed under several counties as one event', () => {
  const base = { issued: '1/1/2025 9:00:00 AM', system: 'CAVE CITY WATERWORKS', area: 'CAVE CITY WATERWORKS for Highway 115' }
  expect(advisoryKey({ ...base, county: 'INDEPENDENCE' } as CaptureRow)).toBe(advisoryKey({ ...base, county: 'SHARP' } as CaptureRow))
})

it('keeps the earliest sighting but adopts a lift date seen only later', () => {
  const unlifted: CaptureRow = { issued: '1/1/2025 9:00:00 AM', lifted: null, system: 'X', area: 'A', reason: 'main break', county: 'C' }
  const first = mergeCaptures(undefined, unlifted, '20250105000000')
  const later = mergeCaptures(first, { ...unlifted, lifted: '1/8/2025 2:00:00 PM' }, '20250110000000')
  expect(later.lifted).toBe('1/8/2025 2:00:00 PM')
  expect(later.capture).toBe('20250105000000')
  // An earlier capture discovered afterwards wins for first sighting.
  expect(mergeCaptures(later, unlifted, '20250102000000').capture).toBe('20250102000000')
  expect(mergeCaptures(later, unlifted, '20250102000000').lifted).toBe('1/8/2025 2:00:00 PM')
})

it('builds stable ids and links the dated capture, not a bare notice', () => {
  const r: CaptureRow = { issued: '9/2/2021 10:56:30 AM', lifted: null, system: 'X', area: 'A', reason: 'main break', county: 'C' }
  expect(advisoryId('AR0000003', r)).toBe(advisoryId('AR0000003', { ...r, county: 'OTHER' }))
  expect(advisoryId('AR0000003', r)).toMatch(/^archive:AR0000003:2021-09-02:[0-9a-f]{8}$/)
  expect(captureUrl('20250201103140')).toContain('/20250201103140id_/')
  expect(captureViewUrl('20250201103140')).not.toContain('id_')
})

const archived = (over: Partial<ImportedAdvisory> = {}): ImportedAdvisory => ({
  id: 'archive:AR0000003:2025-01-29:abcd1234', placeId: 'ADH:x', publisher: 'Arkansas Department of Health',
  issued: '1/29/2025 4:25:05 PM', lifted: null, area: 'Woodline Dr', reason: 'main break',
  noticeUrl: 'https://web.archive.org/web/20250201103140/https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx',
  capturedOn: '2025-02-01', reviewedOn: '2026-11-16', identityUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=003', observedNoticeIds: [], ...over,
})
const observed = (over: Partial<Notice> = {}): Notice => ({
  id: 'ADH:live1', placeId: 'ADH:x', name: 'X', agency: 'ADH', kind: 'boil', area: 'Woodline Dr', county: 'PULASKI',
  issued: '1/29/2025 4:25:05 PM', lifted: null, reason: 'main break', url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx', ...over,
} as Notice)

it('shows an event WAVE also observed once, from the live record', () => {
  const entries = supplierHistory('ADH:x', [observed()], [archived()])
  expect(entries).toHaveLength(1)
  expect(entries[0].observed).toBeDefined()
  expect(entries[0].imported).toBeUndefined()
})

it('keeps an archived advisory that the live feed never saw', () => {
  const entries = supplierHistory('ADH:x', [observed({ issued: '5/5/2026 1:00:00 PM', area: 'Elsewhere' })], [archived()])
  expect(entries).toHaveLength(2)
  expect(entries.filter(e => e.imported)).toHaveLength(1)
  // Newest first, so the later live record leads.
  expect(entries[0].observed).toBeDefined()
})
