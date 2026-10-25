import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { blankRequest, generateMessage } from '../src/help-requests'
import { generateReport } from '../src/help-outputs'
import { samplePlaces } from '../src/sample'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { categoryPatch, updateDraft } from '../src/help-draft'
import { saveRequest } from '../src/help-client'

afterEach(() => { cleanup(); localStorage.clear() })

test('resumed untouched email refreshes saved-record status rather than retaining current-record wording', async () => {
  const d = updateDraft({ ...blankRequest(samplePlaces[0]), facts: [{ id: 'saved', kind: 'active' as const, included: true, text: 'Agency notice dated October 20, 2026.', sources: [] }] }, { flowStep: 'review' }, 'en')
  expect(d.body).not.toContain('Its current status has not been verified.')
  await saveRequest(true, d, 0)
  render(<RequestWorkspace place={samplePlaces[0]} requestId={d.id} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  expect((await screen.findByLabelText<HTMLTextAreaElement>('Message')).value).toContain('Its current status has not been verified.')
})

test('selected requests and observations become complete connected prose in both languages', () => {
  const d = { ...blankRequest(samplePlaces[0]), issue: 'quality' as const, wording: { report: { first: 'An unusual color', second: 'An unusual smell', third: 'Particles in the water' }, response: { first: 'Investigate the reported concern', second: 'Clarify applicable water-use instructions' } }, answers: { frequency: 'Occasional' } }
  const text = generateMessage(d, 'en').body
  expect(text).toContain('I observed an unusual color, an unusual smell, and particles in the water.')
  expect(text).toContain('Please investigate the reported concern and clarify applicable water-use instructions.')
  expect(text).toContain('I observed this occasionally.')
  const spanish = generateMessage({ ...d, wording: { report: { first: 'Un color inusual', second: 'Un olor inusual' }, response: { first: 'Investigar la inquietud reportada' } } }, 'es').body
  expect(spanish).toContain('Observé un color inusual y un olor inusual.')
  expect(spanish).toContain('Por favor, investiguen la inquietud reportada.')
  expect(spanish).toContain('Lo observé ocasionalmente.')
  expect(spanish).not.toContain('Occasional')
})

test('category reset clears incompatible details but retains locations and optional identity', () => {
  const d = { ...blankRequest(samplePlaces[0]), issue: 'billing' as const, description: 'old charge', answers: { amount: '$9', began: '2026-10-01', contacted: 'Yes', contactResponse: 'old response' }, locations: ['Home', 'Work'], residentName: 'Resident' }
  const next = { ...d, ...categoryPatch(d, 'quality') }
  expect(next.answers).toEqual({})
  expect(next.description).toBe('')
  expect(next.locations).toEqual(['Home', 'Work'])
  expect(next.residentName).toBe('Resident')
  expect(next.recipientRoutes).toEqual(['adh'])
})

test('manual fields are protected independently; removed facts and files disappear from untouched outputs', () => {
  const fact = { id: 'a', kind: 'saved' as const, included: true, text: 'Saved evidence dated 2025.', sources: [{ recordId: 'a', label: 'Agency', url: 'https://example.test/evidence' }] }
  const file = { id: 'f', name: 'photo.png', type: 'image/png', data: 'data:image/png;base64,AA==' }
  let d = updateDraft({ ...blankRequest(samplePlaces[0]), facts: [fact], attachments: [file] }, { flowStep: 'review' }, 'en')
  expect(d.body).toContain(fact.text)
  d = updateDraft(d, { subject: 'My subject' }, 'en')
  d = updateDraft(d, { facts: [], attachments: [] }, 'en')
  expect(d.subject).toBe('My subject')
  for (const text of [d.body, generateReport(d, 'en')]) { expect(text).not.toContain(fact.text); expect(text).not.toContain(file.name); expect(text).not.toContain(fact.sources[0].url) }
  d = updateDraft(d, { body: '' }, 'en')
  expect(updateDraft(d, { description: 'new detail' }, 'en').body).toBe('')
  const legacy = { ...blankRequest(samplePlaces[0]), body: 'Saved manual message', subject: 'Saved subject' }
  expect(updateDraft(legacy, { description: 'new detail' }, 'en').body).toBe(legacy.body)
})

test('confirmed dates, locations, contact and requests agree in email and report without invented outcomes', () => {
  const d = { ...blankRequest(samplePlaces[0]), locations: ['123 Example St', '456 Sample St'], answers: { began: '2026-10-01', ongoing: 'No', ended: '2026-10-03', contacted: 'Yes', contactDate: '2026-10-02', contactMethod: 'Phone', contactResponse: 'They recorded my concern.', frequency: 'Constant' }, wording: { report: { first: 'No water' }, response: { first: 'Share an update' } } }
  for (const text of [generateMessage(d, 'en').body, generateReport(d, 'en')]) for (const confirmed of ['October 1, 2026', 'October 3, 2026', 'October 2, 2026', '123 Example St', '456 Sample St', 'They recorded my concern.', 'Please share an update.']) expect(text).toContain(confirmed)
  const empty = generateMessage(blankRequest(samplePlaces[0]), 'en').body
  expect(empty).not.toMatch(/Please|contacted|follow up|restored|investigat|safe to drink|ongoing/)
})

test('ADH request is addressed to the agency and does not ask it to restore supplier service', () => {
  const d = { ...blankRequest(samplePlaces[0]), recipientRoutes: ['adh' as const], wording: { report: { first: 'No water' }, response: { first: 'Restore service' } } }
  const text = generateMessage(d, 'en').body
  expect(text).toMatch(/^Hello Arkansas Department of Health,/)
  expect(text).toContain('Please advise on how to pursue restoration of service with the provider.')
  expect(text).not.toContain('Please restore service')
  expect(generateMessage({ ...d, recipientRoutes: ['provider', 'adh'] }, 'en').body).toMatch(/^Hello,\n/)
})

test('Spanish service observations are resident sentences rather than form fragments', () => {
  const d = { ...blankRequest(samplePlaces[0]), wording: { report: { first: 'No hay agua', second: 'Menos presión de lo habitual' }, response: { first: 'Restablecer el servicio', second: 'Compartir una actualización' } } }
  const text = generateMessage(d, 'es').body
  expect(text).toContain('No tengo agua.')
  expect(text).toContain('Tengo menos presión de lo habitual.')
  expect(text).toContain('Por favor, restablezcan el servicio y compartan una actualización.')
})

test('facts are supporting context, not a second first-person letter or email headings', () => {
  const d = { ...blankRequest(samplePlaces[0]), facts: [{ id: 'a', kind: 'saved' as const, included: true, text: 'Source-recorded notice dated October 20, 2026.', sources: [{ recordId: 'a', label: 'ADH', url: 'https://example.test/notice' }] }] }
  const text = generateMessage(d, 'en').body
  expect(text).not.toMatch(/Sources:|Your report|Relevant WAVE records/)
  expect(text).toContain('[1]')
  expect(text).toContain('https://example.test/notice')
  for (const output of [generateMessage({ ...d, facts: [] }, 'en').body, generateReport({ ...d, facts: [] }, 'en')]) expect(output).not.toContain('Source-recorded notice')
})

test('untouched email follows category, recipient and answer changes; manual edits survive', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample currentAdvisory language="en" onBack={() => {}} onHistory={() => {}} />)
  await screen.findByRole('button', { name: 'Current advisory' })
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  next(); next()
  fireEvent.click(screen.getByRole('checkbox', { name: 'My usual water use is affected' }))
  next(); fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Water-quality concern' }))
  next(); next()
  fireEvent.click(screen.getByRole('checkbox', { name: 'An unusual smell' }))
  next(); fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toContain('Water quality')
  expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain('Hello Arkansas Department of Health,')
  expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).not.toContain('My usual water use is affected')
  expect(screen.queryByRole('tab', { name: 'Report' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download report' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'My own wording.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.change(screen.getByLabelText('Additional wording (optional)'), { target: { value: 'Please provide an update.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  expect(screen.getByLabelText('Message')).toHaveValue('My own wording.')
  expect(screen.getByText('Your answers changed. Update the draft to include them.')).toBeVisible()
})
