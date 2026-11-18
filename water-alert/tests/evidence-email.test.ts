import { afterEach, beforeEach, expect, test } from 'vitest'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { ECHO_RECORD_KEY, type EchoRecordSet } from '../src/echo-records'
import { initialFacts, relevantFacts, savedFacts, updatedEvidenceFacts } from '../src/help-flow'
import { blankRequest, generateMessage } from '../src/help-requests'
import { updateDraft } from '../src/help-draft'
import { evidenceQuestion } from '../src/help-evidence'
import { evidenceFactText } from '../src/help-evidence'
import { reportIssues, reportDocument } from '../src/evidence-adh'

const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills Mobile Home Park', county: 'Benton', kind: 'system' as const }

const violation = (id: string, patch: Partial<EchoRecordSet['violations'][number]> = {}) => ({
  id, rule: 'Revised Total Coliform Rule', contaminant: 'Revised Total Coliform Rule',
  categoryCode: 'MON', category: 'Monitoring Violation', actions: [], ...patch,
})

const records: EchoRecordSet = {
  pwsid: 'AR0000747', retrievedOn: '2026-11-17', extractOn: '10/07/2026', rejected: 0, truncated: false,
  violations: [
    // Same requirement and reported month as the 2025 annual report's October row.
    violation('8848272', { from: '10/01/2025', through: '10/31/2025', status: 'Archived', resolvedOn: '10/31/2025' }),
    // The report prints this as "Current"; the federal record documents a resolution.
    violation('8848274', {
      rule: 'Public Notice', contaminant: 'Public Notice', categoryCode: 'Other', category: 'Other Violation',
      from: '10/01/2025', status: 'Resolved', resolvedOn: '01/13/2026',
      actions: [{ id: '1248978', on: '01/13/2026', type: 'Resolving', action: 'State Compliance achieved' }],
    }),
  ],
  surveys: [], notices: [], formalActions: [],
}

const seed = (set: EchoRecordSet = records) => localStorage.setItem(ECHO_RECORD_KEY, JSON.stringify({ [place.id]: { records: set } }))
const draft = (language: 'en' | 'es' = 'en') => ({
  ...blankRequest(place), issue: 'report' as const,
  locations: ['1510 North Walton Boulevard, Bentonville'],
  facts: initialFacts(place, [], false, false, language),
  wording: { report: {}, response: {} },
})

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

test('a finding in two records is one bullet citing both documents', () => {
  seed()
  const body = generateMessage(draft(), 'en').body
  const bullets = body.split('\n').filter(line => line.startsWith('- '))
  // Still one bullet per distinct issue, not one per document.
  expect(bullets).toHaveLength(4)
  const october = bullets.find(line => /Bacteriological sampling/.test(line))!
  expect(october.match(/Bacteriological sampling/g)).toHaveLength(1)
  // Both supporting documents are consolidated under that bullet's citation.
  const marker = october.match(/\[(\d+)\]/)![1]
  const sources = body.slice(body.lastIndexOf('Sources\n'))
  const cited = sources.split('\n').filter(line => line.match(/^\[([\d, ]+)\]/)?.[1].split(', ').includes(marker))
  expect(cited).toHaveLength(2)
  expect(cited.some(line => line.includes('health.arkansas.gov'))).toBe(true)
  expect(cited.some(line => line.includes('echo.epa.gov') && line.includes('record 8848272'))).toBe(true)
  expect(sources).toContain('Fields copied from the published federal record; not reviewed by a person.')
})

test('records from more than one kind of document are called records, not the annual report', () => {
  seed()
  expect(generateMessage(draft(), 'en').body).toContain('The official records list:')
  expect(generateMessage(draft(), 'en').body).not.toContain('The water-quality report lists:')
  expect(generateMessage(draft('es'), 'es').body).toContain('Los registros oficiales indican:')
  // With only the annual report, the long-standing wording is unchanged.
  localStorage.clear()
  expect(generateMessage(draft(), 'en').body).toContain('The water-quality report lists:')
})

test('a documented correction is acknowledged instead of asked about as if ongoing', () => {
  seed()
  const body = generateMessage(draft(), 'en').body
  const notice = body.split('\n').filter(line => line.startsWith('- ')).find(line => /notice/i.test(line))!
  expect(notice).toContain('01/13/2026')
  expect(notice).toMatch(/documented resolution|recorded as resolved/i)
  expect(notice).toMatch(/confirm/i)
  expect(notice).not.toMatch(/was it provided\?/)
  expect(notice.length).toBeLessThan(650)
  expect(notice).toMatch(/disagree|conflict/i)
  const spanish = generateMessage(draft('es'), 'es').body
  expect(spanish).toMatch(/resolución documentada|registrada como resuelta/i)
})

test('automated readings are not presented as verified quotations', () => {
  const report = { year: 2025, state: 'aiSummarized' as const, url: 'https://health.arkansas.gov/report', summarizedOn: '2026-11-17', model: 'test', issues: [{ category: 'monitoring' as const, title: { en: 'Interpretation, not a quotation', es: 'Interpretación, no una cita' }, heading: { en: 'Monitoring', es: 'Monitoreo' }, action: { en: 'Interpreted action', es: 'Acción interpretada' }, page: 2 }] }
  const [issue] = reportIssues(report, { placeId: place.id, name: place.name })
  for (const language of ['en', 'es'] as const) {
    const value = evidenceFactText(issue, language)
    expect(value).not.toContain(`“${report.issues[0].title[language]}”`)
    expect(value).not.toContain(`“${report.issues[0].action[language]}”`)
    expect(value).toMatch(/automated|automática/i)
  }
})

test('document year conflicts use the printed title, not the retrieval year', () => {
  const report = { year: 2025, state: 'unreviewed' as const, url: 'https://health.arkansas.gov/report', note: { en: 'Checked Oct 19, 2026: requested link returns a document titled 2024 with 2025 test results. The report year is inconsistent.', es: 'El año es inconsistente.' } }
  const document = reportDocument(report, { placeId: place.id, name: place.name }, '2026-11-17')
  expect(document.yearConflict?.en).toContain('2024')
  expect(document.yearConflict?.en).not.toContain('2026')
  expect(reportDocument({ ...report, note: { en: 'Checked in 2026; covers 2025 results.', es: 'Revisado en 2026.' } }, { placeId: place.id, name: place.name }, '2026-11-17').yearConflict).toBeUndefined()
})

test('an archived federal status is never presented as a correction', () => {
  seed()
  const body = generateMessage(draft(), 'en').body
  expect(body).not.toMatch(/resolved on 10\/31\/2025|corrected on 10\/31\/2025/i)
  const october = body.split('\n').filter(line => line.startsWith('- ')).find(line => /Bacteriological sampling/.test(line))!
  expect(october).toMatch(/\?/)
})

test('“Ask about this finding” quotes only what was verified', () => {
  seed()
  // A hand-reviewed annual-report row is quoted with its page.
  expect(evidenceQuestion(place, '2025:3', 'en')).toContain('Your 2025 annual water report (page 2) lists: “Failed to provide Public Education Notice')
  // A federal record is described, never quoted as the agency's exact words.
  const federal = evidenceQuestion(place, 'echo:AR0000747:8848272', 'en')
  expect(federal).toBeUndefined()
  seed({ ...records, violations: [violation('8848299', { from: '03/01/2024', through: '03/31/2024', status: 'Addressed' })] })
  const other = evidenceQuestion(place, 'echo:AR0000747:8848299', 'en')!
  expect(other).toContain('record 8848299')
  expect(other).toMatch(/a person has not checked it/)
  expect(other).not.toContain('“')
})

test('a copied survey detail is not attributed to an annual report or a human review', () => {
  seed({ ...records, surveys: [{ id: 'survey-1', on: '05/12/2025', type: 'Sanitary Survey', areas: [{ key: 'Treatment', flagged: true, detail: 'Source field copied' }] }] })
  const question = evidenceQuestion(place, 'echo:survey-1:Treatment', 'en')!
  expect(question).toMatch(/official record/)
  expect(question).not.toMatch(/annual water report/)
  expect(question).toMatch(/a person has not checked/)
})

test('a later record check never rewrites a saved message, and manual edits survive', () => {
  const original = draft()
  const saved = updateDraft({ ...original, flowStep: 'send' }, { flowStep: 'send' }, 'en')
  expect(saved.body).toBeTruthy()
  const manual = updateDraft(saved, { body: 'My own words.', subject: 'My subject' }, 'en')
  expect(manual.bodyEdited).toBe(true)
  // New records arrive on this device after the draft was written.
  seed()
  const afterRecords = updateDraft(manual, { facts: initialFacts(place, [], false, false, 'en') }, 'en')
  expect(afterRecords.body).toBe('My own words.')
  expect(afterRecords.subject).toBe('My subject')
  // The saved evidence snapshot stays authoritative for an unedited message too.
  const snapshot = relevantFacts(saved)
  expect(snapshot.every(fact => fact.text.trim())).toBe(true)
  expect(generateMessage({ ...saved, facts: snapshot }, 'en').body).not.toContain('8848272')
})

test('resuming a draft preserves the saved evidence instead of appending newly found issues', () => {
  const original = draft()
  seed({ ...records, violations: [violation('new-record', { from: '03/01/2024', through: '03/31/2024' })] })
  const resumed = savedFacts(original, false, 'en')
  expect(resumed.map(fact => fact.id)).toEqual(original.facts.map(fact => fact.id))
  expect(resumed.map(fact => fact.text)).toEqual(original.facts.map(fact => fact.text))
})

test('merged evidence survives serialization and does not need the source cache to compose', () => {
  seed()
  const original = draft()
  const expected = generateMessage(original, 'en').body
  localStorage.clear()
  expect(generateMessage(JSON.parse(JSON.stringify(original)), 'en').body).toBe(expected)
  expect(expected).toContain('Documented resolution:')
  expect(expected).toContain('confirm')
})

test('Ask prioritizes a finding beyond the initial record preview within draft limits', () => {
  seed({ ...records, violations: Array.from({ length: 30 }, (_, i) => violation(`older-${i}`, { from: `03/01/${1990 + i}`, through: `03/31/${1990 + i}` })) })
  const selected = 'echo:AR0000747:older-29'
  const facts = initialFacts(place, [], false, false, 'en', selected)
  expect(facts[0].id).toBe(selected)
  expect(facts[0].included).toBe(true)
  expect(facts.length).toBeLessThanOrEqual(60)
  expect(facts.reduce((total, fact) => total + fact.text.length + 2, 0)).toBeLessThanOrEqual(16000)
})

test('explicit evidence refresh keeps resident facts and reports material changes', () => {
  const original = draft()
  original.facts.push({ id: 'resident-note', kind: 'saved', text: 'My saved account', included: true, sources: [] })
  expect(updatedEvidenceFacts(original, false, 'en').changed).toBe(0)
  seed()
  const refresh = updatedEvidenceFacts(original, false, 'en')
  expect(refresh.changed).toBe(2)
  expect(refresh.facts.find(fact => fact.id === 'resident-note')?.text).toBe('My saved account')
  expect(refresh.facts.find(fact => fact.id === '2025:3')?.record?.evidence?.resolution).toContain('01/13/2026')
  expect(original.facts.find(fact => fact.id === '2025:3')?.record?.evidence).toBeUndefined()
})

test('refresh retains historical snapshots when a source is unavailable', () => {
  seed()
  const original = draft()
  localStorage.clear()
  const refreshed = updatedEvidenceFacts(original, false, 'en')
  // A missing federal cache is not evidence that its earlier outcome disappeared.
  expect(refreshed.facts.find(fact => fact.id === '2025:3')?.record?.evidence?.resolution).toContain('01/13/2026')
})
