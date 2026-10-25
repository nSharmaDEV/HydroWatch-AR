import { expect, test } from 'vitest'
import { factPatch, helpPath, helpStep, initialFacts, savedFacts } from '../src/help-flow'
import { blankRequest } from '../src/help-requests'
import { samplePlaces } from '../src/sample'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

test('records are skipped when none exist and billing has an honest extra step', () => {
  const draft = blankRequest(samplePlaces[0])
  expect(helpPath(draft)).toEqual(['choose', 'timing', 'experience', 'response', 'review'])
  expect(helpPath({ ...draft, issue: 'billing' })).toEqual(['choose', 'timing', 'experience', 'response', 'review'])
  expect(helpPath({ ...draft, issue: 'other' })).toEqual(['choose', 'timing', 'experience', 'response', 'review'])
  expect(helpStep({ ...draft, flowStep: 'confirm', stage: 3 })).toBe('review')
  expect(helpStep({ ...draft, flowStep: 'records' })).toBe('review')
})
test('initial fact previews stay within draft bounds without truncating agency wording', () => {
  const p = samplePlaces[0]
  const reason = 'Published agency wording. '.repeat(350)
  const notice = { id: 'bounded', placeId: p.id, name: p.name, county: p.county, agency: 'ADH' as const, kind: 'boil' as const, area: 'North', issued: '2026-10-20', lifted: null, reason: `${reason}\n${reason}\n${reason}`, url: 'https://example.test/source' }
  const facts = initialFacts(p, [notice], true, true, 'en')
  expect(facts.length).toBeGreaterThan(0)
  expect(factPatch(facts).context.length).toBeLessThanOrEqual(16000)
  expect(facts.every(f => f.text.includes(reason.trim()))).toBe(true)
})
test('historical findings require opt-in and resumed facts never acquire a live status', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
  const facts = initialFacts(place, [], false, false, 'en')
  expect(facts.length).toBeGreaterThan(0)
  expect(facts.every(f => f.kind === 'historical' && !f.included && f.text.includes('2025') && f.sources[0].url.startsWith('https:'))).toBe(true)
  expect(factPatch(facts).context).toBe('')
  expect(factPatch([{ ...facts[0], included: true }]).sources).toEqual(facts[0].sources)
  const draft = { ...blankRequest(place), body: 'My edited message', facts: [{ ...facts[0], kind: 'active' as const, included: true, text: 'My edited source fact' }] }
  const resumed = savedFacts(draft, false, 'en')
  expect(resumed[0]).toEqual({ ...draft.facts[0], kind: 'saved' })
  expect(draft.body).toBe('My edited message')
})
test('separate advisory facts retain exact-supplier source, dates, area and status', () => {
  const p = samplePlaces[0]
  const notice = { id: 'synthetic', placeId: p.id, name: p.name, county: p.county, agency: 'ADH' as const, kind: 'boil' as const, area: 'North', issued: '2026-10-20', lifted: null, reason: 'Pressure loss\nRepair', url: 'https://example.test/source' }
  const facts = initialFacts(p, [notice], true, true, 'en')
  expect(facts).toHaveLength(2)
  expect(facts[0].text).toContain('Pressure loss')
  expect(facts[0].text).toContain('October 20, 2026')
  expect(facts[0].record?.date).toBe('2026-10-20')
  expect(facts[0].text).toContain('North')
  expect(facts[0].sources[0].url).toBe(notice.url)
  expect(facts[0].kind).toBe('active')
  expect(initialFacts({ ...p, id: 'unrelated' }, [notice], true, true, 'en')).toEqual([])
  expect(helpPath({ ...blankRequest(p), facts })).not.toContain('records')
})
