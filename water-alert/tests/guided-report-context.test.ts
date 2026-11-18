import { expect, test } from 'vitest'
import { ANNUAL_REPORTS, LEISURE_HILLS_ID, type AnnualReport } from '../src/annual-reports'
import { reportQuestion } from '../src/report-findings'
import { blankRequest, hasReport } from '../src/help-requests'
import { initialFacts } from '../src/help-flow'

const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS', county: 'Benton', kind: 'system' as const }
test('an older reviewed finding is resolved by exact year, not the newest report', () => {
  const reviewed = ANNUAL_REPORTS[place.id][0] as Extract<AnnualReport, { state: 'reviewed' }>
  const reports = { [place.id]: [{ ...reviewed, year: 2024 }, { year: 2025, state: 'unreviewed' as const, url: 'https://example.test' }] }
  expect(reportQuestion(place, '2024:0', 'en', reports)).toContain('2024')
  expect(reportQuestion(place, '2025:0', 'en', reports)).toBeUndefined()
  expect(reportQuestion({ ...place, id: 'other' }, '2024:0', 'en', reports)).toBeUndefined()
})

test('an explicitly selected report finding supports a report-only question without invented description', () => {
  const facts = initialFacts(place, [], false, false, 'en').map(f => ({ ...f, included: f.id === '2025:0' }))
  expect(hasReport({ ...blankRequest(place), issue: 'report', facts })).toBe(true)
  expect(hasReport({ ...blankRequest(place), issue: 'report', facts: facts.map(f => ({ ...f, included: false })) })).toBe(false)
})
