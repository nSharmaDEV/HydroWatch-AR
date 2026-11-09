import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { samplePlaces } from '../src/sample'
import { blankRequest, generateMessage, recipientRoutes, sendDestinations } from '../src/help-requests'
afterEach(() => { cleanup(); localStorage.clear() })
test('icon issue buttons, date controls and only explicitly confirmed editable wording', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Service interruption or low pressure' }))
  expect(screen.queryByRole('combobox', { name: 'Issue type' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1, name: 'What’s wrong?' })).toBeVisible()
  // Dates live on "When and where", not on "What’s wrong?".
  expect(screen.queryByLabelText('When did it begin? (optional)')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'No water' }))
  // Stock observations are confirmed as-is; only "Something else" is free wording.
  expect(screen.queryByRole('button', { name: 'Edit wording: No water' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('heading', { level: 1, name: 'When, Where, + Action' })).toBeVisible()
  // Dates are always visible; no collapsed disclosure.
  expect(document.querySelector('details.request-optional')).toBeNull()
  expect(screen.getByLabelText('When did it begin? (optional)')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('When did it end? (optional)')).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Is it ongoing? (optional)'), { target: { value: 'No' } })
  expect(screen.getByLabelText('When did it end? (optional)')).toBeEnabled()
  fireEvent.change(screen.getByLabelText('When did it begin? (optional)'), { target: { value: '2026-10-20' } })
  // The usual two requests start ticked; they are not free-edited.
  expect(screen.getByRole('checkbox', { name: 'Restore service' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Share an update' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Explain what is happening' })).not.toBeChecked()
  expect(screen.queryByRole('button', { name: 'Edit wording: Restore service' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Share an update' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Something else' }))
  fireEvent.change(screen.getByLabelText('Edit request: Something else'), { target: { value: 'Please restore service when possible' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Your details' })).toBeVisible()
  expect(screen.getByRole('button', { name: /Add a photo or document/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Write my email' }))
  const message = (await screen.findByLabelText<HTMLTextAreaElement>('Message')).value
   expect(message).not.toContain('Your report:')
  expect(message).toContain('I have no water')
  expect(message).toContain('October 20, 2026')
   expect(message).not.toContain('Requested response:')
  expect(message).toContain('Could you please:\n1. Restore service: investigate the reported service problem and advise on next steps toward restoration\n2. Please restore service when possible')
  expect(message).not.toContain('Share an update')
  expect(message).not.toContain('Lower pressure than usual')
  fireEvent.click(screen.getByText(/^To:/))
  expect(screen.getByRole('checkbox', { name: /Sample Creek Water/ })).toBeChecked()
  fireEvent.click(screen.getByRole('checkbox', { name: /Arkansas Department of Health/ }))
  expect(screen.queryByRole('button', { name: 'Continue to send' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Confirm and send' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
})
test('ADH-specific routing context is conditional and never invents a previous contact', () => {
  const d = { ...blankRequest(samplePlaces[0]), description: 'I observed unusual colour.' }
  expect(generateMessage(d, 'en').body).not.toContain('Division of Engineering')
  const body = generateMessage({ ...d, recipientRoutes: ['adh'] }, 'en').body
  expect(body).toMatch(/^Hello Arkansas Department of Health,/)
  expect(body).not.toContain('formally submitted ADH complaint')
  expect(body).not.toContain('I have already contacted')
})
test('recipient lists resolve only directory addresses, and sectioned messages never invent a requested response', () => {
  const d = { ...blankRequest(samplePlaces[0]), description: 'My own observation', recipientRoutes: ['provider', 'adh'] as const }
  expect(recipientRoutes({ ...d, recipientRoutes: [...d.recipientRoutes] })).toEqual(['provider', 'adh'])
  expect(sendDestinations({ ...d, recipientRoutes: [...d.recipientRoutes] })).toEqual([])
  const message = generateMessage({ ...d, recipientRoutes: [...d.recipientRoutes] }, 'en')
   expect(message.body).toContain('My own observation')
  expect(message.body).not.toMatch(/Could you please|Requested response:/)
  expect(message.subject).not.toMatch(/advisory/i)
})
test('distinct supporting facts share one numbered source URL without merging their text', () => {
  const source = { recordId: 'synthetic', url: 'https://example.test/source', label: 'Synthetic source' }
  const draft = { ...blankRequest(samplePlaces[0]), description: 'My experience', facts: ['First distinct fact', 'Second distinct fact'].map((text, i) => ({ id: String(i), text, kind: 'saved' as const, included: true, sources: [source] })) }
  const { body } = generateMessage(draft, 'en')
   expect(body).toMatch(/First distinct fact.*\[1\]/)
   expect(body).toMatch(/Second distinct fact.*\[2\]/)
  expect(body.split(source.url)).toHaveLength(2)
  expect(body).toContain('[1, 2] Synthetic source: https://example.test/source')
})
