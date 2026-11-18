import { expect, test } from 'vitest'
import { evidenceBadge, providerEvidence, systemIdentity } from '../src/provider-evidence'
import { ANNUAL_REPORTS, LEISURE_HILLS_ID } from '../src/annual-reports'
import type { EchoRecordSet } from '../src/echo-records'
import type { Place } from '../src/domain'

const place: Place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', kind: 'system', county: 'Benton' }

const violation = (id: string, patch: Partial<EchoRecordSet['violations'][number]> = {}) => ({
  id, rule: 'Revised Total Coliform Rule', contaminant: 'Revised Total Coliform Rule',
  categoryCode: 'MON', category: 'Monitoring Violation', actions: [], ...patch,
})

const records: EchoRecordSet = {
  pwsid: 'AR0000747', retrievedOn: '2026-11-17', extractOn: '10/07/2026', rejected: 0, truncated: false,
  violations: [
    // Same requirement and period as the 2025 annual report's October row.
    violation('8848272', { from: '10/01/2025', through: '10/31/2025', status: 'Archived', resolvedOn: '10/31/2025' }),
    // Public notice: the report prints "Current", the federal record records a resolution.
    violation('8848274', {
      rule: 'Public Notice', contaminant: 'Public Notice', categoryCode: 'Other', category: 'Other Violation',
      from: '10/01/2025', status: 'Resolved', resolvedOn: '01/13/2026',
      actions: [
        { id: '1248978', on: '01/13/2026', type: 'Resolving', action: 'State Compliance achieved' },
        { id: '1248945', on: '04/22/2022', type: 'Formal', action: 'State Administrative Penalty assessed' },
      ],
    }),
    // July: monitoring and reporting are two numbered records; the report's row names both.
    violation('8848267', { from: '07/01/2025', through: '07/31/2025', status: 'Archived', resolvedOn: '07/31/2025' }),
    violation('8848268', { categoryCode: 'RPT', category: 'Reporting Violation', from: '07/01/2025', status: 'Addressed' }),
  ],
  surveys: [{ id: 'AR0000747:05/12/2025:sanitary-survey-complete', on: '05/12/2025', type: 'Sanitary Survey, Complete', agency: 'State', areas: [{ key: 'Treatment', flagged: true, detail: 'Deficiency noted at the chlorination point.' }, { key: 'Source', flagged: false, detail: 'No deficiencies or recommendations.' }] }],
  notices: [{ id: '1248978', on: '01/13/2026', action: 'State Public Notification received', agency: 'State', official: true }],
  formalActions: [{ id: 'AR0000747:formal:04/22/2022:0', on: '04/22/2022', action: 'State Administrative Penalty assessed', agency: 'State' }],
}

test('the system identity keeps ADH’s own number and adds the verified federal PWS ID', () => {
  const identity = systemIdentity(place, ANNUAL_REPORTS[LEISURE_HILLS_ID])
  expect(identity).toMatchObject({ placeId: LEISURE_HILLS_ID, adhPws: '747', federalPwsId: 'AR0000747' })
})

test('an annual-report row and a federal record for the same month and requirement become one finding', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const october = evidence.issues.find(issue => issue.requirementKey === 'rtcr.monitoring' && issue.period.from?.startsWith('10/'))!
  expect(october.citations.map(c => c.documentId).sort()).toEqual([`adh:report:${LEISURE_HILLS_ID}:2025`, 'echo:violation:AR0000747:8848272'])
  // Every displayed detail still traces to a page or record reference.
  expect(october.citations.find(c => c.documentId.startsWith('adh:'))!.page).toBe(2)
  expect(october.citations.find(c => c.documentId.startsWith('echo:'))!.recordRef).toBe('8848272')
  expect(october.methods).toEqual(['humanReviewed', 'structuredRecord'])
})

test('the report’s “monitor and/or report” row is not filed as either numbered record', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const ambiguous = evidence.issues.find(issue => issue.requirementKey === 'rtcr.monitorOrReport')!
  expect(ambiguous.citations).toHaveLength(1)
  expect(ambiguous.uncertain.length).toBeGreaterThan(0)
  expect(ambiguous.uncertain[0].text.en).toMatch(/did not merge/)
  // Both July federal records survive on their own.
  expect(evidence.issues.filter(issue => issue.period.from === '07/01/2025')).toHaveLength(2)
})

test('a documented resolution is kept, and the report’s printed “Current” is kept beside it', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const notice = evidence.issues.find(issue => issue.requirementKey === 'publicNotice')!
  expect(notice.resolution).toMatchObject({ on: '01/13/2026' })
  expect(notice.resolution!.label.en).toContain('State Compliance achieved')
  expect(notice.conflicts.some(c => c.kind === 'status' && /Current/.test(c.text.en))).toBe(true)
  // An enforcement action from before the reported period is never offered as the response.
  const early = notice.actions.find(action => action.on === '04/22/2022')!
  expect(early.predatesPeriod).toBe(true)
  expect(notice.conflicts.some(c => c.kind === 'recordLimitation')).toBe(true)
})

test('an archived record with a date is printed as recorded, never read as a correction', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const october = evidence.issues.find(issue => issue.requirementKey === 'rtcr.monitoring' && issue.period.from?.startsWith('10/'))!
  expect(october.resolution).toBeUndefined()
  expect(october.conflicts.some(c => /Archived/.test(c.text.en))).toBe(true)
})

test('a flagged survey area becomes a finding; unflagged areas never do', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const survey = evidence.issues.filter(issue => issue.requirementKey.startsWith('survey.'))
  expect(survey.map(issue => issue.requirementKey)).toEqual(['survey.treatment'])
  expect(survey[0].citations[0].quote?.en).toBe('Deficiency noted at the chlorination point.')
  expect(survey[0].citations[0].quoteVerified).toBe(true)
})

test('records for the wrong federal system are refused and explained', () => {
  const evidence = providerEvidence({ place, sample: false, echo: { ...records, pwsid: 'AR0000999' } })
  expect(evidence.documents.every(document => !document.id.startsWith('echo:'))).toBe(true)
  expect(evidence.limitations.some(l => l.id === 'echo:identity')).toBe(true)
})

test('reported violation, inspection and action dates are not invented publication dates', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const documents = evidence.documents.filter(document => document.id.startsWith('echo:'))
  expect(documents.length).toBeGreaterThan(0)
  expect(documents.every(document => document.publishedOn === undefined)).toBe(true)
  expect(documents.find(document => document.id === 'echo:violation:AR0000747:8848272')?.period?.from).toBe('10/01/2025')
})

test('samples never draw on live records', () => {
  const evidence = providerEvidence({ place, sample: true, echo: records })
  expect(evidence.issues).toEqual([])
  expect(evidence.documents).toEqual([])
})

test('the badge counts distinct issues and never reports a reassuring zero without records', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  expect(evidenceBadge(evidence, 'en')).toBe(`${evidence.issues.length} historical findings`)
  const unchecked = providerEvidence({ place: { ...place, id: 'ADH:nothing' }, sample: false })
  expect(unchecked.issues).toEqual([])
  expect(evidenceBadge(unchecked, 'en')).toBeUndefined()
  const clean = providerEvidence({ place: { ...place, id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES' }, sample: false })
  expect(evidenceBadge(clean, 'en')).toBe('No problems found')
  expect(evidenceBadge(clean, 'es')).toBe('No se encontraron problemas')
})

test('a source that has not been checked is listed with what is missing, not as clear', () => {
  const evidence = providerEvidence({ place, sample: false })
  const epa = evidence.sources.find(source => source.id === 'epaEcho')!
  expect(epa.state).toBe('notChecked')
  expect(epa.url).toContain('AR0000747')
  expect(evidence.limitations.some(l => l.id === 'coverage')).toBe(true)
  const failed = providerEvidence({ place, sample: false, echoState: 'incomplete' })
  expect(failed.sources.find(source => source.id === 'epaEcho')!.detail.en).toMatch(/could not be completed/)
  const none = providerEvidence({ place, sample: false, echoState: 'none' })
  expect(none.sources.find(source => source.id === 'epaEcho')!.detail.en).toMatch(/not an all-clear/)
})

test('every displayed finding has at least one supporting document that exists in the record list', () => {
  const evidence = providerEvidence({ place, sample: false, echo: records })
  const ids = new Set(evidence.documents.map(document => document.id))
  expect(evidence.issues.length).toBeGreaterThan(0)
  for (const issue of evidence.issues) {
    expect(issue.citations.length).toBeGreaterThan(0)
    for (const citation of issue.citations) expect(ids.has(citation.documentId)).toBe(true)
  }
})

test('unreviewed or inaccessible documents never become a reassuring zero or no-report claim', () => {
  const url = 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025'
  const unreviewed = providerEvidence({ place, sample: false, reports: [{ year: 2025, state: 'unreviewed', url }] })
  expect(evidenceBadge(unreviewed, 'en')).toBeUndefined()
  const unavailable = providerEvidence({ place, sample: false, reports: [{ year: 2025, state: 'unavailable', sourceUrl: url }] })
  expect(unavailable.sources.find(source => source.id === 'adhAnnualReport')?.state).toBe('incomplete')
  expect(unavailable.sources.find(source => source.id === 'adhAnnualReport')?.detail.en).not.toMatch(/No report was found/)
})
