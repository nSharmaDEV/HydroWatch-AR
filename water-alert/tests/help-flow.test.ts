import { expect, test } from 'vitest'
import { factPatch, helpPath, helpStep, initialFacts, savedFacts, stepLabel } from '../src/help-flow'
import { blankRequest } from '../src/help-requests'
import { samplePlaces } from '../src/sample'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

test('every issue uses four one-card steps; records are skipped and legacy drafts resume on the screen holding their answers', () => {
  const draft = blankRequest(samplePlaces[0])
  const four = ['choose', 'details', 'response', 'send']
  expect(helpPath(draft)).toEqual(four)
  expect(helpPath({ ...draft, issue: 'billing' })).toEqual(four)
  expect(helpPath({ ...draft, issue: 'other' })).toEqual(four)
  expect(helpPath({ ...draft, issue: 'report' })).toEqual(four)
  expect(helpPath(draft)).not.toContain('records')
  expect(helpStep({ ...draft, flowStep: 'confirm', stage: 3 })).toBe('send')
  expect(helpStep({ ...draft, flowStep: 'records' })).toBe('send')
  expect(helpStep({ ...draft, flowStep: 'timing' })).toBe('details')
  expect(helpStep({ ...draft, flowStep: 'response' })).toBe('response')
  expect(helpStep({ ...draft, flowStep: 'details' })).toBe('details')
  expect(helpStep({ ...draft, flowStep: 'where' })).toBe('details')
  expect(helpStep({ ...draft, flowStep: 'billing' })).toBe('details')
  expect(helpStep({ ...draft, flowStep: 'experience' })).toBe('choose')
  expect(helpStep({ ...draft, flowStep: 'review' })).toBe('send')
  expect(helpStep({ ...draft, flowStep: 'send' })).toBe('send')
  expect(helpStep({ ...draft, stage: 2 })).toBe('send')
  expect(helpStep(draft)).toBe('choose')
  expect(stepLabel({ ...draft, flowStep: 'where' }, 'en')).toBe('Step 2 of 4 · When and where')
  expect(stepLabel({ ...draft, flowStep: 'response' }, 'es')).toBe('Paso 3 de 4 · ¿Qué deben hacer?')
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
test('required no-action-listed findings remain historical; optional findings need opt-in and resumed prose is preserved', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
  const facts = initialFacts(place, [], false, false, 'en')
  expect(facts.length).toBeGreaterThan(0)
  const requiredIds = ['2025:2', '2025:3']
  expect(facts.every(f => f.kind === 'historical' && f.included === requiredIds.includes(f.id) && f.text.includes('2025') && f.sources[0].url.startsWith('https:'))).toBe(true)
  expect(facts.filter(f => f.included).map(f => f.id)).toEqual(requiredIds)
  expect(factPatch(facts).context).toContain('2025')
  expect(factPatch(facts.filter(f => !requiredIds.includes(f.id))).context).toBe('')
  expect(factPatch([{ ...facts[0], included: true }]).sources).toEqual(facts[0].sources)
  const optional = facts.find(f => !requiredIds.includes(f.id))!
  const draft = { ...blankRequest(place), body: 'My edited message', facts: [{ ...optional, kind: 'active' as const, included: true, text: 'My edited source fact' }] }
  const resumed = savedFacts(draft, false, 'en')
  expect(resumed[0]).toEqual({ ...draft.facts[0], kind: 'saved' })
  expect(resumed.filter(f => requiredIds.includes(f.id)).every(f => f.kind === 'historical' && f.included)).toBe(true)
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
