import { describe, expect, it } from 'vitest'
import { blankRequest, generateMessage } from '../src/help-requests'
import { advisoryFacts, advisorySources } from '../src/help-facts'
import { reportMessage } from '../src/recovery-evidence'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import type { Notice, Place } from '../src/domain'
const place: Place = { id: 'sample:tailored', name: 'Fictional supplier', county: 'Example', kind: 'system' }
const notice: Notice = { id: 'sample:notice', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', reason: 'Pressure loss\nEquipment repair', area: 'Published north area', county: 'Example', issued: '2026-10-20', lifted: null, url: 'https://example.org/source' }
describe('tailored help messages', () => {
  it('uses all exact supplier notices with cited agency facts and honest status', () => {
    const facts = advisoryFacts(place, [notice, { ...notice, id: 'second', reason: 'Second listed issue' }, { ...notice, placeId: 'another', reason: 'WRONG SUPPLIER' }], true, false)
    expect(facts).toContain('Pressure loss')
    expect(facts).toContain('Equipment repair')
    expect(facts).toContain('Second listed issue')
    expect(facts).not.toMatch(/https?:|Agency-reported problem:|Published affected area:/)
    expect(advisorySources(place, [notice])).toEqual([{ recordId: notice.id, url: notice.url, label: 'ADH · 2026-10-20 · Published north area' }])
    expect(facts).not.toContain('WRONG SUPPLIER')
    expect(advisoryFacts(place, [notice], false, false)).toContain('Its current status has not been verified.')
    expect(advisoryFacts(place, [], false, false)).toBe('')
  })
  it('keeps multiple published problems on separate points and identifies each notice citation', () => {
    const second = { ...notice, id: 'second', area: 'Published south area', issued: '2026-10-21', reason: 'Separate published problem' }
    for (const language of ['en', 'es'] as const) {
      const facts = advisoryFacts(place, [notice, second], true, false, language)
      expect(facts).toContain('\n• “Pressure loss”\n• “Equipment repair”')
      expect(facts).toContain('Separate published problem')
      expect(facts).not.toContain('https://')
    }
    const sources = advisorySources(place, [notice, second])
    expect(sources[1].label).toBe('ADH · 2026-10-21 · Published south area')
    expect(sources[0].label).not.toBe(sources[1].label)
  })
  it('generates billing-specific facts without invented claims or irrelevant boilerplate', () => {
    const d = { ...blankRequest(place), issue: 'billing' as const, description: 'A charge appears twice', answers: { chargeKind: 'Duplicate charge', billingPeriod: 'October', amount: '$12', charge: 'Service charge', tried: 'Asked by phone', response: 'Please review this charge' } }
    const message = generateMessage(d, 'en')
    expect(message.subject).toContain('Bill or charge')
    for (const value of Object.values(d.answers)) expect(message.body).toContain(value)
    expect(message.body).not.toMatch(/entitlement|reference number|applicable policy/)
    expect(message.body).not.toMatch(/Resident-reported|Billing period \(optional\):|WAVE references/)
  })
  it('weaves exact-provider facts into prose with citations outside the body in both languages', () => {
    for (const language of ['en', 'es'] as const) {
      const d = { ...blankRequest(place), issue: 'advisory' as const, description: 'I cannot use my kitchen as usual.', context: advisoryFacts(place, [notice], true, false, language), sources: advisorySources(place, [notice]), answers: { response: 'Clarify the next update.' } }
      const message = generateMessage(d, language)
      expect(message.body).toContain('Pressure loss')
      expect(message.body).toContain('Published north area')
      expect(message.body).toContain(language === 'en' ? 'October 20, 2026' : '20 de octubre de 2026')
      expect(message.body).toContain(d.description)
      expect(message.body).toContain(d.answers.response)
      expect(message.body).toContain('https://example.org/source')
      expect(message.body).not.toMatch(/\[\]|WAVE references|Resident-reported|\(optional\)/)
    }
  })
  it('does not turn retained, lifted or unknown notices into active status, or lake notices into tap water facts', () => {
    expect(advisoryFacts(place, [{ ...notice, liftStatus: 'unknown' }], true, false)).not.toContain('active advisory')
    expect(advisoryFacts(place, [{ ...notice, lifted: '2026-10-21' }], true, false)).toContain('October 21, 2026')
    expect(advisoryFacts(place, [{ ...notice, kind: 'hab', agency: 'ADEQ' }], true, false)).toBe('')
    expect(advisoryFacts(place, [{ ...notice, area: '', reason: '', issued: null }], true, false)).not.toMatch(/null|undefined|not provided/i)
  })
  it('includes only selected exact-provider historical report findings as dated prose and separate citations', () => {
    const p = { ...place, id: LEISURE_HILLS_ID }
    const historical = reportMessage(p, false, ['2025:0'], 'en')
    expect(historical.context).toMatch(/2025.*report/)
    expect(historical.context).toContain('07/11/2025')
    expect(historical.context).toContain('07/31/2025')
    const unresolved = reportMessage(p, false, ['2025:3'], 'en').context
    expect(unresolved).toContain('not current status')
    expect(unresolved).not.toContain('action reported in that document is: “None listed”')
    expect(historical.context).toMatch(/historical|Historical/)
    expect(historical.context).not.toMatch(/https?:|Exact supplier ID:|HISTORICAL REPORT REFERENCES/)
    expect(historical.sources[0].url).toMatch(/#page=/)
    expect(reportMessage(p, true, ['2025:0'], 'en').context).toBe('')
    expect(reportMessage(place, false, ['2025:0'], 'en').context).toBe('')
  })
})
