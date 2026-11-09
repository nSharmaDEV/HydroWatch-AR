import { describe, expect, test, vi } from 'vitest'
import { blankRequest, generateMessage } from '../src/help-requests'
import { generateReport } from '../src/help-outputs'
import { initialFacts, savedFacts } from '../src/help-flow'
import { localizeDraft, updateDraft } from '../src/help-draft'
import { callScript } from '../src/send-options'
import type { Place } from '../src/domain'

// All records are fictional, isolated from the bundled report inventory and live storage.
vi.mock('../src/annual-reports.js', () => {
  const issue = { category: 'monitoring', title: { en: 'Synthetic monitoring finding', es: 'Hallazgo de monitoreo ficticio' }, page: 2, currentAsPrinted: true, action: { en: 'None listed', es: 'Ninguna indicada' } }
  return { ANNUAL_REPORTS: {
    'synthetic:reviewed': [{ state: 'reviewed', year: 2025, reviewedOn: '2026-11-01', url: 'https://example.test/report', issues: [issue] }],
    'synthetic:ai': [{ state: 'aiSummarized', year: 2025, url: 'https://example.test/ai', issues: [issue] }],
    'synthetic:unavailable': [{ state: 'unavailable', year: 2025 }],
  } }
})
const place: Place = { id: 'synthetic:reviewed', name: 'Fictional Water', county: 'Example', kind: 'system' }

describe.each(['en', 'es'] as const)('structured email (%s)', language => {
  const es = language === 'es'
  const headings = es ? ['Qué pasó', 'Lo que ya intenté', 'Lo que solicito', 'Registros relacionados'] : ['What happened', 'What I’ve already tried', 'What I’m requesting', 'Related records']
  test('separates observations, resident comments, prior contact and numbered requests', () => {
    const comment = es ? 'La cocina y el baño tienen poca presión por la tarde.' : 'The kitchen and bathroom have low pressure in the evening.'
    const details = es ? '¿Necesitan una visita? Avísenme antes.' : 'Do you need a service visit? Let me know beforehand.'
    const question = es ? '¿Qué información necesitan de mí?' : 'What information do you need from me?'
    const d = { ...blankRequest(place), locations: ['123 Fictional Lane'], description: comment, answers: { began: '2026-11-01', frequency: 'At particular times', contacted: 'Yes', contactMethod: es ? 'teléfono' : 'phone', contactResponse: es ? 'Registraron mi consulta.' : 'They logged my question.', response: question }, wording: { report: { first: es ? 'Menos presión de lo habitual' : 'Lower pressure than usual' }, response: { third: es ? 'Explicar qué está pasando' : 'Explain what is happening', details } } }
    const { subject, body } = generateMessage(d, language)
    expect(subject).toContain('123 Fictional Lane')
    expect(subject).toContain(es ? 'Presión' : 'pressure')
    for (const heading of headings.slice(0, 3)) expect(body).toContain(`${heading}\n`)
    expect(body).not.toContain(headings[3])
    expect(body).toContain(`\n\n${comment}\n\n`)
    expect(body).toContain(`2. ${details}\n3. ${question}`)
    expect(body).toContain(d.answers.contactResponse)
    expect(body).toContain(es ? 'causa conocida' : 'known cause')
    expect(body).not.toMatch(/5 business days|5 días hábiles|safe to drink|compensation|compensación/)
    expect(body).not.toContain(es ? 'Restablecer el servicio' : 'Restore service')
    expect(body).not.toContain(es ? 'Compartir una actualización' : 'Share an update')
    for (const output of [generateReport(d, language), callScript(d, language).join('\n')]) {
      for (const text of [comment, details, question, es ? 'causa conocida' : 'known cause']) expect(output).toContain(text)
    }
  })

  test('billing subject includes selected issue and bill period, with only selected requests', () => {
    const d = { ...blankRequest(place), issue: 'billing' as const, answers: { billingPeriod: '2026-10', amount: '$24', tried: 'Synthetic prior billing enquiry' }, wording: { report: { second: es ? 'Un cargo aparece más de una vez' : 'A charge appears more than once' }, response: { first: es ? 'Revisar el cargo' : 'Review the charge' } }, facts: initialFacts(place, [], false, false, language) }
    const message = generateMessage(d, language)
    expect(message.subject).toContain('2026-10')
    expect(message.subject).toContain(es ? 'Un cargo aparece más de una vez' : 'A charge appears more than once')
    expect(message.body).toContain('$24')
    expect(message.body).toContain(`${headings[1]}\nSynthetic prior billing enquiry.`)
    expect(message.body).toContain(es ? 'corregirlo si es incorrecto' : 'correct it if it is incorrect')
    expect(message.body).not.toContain(es ? 'Explicar los próximos pasos disponibles' : 'Explain available next steps')
    // Required historical evidence remains included even for billing, without implying causation.
    expect(message.body).toContain(headings[3])
    expect(message.body).toContain('2025')
    expect(message.body).not.toMatch(/caused this charge|causó este cargo/)
  })

  test('multiple selected billing observations cannot crowd the period and address out of the subject', () => {
    const address = '123 Fictional Lane, Apartment 4, Example City, Arkansas 70000'
    const d = { ...blankRequest(place), issue: 'billing' as const, locations: [address], answers: { billingPeriod: 'October–November 2026' }, wording: { report: es ? { first: 'Un cargo que no reconozco', second: 'Un cargo aparece más de una vez', third: 'El importe difiere de lo esperado' } : { first: 'A charge I do not recognize', second: 'A charge appears more than once', third: 'The amount differs from what I expected' }, response: { second: es ? 'Explicar la factura' : 'Explain the bill' } } }
    const { subject, body } = generateMessage(d, language)
    expect(subject.length).toBeLessThanOrEqual(200)
    expect(subject).toContain('October–November 2026')
    expect(subject).toContain(address)
    expect(body).toContain(es ? 'cómo se calculó' : 'how the questioned amount was calculated')
    expect(body).not.toContain(es ? 'corregirlo' : 'correct it')
    const observations = es ? ['Hay un cargo en mi factura que no reconozco.', 'Un cargo aparece más de una vez en mi factura.', 'El total es diferente de lo que esperaba.'] : ['There is a charge on my bill that I do not recognize.', 'A charge appears more than once on my bill.', 'The total is different from what I expected.']
    for (const observation of observations) expect(body).toContain(observation)
  })

  test('report asks retain historical provenance, printed status and supporting documentation', () => {
    const d = { ...blankRequest(place), issue: 'report' as const, facts: initialFacts(place, [], false, false, language), wording: { report: {}, response: { first: es ? 'Decirme si esto ya se resolvió' : 'Tell me whether this has been resolved', second: es ? 'Enviarme una copia de cualquier aviso al respecto' : 'Send me a copy of any notice about it' } } }
    const body = generateMessage(d, language).body
    expect(body).toContain(es ? 'documentación de respaldo' : 'supporting documentation')
    expect(body).toContain(es ? '2025 (página 2)' : '2025 report (page 2)')
    expect(body).toContain('https://example.test/report#page=2')
    expect(body).toContain(es ? 'no es el estado actual' : 'not current status')
    expect(body).toContain('“Current”')
    expect(body).not.toContain(headings[0])
    expect(body.indexOf(headings[2])).toBeLessThan(body.indexOf(headings[3]))
  })

  test.each(['synthetic:ai', 'synthetic:unavailable', 'synthetic:wrong-system'])('does not invent evidence or requests for %s', id => {
    const p = { ...place, id }
    const d = { ...blankRequest(p), issue: 'report' as const, evidence: ['2025:0'], facts: initialFacts(p, [], false, false, language), wording: { report: {}, response: { details: '' } } }
    const body = generateMessage(d, language).body
    expect(body).not.toContain('Synthetic monitoring finding')
    expect(body).not.toContain('Hallazgo de monitoreo ficticio')
    expect(body).not.toContain('https://example.test/')
    for (const heading of headings) expect(body).not.toContain(heading)
    expect(savedFacts({ ...d, facts: undefined }, false, language)).toEqual([])
  })

  test('manual and intentionally blank fields survive edits and localization; unchecked requests stay absent', () => {
    let d = updateDraft({ ...blankRequest(place), wording: { report: {}, response: { details: '' } } }, { flowStep: 'review' }, language)
    d = updateDraft(d, { subject: 'My manual subject', body: '' }, language)
    d = updateDraft(d, { description: 'New synthetic comment' }, language)
    const next = localizeDraft(d, es ? 'en' : 'es')
    expect(next.subject).toBe('My manual subject')
    expect(next.body).toBe('')
    expect(next.wording?.response).toEqual({ details: '' })
    expect(generateMessage(next, language).body).not.toContain(headings[2])
  })

  test('legacy custom action keys preserve resident casing and question punctuation', () => {
    const custom = es ? '¿pueden responder por escrito? No me llamen.' : 'can you reply in writing? Please do not call me.'
    const d = { ...blankRequest(place), wording: { report: {}, response: { first: custom } } }
    for (const output of [generateMessage(d, language).body, generateReport(d, language), callScript(d, language).join('\n')]) expect(output).toContain(`1. ${custom}`)
  })

  test('keeps source wording and excluded choices while distinguishing a saved record from current status', () => {
    const d = { ...blankRequest(place), issue: 'advisory' as const, facts: initialFacts(place, [{ id: 'synthetic-notice', placeId: place.id, name: place.name, county: place.county, agency: 'ADH' as const, kind: 'boil' as const, issued: '2026-10-31', lifted: null, reason: 'Synthetic: pressure loss — cause unconfirmed', area: 'Synthetic: only the listed block', url: 'https://example.test/notice' }], true, false, language) }
    const active = generateMessage(d, language).body
    expect(active).toContain(es ? 'Figuraba como activo en la consulta de la fuente' : 'It was listed as active in the source check')
    const saved = savedFacts(d, false, language)
    const body = generateMessage({ ...d, facts: saved }, language).body
    for (const text of ['Synthetic: pressure loss — cause unconfirmed', 'Synthetic: only the listed block', 'https://example.test/notice']) expect(body).toContain(text)
    expect(body).toContain(es ? 'Su estado actual no se ha verificado.' : 'Its current status has not been verified.')
    expect(body).not.toContain(es ? 'Figuraba como activo en la consulta de la fuente' : 'It was listed as active in the source check')
    const excluded = generateMessage({ ...d, facts: saved.map(f => ({ ...f, included: false })) }, language).body
    expect(excluded).not.toContain('https://example.test/notice')
    // Required historical findings cannot be silently dropped with optional source choices.
    expect(excluded).toContain('https://example.test/report#page=2')
  })
})
