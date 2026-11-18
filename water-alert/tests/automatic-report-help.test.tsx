import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, expect, test } from 'vitest'
import { helpPath, helpStep, initialFacts, savedFacts, relevantFacts } from '../src/help-flow'
import { blankRequest, generateMessage } from '../src/help-requests'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { REPORT_CHECK_KEY } from '../src/report-check'
import { updateDraft } from '../src/help-draft'
import { GuidedHelp } from '../src/GuidedHelp'

const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
afterEach(() => { cleanup(); localStorage.clear() })
test('all available supplier findings are included, including saved unchecked snapshots', () => {
  const facts = initialFacts(place, [], false, false, 'en')
  expect(facts.length).toBeGreaterThan(0)
  expect(facts.every(f => f.included)).toBe(true)
  const d = { ...blankRequest(place), facts: facts.map(f => ({ ...f, included: false })), body: 'My manual letter', bodyEdited: true }
  const restored = savedFacts(d, false, 'en')
  expect(restored.every(f => f.included)).toBe(true)
  expect(relevantFacts(d).every(f => f.included)).toBe(true)
  expect(updateDraft(d, { facts: restored }, 'en').body).toBe('My manual letter')
})
test('the removed questions screen resumes at request and all drafts have six input screens', () => {
  const d = { ...blankRequest(place), facts: initialFacts(place, [], false, false, 'en') }
  expect(helpPath(d)).toEqual(['choose', 'noticed', 'details', 'request', 'response', 'anything', 'send'])
  expect(helpStep({ ...d, flowStep: 'reportQuestions' })).toBe('request')
})
test.each(['en', 'es'] as const)('findings automatically ask for corrective action, records and next steps (%s)', language => {
  const d = { ...blankRequest(place), issue: 'service' as const, description: 'Water interruptions', facts: initialFacts(place, [], false, false, language) }
  const body = generateMessage(d, language).body
  expect(body).toContain(language === 'es' ? 'medidas correctivas' : 'corrective steps')
  expect(body).toContain(language === 'es' ? 'documentos de respaldo' : 'supporting records')
  expect(body).toContain(language === 'es' ? 'residentes deben tomar' : 'residents need to take action')
  expect(body).toContain(language === 'es' ? 'asuntos separados' : 'separate issues')
  const noConcern = generateMessage({ ...d, issue: 'report', description: '' }, language).body
  expect(noConcern).not.toContain(language === 'es' ? 'asuntos separados' : 'separate issues')
})
test('automated exact-supplier findings are included with interpretation note, never in samples', () => {
  const supplier = { ...place, id: `ADH:${'a'.repeat(64)}` }
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify({ [supplier.id]: { state: 'aiSummarized', year: 2025, url: 'https://health.arkansas.gov/report.pdf', checkedAt: '2026-11-17', summarizedOn: '2026-11-17', model: 'synthetic', issues: [{ title: { en: 'Synthetic finding', es: 'Hallazgo ficticio' }, heading: { en: 'Monitoring', es: 'Monitoreo' }, action: { en: 'None listed', es: 'Ninguna indicada' }, category: 'monitoring', page: 2 }] } }))
  const facts = initialFacts(supplier, [], false, false, 'en')
  expect(facts[0]?.included).toBe(true)
  const body = generateMessage({ ...blankRequest(supplier), issue: 'report', facts }, 'en').body
  expect(body).toContain('AI-assisted interpretation; check the original report.')
  expect(body).not.toContain('“Synthetic finding”')
  expect(initialFacts(supplier, [], false, true, 'en')).toEqual([])
})
test('the live Help screens omit report selectors and place Review answers beside progress', () => {
  const d = { ...blankRequest(place), issue: 'service' as const, facts: initialFacts(place, [], false, false, 'en'), body: 'Manual letter', subject: 'Manual subject' }
  const props = { place, language: 'en' as const, sample: false, deviceOnly: true, delivery: false, sending: false, saveFailed: false, heading: createRef<HTMLHeadingElement>(), extras: null, onHistory: () => {}, edit: () => {}, changeFacts: () => {}, go: () => {}, send: () => {}, regenerate: () => {} }
  const { rerender } = render(<GuidedHelp {...props} draft={{ ...d, flowStep: 'noticed' }} />)
  expect(screen.queryByText('Add or review report findings')).not.toBeInTheDocument()
  rerender(<GuidedHelp {...props} draft={{ ...d, flowStep: 'send' }} />)
  const review = screen.getByRole('button', { name: 'Review answers' })
  expect(review.closest('.request-progress-heading')).not.toBeNull()
  expect(screen.queryByText('Contact and next steps')).not.toBeInTheDocument()
  fireEvent.click(review)
  expect(screen.getByRole('heading', { name: 'Your answers' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit report selection' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Back to email' }))
  expect(screen.getByLabelText('Message')).toHaveValue('Manual letter')
})
