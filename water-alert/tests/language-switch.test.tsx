import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { blankRequest, generateMessage } from '../src/help-requests'
import { saveRequest, sampleRequests } from '../src/help-client'
import { samplePlaces } from '../src/sample'
import { localizeDraft } from '../src/help-draft'

test.each(['subject', 'body'] as const)('a manual %s does not prevent the other generated field following language', field => {
  const initial = { ...blankRequest(samplePlaces[0]), description: 'Resident prose', subject: 'Resident subject', body: 'Resident body', subjectEdited: field === 'subject', bodyEdited: field === 'body', generatedFrom: 'old-confirmed-answers' }
  const next = localizeDraft(initial, 'es'), generated = generateMessage(initial, 'es')
  expect(next[field]).toBe(initial[field])
  const other = field === 'subject' ? 'body' : 'subject'
  expect(next[other]).toBe(generated[other])
  expect(next.generatedFrom).toBe(initial.generatedFrom)
})

test('legacy email and exact agency evidence are not treated as translatable resident prose', () => {
  const initial = { ...blankRequest(samplePlaces[0]), subject: 'Legacy subject', body: 'Legacy body', context: 'Exact published agency wording — 2025', sources: [{ recordId: 'one', label: '2025 historical report', url: 'https://example.test/2025' }] }
  expect(localizeDraft(initial, 'es')).toBe(initial)
  const generated = localizeDraft({ ...initial, subjectEdited: false, bodyEdited: false }, 'es')
  expect(generated.body).toContain(initial.context)
  expect(generated.sources).toEqual(initial.sources)
})

test.each(['en', 'es'] as const)('switching from %s updates untouched templates without losing resident answers', async from => {
  const to = from === 'en' ? 'es' : 'en'
  const draft = { ...blankRequest(samplePlaces[0]), issue: 'service' as const, stage: 2 as const, flowStep: 'review' as const, description: 'My exact resident wording', answers: { began: '2026-10-20', ongoing: 'Yes' }, locations: ['My location'], attachments: [{ id: 'one', name: 'evidence.txt', type: 'text/plain', data: 'YWJj' }], subjectEdited: false, bodyEdited: false }
  const initial = { ...draft, ...generateMessage(draft, from) }
  await saveRequest(true, initial, 0)
  const props = { place: samplePlaces[0], sample: true, onBack: () => {}, onHistory: () => {} }
  const view = render(<RequestWorkspace {...props} language={from} />)
  await screen.findByLabelText(from === 'en' ? 'Message' : 'Mensaje')
  view.rerender(<RequestWorkspace {...props} language={to} />)
  await waitFor(() => expect(screen.getByLabelText(to === 'en' ? 'Message' : 'Mensaje')).toHaveValue(generateMessage(initial, to).body))
  expect(screen.getByLabelText(to === 'en' ? 'Subject' : 'Asunto')).toHaveValue(generateMessage(initial, to).subject)
  expect(screen.getByLabelText<HTMLTextAreaElement>(to === 'en' ? 'Message' : 'Mensaje').value).toContain('My exact resident wording')
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(to === 'en' ? 'Saved on this device' : 'Guardado en este dispositivo'), { timeout: 3000 })
  const saved = sampleRequests()[0].draft
  expect(saved.answers).toEqual(draft.answers); expect(saved.locations).toEqual(draft.locations); expect(saved.attachments).toEqual(draft.attachments)
})

test('language switching preserves manual subject/message and unsaved experience input', async () => {
  const draft = { ...blankRequest(samplePlaces[0]), stage: 2 as const, flowStep: 'review' as const, description: 'Original experience', subject: 'My manual subject', body: 'My manual message', subjectEdited: true, bodyEdited: true }
  await saveRequest(true, draft, 0)
  const props = { place: samplePlaces[0], sample: true, onBack: () => {}, onHistory: () => {} }
  const view = render(<RequestWorkspace {...props} language="en" />)
  await screen.findByLabelText('Message')
  view.rerender(<RequestWorkspace {...props} language="es" />)
  expect(screen.getByLabelText('Mensaje')).toHaveValue('My manual message')
  expect(screen.getByLabelText('Asunto')).toHaveValue('My manual subject')
  expect(screen.getByText('Paso 4 de 4 · Revisar y enviar')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
  expect(screen.getByText('Paso 3 de 4 · Tus datos')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1, name: 'Tus datos' })).toBeVisible()
  for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
  expect(screen.getByText('Paso 1 de 4 · ¿Qué pasa?')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1, name: '¿Qué pasa?' })).toBeVisible()
  expect(screen.getByLabelText('¿Algo más? (opcional)')).toHaveValue('Original experience')
  fireEvent.change(screen.getByLabelText('¿Algo más? (opcional)'), { target: { value: 'Fresh unsaved resident wording' } })
  view.rerender(<RequestWorkspace {...props} language="en" />)
  expect(screen.getByLabelText('Anything else? (optional)')).toHaveValue('Fresh unsaved resident wording')
  expect(screen.getByText('Step 1 of 4 · What’s wrong?')).toBeVisible()
})
