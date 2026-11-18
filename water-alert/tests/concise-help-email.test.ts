import { expect, test } from 'vitest'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { initialFacts } from '../src/help-flow'
import { blankRequest, generateMessage } from '../src/help-requests'
import { updateDraft } from '../src/help-draft'

const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills Mobile Home Park', county: 'Benton', kind: 'system' as const }
function draft(language: 'en' | 'es') {
  const es = language === 'es'
  return { ...blankRequest(place), issue: 'service' as const, locations: ['1510 North Walton Boulevard, Bentonville'], facts: initialFacts(place, [], false, false, language), wording: { report: { service: es ? 'El servicio se interrumpe repetidamente' : 'Service keeps stopping' }, response: { restore: es ? 'Restablecer el servicio' : 'Restore service', update: es ? 'Compartir una actualización' : 'Share an update' } } }
}
test.each(['en', 'es'] as const)('concise action email has four specific bullets, one closing and end citations (%s)', language => {
  const es = language === 'es', body = generateMessage(draft(language), language).body
  expect(body.split('\n\n')[1]).toContain('1510 North Walton Boulevard')
  expect(body.split('\n\n')[1]).toMatch(es ? /interrupciones.*¿/ : /interruptions.*\?/)
  const bullets = body.split('\n').filter(line => line.startsWith('- '))
  expect(bullets).toHaveLength(4)
  expect(bullets[0]).toMatch(es ? /informes.*reanud/i : /report.*resumed/i)
  expect(bullets[0]).toContain('07/11/2025')
  expect(bullets[0]).toContain('07/31/2025')
  expect(bullets[1]).toMatch(es ? /muestras.*resultados/i : /samples.*results/i)
  expect(bullets[1]).toContain('10/31/2025')
  expect(bullets[2]).toMatch(es ? /licencia.*requisito/i : /licensing.*requirement/i)
  expect(bullets[3]).toMatch(es ? /aviso.*infracción/i : /notice.*violation/i)
  bullets.forEach((bullet, index) => expect(bullet).toContain(`[${index + 1}]`))
  expect(body).toContain(es ? 'Son hallazgos históricos' : 'These are historical findings')
  expect(body).toContain(es ? 'fecha de finalización' : 'completion date')
  expect(body).toContain(es ? 'próxima actualización' : 'next update')
  expect(body).not.toContain('Could you explain what this entry means, what corrective steps')
  expect(body).not.toContain('What information should I provide to help you investigate')
  const sources = body.lastIndexOf(es ? 'Fuentes\n' : 'Sources\n')
  expect(sources).toBeGreaterThan(body.indexOf(es ? 'Gracias' : 'Thank you'))
  expect(body.slice(sources)).toContain('#page=2')
  expect(body.split(/\s+/).length).toBeLessThan(es ? 330 : 290)
})
test.each(['en', 'es'] as const)('ADH quality requests are direct and monitoring questions do not assume missing paperwork (%s)', language => {
  const es = language === 'es', d = draft(language)
  const body = generateMessage({ ...d, issue: 'quality', route: 'adh', recipientRoutes: ['adh'], wording: { report: { particles: es ? 'Partículas en el agua' : 'Particles in the water' }, response: { investigate: es ? 'Investigar la inquietud reportada' : 'Investigate the reported concern' } } }, language).body
  expect(body).toContain(es ? 'revisar estas observaciones y orientar sobre si corresponde una inspección o un muestreo' : 'review these observations and advise whether an inspection or sampling is appropriate')
  expect(body).toContain(es ? '¿Qué requisitos de monitoreo o presentación de informes no se cumplieron y se han cumplido desde entonces?' : 'Which monitoring or reporting requirements were missed, and have they since been completed?')
  expect(body).not.toContain(es ? '¿Se presentaron todos los informes pendientes?' : 'Were all missing reports submitted?')
  expect(body).not.toContain(es ? 'dentro de las funciones de ADH' : 'within ADH’s role')
})
test('agency requests respect its role and unrelated/custom evidence is preserved', () => {
  const d = draft('en')
  const body = generateMessage({ ...d, route: 'adh', recipientRoutes: ['adh'] }, 'en').body
  expect(body).toContain('available to ADH')
  expect(body).not.toContain('when will you restore')
  const snapshot = { ...d.facts[0], text: 'Saved custom evidence wording and limitations.', record: undefined }
  expect(generateMessage({ ...d, facts: [snapshot] }, 'en').body).toContain(snapshot.text)
})
test('concise generation preserves manual subject and message and omits an unsupported relationship', () => {
  const d = draft('en')
  const manual = updateDraft({ ...d, subject: 'My subject', body: 'My message', subjectEdited: true, bodyEdited: true }, { description: 'Updated context' }, 'en')
  expect(manual.subject).toBe('My subject')
  expect(manual.body).toBe('My message')
  const reportOnly = generateMessage({ ...d, issue: 'report', wording: { report: {}, response: {} } }, 'en').body
  expect(reportOnly).not.toContain('related to my reported concern')
})
test('report-only stock requests are folded into the findings instead of repeated above them', () => {
  const d = draft('en')
  const body = generateMessage({ ...d, issue: 'report', wording: { report: {}, response: { resolved: 'Tell me whether this has been resolved', notice: 'Send me a copy of any notice about it' } } }, 'en').body
  expect(body).not.toContain('1. Tell me whether this has been resolved')
  expect(body).toContain('supporting records')
})
test('saved custom questions appear once and unknown finding wording is not relabeled', () => {
  const d = draft('en'), question = 'Please explain the inspection dates in your records.'
  const fact = { ...d.facts[0], text: 'The 2025 report (page 2) records: “A different finding”. The document lists no corrective action.', record: { ...d.facts[0].record!, problem: 'A different finding' } }
  const body = generateMessage({ ...d, facts: [fact], wording: { report: {}, response: { reportAddressed: question } } }, 'en').body
  expect(body.split(question)).toHaveLength(2)
  expect(body).toContain('A different finding')
  expect(body).not.toContain('Were all missing reports submitted')
})
test('compaction does not discard additional text in a saved evidence snapshot', () => {
  const d = draft('en'), extra = 'The saved record also notes that the date was approximate.'
  const fact = { ...d.facts[0], text: `${d.facts[0].text} ${extra}` }
  expect(generateMessage({ ...d, facts: [fact] }, 'en').body).toContain(extra)
})
