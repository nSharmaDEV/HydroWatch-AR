import { expect, test } from 'vitest'
import { latestReport, reviewedReportAlerts } from '../src/report-findings'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import type { AnnualReport } from '../src/annual-reports'

const issue = { category: 'monitoring' as const, title: { en: 'Missed a report', es: 'No se reportó' }, heading: { en: 'Monitoring', es: 'Monitoreo' }, action: { en: 'None listed', es: 'Ninguna indicada' }, page: 2 }
const reports: Record<string, readonly AnnualReport[]> = {
  'ADH:reviewed': [{ year: 2024, state: 'reviewed', url: 'https://example.test/2024.pdf', reviewedOn: '2025-09-01', issues: [issue] }, { year: 2025, state: 'reviewed', url: 'https://example.test/2025.pdf', reviewedOn: '2026-10-19', issues: [issue, issue] }],
  'ADH:ai': [{ year: 2025, state: 'aiSummarized', url: 'https://example.test/ai.pdf', summarizedOn: '2026-10-20', model: 'm', issues: [issue] }],
  'ADH:clean': [{ year: 2025, state: 'reviewed', url: 'https://example.test/clean.pdf', reviewedOn: '2026-10-19', issues: [] }],
  'ADH:old': [{ year: 2022, state: 'reviewed', url: 'https://example.test/old.pdf', reviewedOn: '2023-01-01', issues: [issue] }],
  'ADH:unreviewed': [{ year: 2025, state: 'unreviewed', url: 'https://example.test/u.pdf' }],
}
const place = (id: string) => ({ id, name: 'Test system', kind: 'system' as const, county: 'Benton' })

test('the latest report decides what Home shows, and only hand-checked findings can be asked about', () => {
  const reviewed = latestReport(place('ADH:reviewed'), false, reports)!
  expect(reviewed).toMatchObject({ year: 2025, state: 'reviewed', checkedOn: '2026-10-19' })
  expect(reviewed.findings.map(f => [f.key, f.askable])).toEqual([['2025:0', true], ['2025:1', true]])
  const ai = latestReport(place('ADH:ai'), false, reports)!
  expect(ai).toMatchObject({ state: 'aiSummarized', checkedOn: '2026-10-20' })
  expect(ai.findings.every(f => !f.askable)).toBe(true)
  expect(latestReport(place('ADH:clean'), false, reports)!.findings).toEqual([])
  // Not reviewed never reads as "no issues".
  expect(latestReport(place('ADH:unreviewed'), false, reports)).toMatchObject({ state: 'unreviewed', findings: [] })
  expect(latestReport(place('ADH:none'), false, reports)).toBeUndefined()
  // Samples and lakes never show live report data.
  expect(latestReport(place('ADH:reviewed'), true, reports)).toBeUndefined()
  expect(latestReport({ ...place('ADH:reviewed'), kind: 'lake' }, false, reports)).toBeUndefined()
})

test('push alerts cover recent hand-checked reports with issues only', () => {
  const alerts = reviewedReportAlerts(reports, Date.parse('2026-11-09T12:00:00Z'))
  expect(alerts).toEqual([{ id: 'report:ADH:reviewed:2025', placeId: 'ADH:reviewed', year: 2025, count: 2, url: 'https://example.test/2025.pdf' }])
})

test('Leisure Hills has a hand-checked 2025 report with four findings', () => {
  const r = latestReport({ id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', kind: 'system', county: 'Benton' }, false)!
  expect(r).toMatchObject({ year: 2025, state: 'reviewed' })
  expect(r.findings).toHaveLength(4)
})

test('Ask about this pre-fills a polite, dated question that quotes the checked finding', async () => {
  const { reportQuestion } = await import('../src/report-findings')
  const lh = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', kind: 'system' as const, county: 'Benton' }
  const en = reportQuestion(lh, '2025:3', 'en')!
  expect(en).toContain('Your 2025 annual water report (page 2) lists: “Failed to provide Public Education Notice')
  expect(en).toContain('starting 10/01/2025, listed as current when the report was printed')
  expect(en).not.toMatch(/violat(ed|ing) the law|unsafe|lawsuit/i)
  expect(reportQuestion(lh, '2025:0', 'es')).toContain('Su informe anual del agua de 2025 (página 2) indica: “No se monitorearon')
  expect(reportQuestion(lh, '2025:0', 'es')).toContain('del 07/11/2025 al 07/31/2025')
  expect(reportQuestion(lh, '1999:0', 'en')).toBeUndefined()
})
