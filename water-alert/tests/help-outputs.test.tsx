import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { blankRequest, generateMessage } from '../src/help-requests'
import { samplePlaces } from '../src/sample'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { ConfirmedWording } from '../src/ConfirmedWording'
import { answerFingerprint, generateReport } from '../src/help-outputs'
import { ResidentFollowups } from '../src/ResidentFollowups'
import { RequestLocations } from '../src/RequestLocations'
afterEach(() => { cleanup(); localStorage.clear() })
test('legacy saved source references remain present in both outputs', () => {
  const d = { ...blankRequest(samplePlaces[0]), context: 'Saved historical agency wording.', sources: [{ recordId: 'legacy', label: 'Saved source', url: 'https://example.test/legacy' }] }
  for (const text of [generateMessage(d, 'en').body, generateReport(d, 'en')]) expect(text).toContain('https://example.test/legacy')
})
test('natural email has no internal headings and omits unconfirmed contact outcomes', () => {
  const d = { ...blankRequest(samplePlaces[0]), description: 'The upstairs tap stopped.', locations: ['Oak Street'], answers: { began: '2026-10-20', ongoing: 'Yes', frequency: 'Occasional', contacted: 'Yes', contactMethod: 'Phone', contactResponse: 'I was told to check back.' } }
  const body = generateMessage(d, 'en').body
  expect(body).not.toMatch(/Your report:|Relevant WAVE records:|Requested response:/)
  expect(body).toContain('Oak Street')
  expect(body).toContain('I observed this occasionally.')
  expect(body).toContain('Phone')
  expect(body).toContain('I was told to check back.')
  expect(generateMessage({ ...d, answers: { ...d.answers, contacted: 'No' } }, 'en').body).not.toContain('check back')
})
test('selection stays a row until Edit wording is explicitly opened', () => {
  render(<ConfirmedWording draft={{ ...blankRequest(samplePlaces[0]), wording: { report: { first: 'No water' }, response: {} } }} section="report" es={false} edit={() => {}} />)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit wording: No water' }))
  expect(screen.getByRole('textbox')).toHaveValue('No water')
})
test('Other keeps five stages and Review derives a report without replacing manual email', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Other issue' }))
  expect(screen.getByText('Step 1 of 5')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.change(screen.getByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'Resident observation' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'My edited email' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.change(screen.getByLabelText('Additional wording (optional)'), { target: { value: 'Please explain next steps.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  expect(screen.getByLabelText('Message')).toHaveValue('My edited email')
  expect(screen.getByText('Your answers changed. Update the draft to include them.')).toBeVisible()
  expect(screen.queryByRole('tab', { name: 'Report' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download report' })).toBeVisible()
  expect(screen.getByLabelText('Message')).toHaveValue('My edited email')
})
test.each(['en','es'] as const)('both outputs preserve historical dates and unique source references (%s)', language => {
  const source = { recordId: 'historical', label: '2025 annual report', url: 'https://example.test/2025-report' }
  const d = { ...blankRequest(samplePlaces[0]), issue: 'quality' as const, description: 'I noticed particles.', residentName: 'Resident Example', replyContact: 'reply@example.test', facts: [{ id: 'one', kind: 'historical' as const, included: true, text: '2025 historical document observation, not current status.', sources: [source] }, { id: 'two', kind: 'saved' as const, included: true, text: 'Saved agency wording.', sources: [source] }] }
  for (const text of [generateMessage(d,language).body, generateReport(d,language)]) {
    expect(text).toContain('2025')
    expect(text).toContain('[1]')
    expect(text).toContain('[2]')
    expect(text.match(/https:\/\/example.test\/2025-report/g)).toHaveLength(1)
    expect(text).toContain('Resident Example')
    expect(text).not.toMatch(/undefined|\[insert|Your report:/)
  }
})
test('meaningful answer changes, not navigation or manual email, change the generation fingerprint', () => {
  const d = blankRequest(samplePlaces[0]), before = answerFingerprint(d)
  expect(answerFingerprint({ ...d, flowStep: 'review', stage: 2, body: 'Edited', subject: 'Edited subject' })).toBe(before)
  expect(answerFingerprint({ ...d, answers: { frequency: 'Constant' } })).not.toBe(before)
  expect(answerFingerprint({ ...d, residentName: 'Resident' })).not.toBe(before)
  expect(answerFingerprint({ ...d, recipientRoutes: ['adh'] })).not.toBe(before)
})
test('prior contact details and service followups appear only after the resident confirms relevance', () => {
  const d = { ...blankRequest(samplePlaces[0]), issue: 'advisory' as const }
  const view = render(<ResidentFollowups draft={d} es={false} edit={() => {}} />)
  expect(screen.queryByLabelText('Contact method (optional)')).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: 'No water' })).not.toBeInTheDocument()
  view.rerender(<ResidentFollowups draft={{ ...d, answers: { advisoryService: 'Yes', contacted: 'Yes' } }} es={false} edit={() => {}} />)
  expect(screen.getByRole('checkbox', { name: 'No water' })).toBeInTheDocument()
  expect(screen.getByLabelText('Contact method (optional)')).toBeInTheDocument()
})
test('unavailable catalog leaves manual entry available instead of claiming verified addresses', () => {
  render(<RequestLocations draft={blankRequest(samplePlaces[0])} places={[]} sample es={false} edit={() => {}} />)
  expect(screen.getByText('Search unavailable; add a location manually.')).toBeVisible()
  fireEvent.change(screen.getByRole('combobox', { name: 'Enter any affected location in Arkansas' }), { target: { value: 'My street' } })
  expect(screen.getByRole('button', { name: 'Add this location' })).toBeInTheDocument()
})
