import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { REPORT_CHECK_KEY } from '../src/report-check'
import { initialFacts, savedFacts, factPatch } from '../src/help-flow'
import { blankRequest, generateMessage } from '../src/help-requests'
import { updateDraft } from '../src/help-draft'
import { ReportContextSelection } from '../src/ReportContextSelection'
import { ReviewEmail } from '../src/ReviewEmail'

const place = { id: `ADH:${'a'.repeat(64)}`, name: 'Synthetic supplier', county: 'Benton', kind: 'system' as const }
const issue = { category: 'monitoring', title: { en: 'Missing bacteriological samples', es: 'Faltan muestras bacteriológicas' }, heading: { en: 'Monitoring', es: 'Monitoreo' }, action: { en: 'None listed', es: 'Ninguna indicada' }, reportedFrom: '10/01/2025', reportedThrough: '10/31/2025', page: 2 }
function detection(state = 'aiSummarized') {
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify({ [place.id]: { state, year: 2025, url: 'https://health.arkansas.gov/eng/d.aspx?P=001&YEAR=2025', checkedAt: '2026-11-17', summarizedOn: '2026-11-17', readOn: '2026-11-17', model: 'synthetic', issues: [issue] } }))
}
afterEach(() => { cleanup(); localStorage.clear() })
test('oversized automated metadata never loses the interpretation disclosure', () => {
  detection()
  const stored = JSON.parse(localStorage.getItem(REPORT_CHECK_KEY)!)
  stored[place.id].issues[0].title.en = 'x'.repeat(8001)
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify(stored))
  expect(initialFacts(place, [], false, false, 'en')).toEqual([])
})
test('device-local detections automatically enter the email as historical interpretation, not quotations', () => {
  detection()
  const facts = initialFacts(place, [], false, false, 'en')
  expect(facts).toHaveLength(1)
  expect(facts[0].included).toBe(true)
  expect(facts[0].record).toMatchObject({ sourceMethod: 'aiSummarized', verified: false, year: '2025' })
  const draft = { ...blankRequest(place), issue: 'quality' as const, route: 'adh' as const, facts, wording: { report: { particles: 'Particles in the water' }, response: {} } }
  expect(generateMessage(draft, 'en').body).toContain(issue.title.en)
  const selected = { ...draft, ...factPatch(facts.map(f => ({ ...f, included: true }))) }
  const body = generateMessage(selected, 'en').body
  expect(body).toContain(issue.title.en)
  expect(body).toContain('2025')
  expect(body).toContain('10/01/2025')
  expect(body).toContain('#page=2')
  expect(body).toContain('Source note: AI-assisted interpretation; check the original report.')
  expect(body).not.toContain(`“${issue.title.en}”`)
  expect(body).not.toContain('WAVE')
  expect(body).not.toContain('caused')
  expect(initialFacts(place, [], false, true, 'en')).toEqual([])
  expect(initialFacts({ ...place, id: `ADH:${'b'.repeat(64)}` }, [], false, false, 'en')).toEqual([])
})
test('old drafts gain included findings without replacing snapshots or manually edited messages', () => {
  detection()
  const old = { ...blankRequest(place), facts: [], subject: 'My subject', body: 'My words', subjectEdited: true, bodyEdited: true }
  const resumed = updateDraft(old, factPatch(savedFacts(old, false, 'en')), 'en')
  expect(resumed.facts).toHaveLength(1)
  expect(resumed.facts![0].included).toBe(true)
  expect(resumed.subject).toBe('My subject')
  expect(resumed.body).toBe('My words')
  const snapshot = { ...resumed, facts: resumed.facts!.map(f => ({ ...f, text: 'Preserved snapshot', included: true })) }
  expect(savedFacts(snapshot, false, 'en')[0]).toMatchObject({ text: 'Preserved snapshot', included: true })
  expect(savedFacts({ ...snapshot, facts: snapshot.facts.map(f => ({ ...f, included: false })) }, false, 'en')[0].included).toBe(true)
})
test('automatic table reads have a non-AI source note; unread URLs are not findings', () => {
  detection('autoRead')
  const facts = initialFacts(place, [], false, false, 'es').map(f => ({ ...f, included: true }))
  expect(facts).toHaveLength(1)
  const body = generateMessage({ ...blankRequest(place), facts }, 'es').body
  expect(body).toContain('Lectura automática de tablas; consulta el informe original.')
  expect(body).not.toContain('IA')
  detection('unreviewed')
  expect(initialFacts(place, [], false, false, 'en')).toEqual([])
})
test('finding confirmation uses the existing checkbox card and quiet source disclosure', () => {
  detection()
  const change = vi.fn(), facts = initialFacts(place, [], false, false, 'en').map(f => ({ ...f, included: false }))
  render(<ReportContextSelection place={place} facts={facts} sample={false} language="en" changeFacts={change} />)
  fireEvent.click(screen.getByText('Add or review report findings'))
  const checkbox = screen.getByRole('checkbox', { name: /Include this finding:/ })
  expect(checkbox).not.toBeChecked()
  expect(checkbox.closest('.request-wording-choice')).not.toBeNull()
  expect(screen.getByText('AI-assisted interpretation; check the original report.')).toBeInTheDocument()
  fireEvent.click(checkbox)
  expect(change.mock.calls[0][0][0].included).toBe(true)
})
test('automatic verification uses recipient-appropriate wording for legacy empty choices', () => {
  detection()
  const previous = { ...blankRequest(place), facts: initialFacts(place, [], false, false, 'en') }
  const draft = updateDraft(previous, factPatch(previous.facts.map(f => ({ ...f, included: true }))), 'en')
  expect(generateMessage({ ...draft, route: 'adh', recipientRoutes: ['adh'] }, 'en').body).toContain('available to ADH')
  const optedOut = updateDraft(draft, { wording: { report: {}, response: { reportVerify: '' } } }, 'en')
  expect(generateMessage(optedOut, 'en').body).toContain('supporting records')
  expect(updateDraft(optedOut, { flowStep: 'request' }, 'en').wording?.response.reportVerify).toBe('')
})
test('review explains empty report context and keeps each edit action outside running prose', () => {
  const go = vi.fn()
  render(<ReviewEmail draft={{ ...blankRequest(place), facts: [] }} language="en" extras={null} edit={vi.fn()} changeFacts={vi.fn()} go={go} regenerate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
  expect(screen.getByText(/No report findings available/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit report selection' })).not.toBeInTheDocument()
  for (const label of ['Edit experience', 'Edit requests']) {
    if (screen.queryByRole('button', { name: 'Review answers' })) fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
    const button = screen.getByRole('button', { name: label })
    expect(button.closest('p')).toBeNull()
    fireEvent.click(button)
  }
  expect(go.mock.calls.map(([step]) => step)).toEqual(['noticed', 'request'])
})
