import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { blankRequest } from '../src/help-requests'
import * as client from '../src/help-client'
import { samplePlaces } from '../src/sample'
import { exportedText } from '../src/help-exports'

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
afterEach(() => {
  cleanup(); vi.restoreAllMocks()
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

test('live export text is not relabeled or rewritten', () => {
  for (const language of ['en', 'es'] as const) expect(exportedText('Resident text\n2025 source wording', language, false)).toBe('Resident text\n2025 source wording')
})

test.each(['en', 'es'] as const)('unsaved sample fallback also exports a durable label (%s)', async language => {
  const draft = { ...blankRequest(samplePlaces[0]), description: 'Synthetic observation', body: 'My unsaved text' }
  await client.saveRequest(true, draft, 0)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Synthetic storage failure') })
  const download = vi.spyOn(client, 'downloadText').mockImplementation(() => {})
  render(<RequestWorkspace place={samplePlaces[0]} language={language} sample onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: language === 'en' ? 'Download unsaved text' : 'Descargar texto sin guardar' }))
  expect(download.mock.calls[0][0]).toBe('sample-unsaved-water-request.txt')
  expect(download.mock.calls[0][1]).toContain(language === 'en' ? 'SAMPLE — FICTIONAL' : 'EJEMPLO — FICTICIO')
  expect(download.mock.calls[0][1]).toContain('My unsaved text')
})

test.each(['en', 'es'] as const)('sample copy and both downloads stay labeled after manual edits and resume (%s)', async language => {
  const draft = { ...blankRequest(samplePlaces[0]), stage: 2 as const, flowStep: 'review' as const, description: 'Synthetic observation', subject: 'My subject', body: 'My manual text', subjectEdited: true, bodyEdited: true }
  await client.saveRequest(true, draft, 0)
  const copied: string[] = []
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copied.push(text) } } })
  const download = vi.spyOn(client, 'downloadText').mockImplementation(() => {})
  render(<RequestWorkspace place={samplePlaces[0]} language={language} sample onBack={() => {}} onHistory={() => {}} />)
  expect(await screen.findByLabelText(language === 'en' ? 'Message' : 'Mensaje')).toHaveValue('My manual text')
  const label = language === 'en' ? 'SAMPLE — FICTIONAL' : 'EJEMPLO — FICTICIO'
  // A legacy "review" draft resumes on Send it, which holds the email tools and the send options together.
  expect(screen.getByText(language === 'en' ? 'Step 4 of 4 · Review and send' : 'Paso 4 de 4 · Revisar y enviar')).toBeVisible()
  fireEvent.click(screen.getByText(language === 'en' ? 'Downloads and tools' : 'Descargas y herramientas'))
  fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Download email' : 'Descargar correo' }))
  fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Download report' : 'Descargar reporte' }))
  expect(download.mock.calls.map(([name]) => name)).toEqual(['sample-water-email.txt', 'sample-water-report.txt'])
  for (const [, text] of download.mock.calls) expect(text).toContain(label)
  expect(download.mock.calls[0][1]).toContain('My manual text')
  expect(screen.queryByRole('button', { name: /Send message|Enviar mensaje/ })).not.toBeInTheDocument()
  // Copy is the sample bottom action on "Send it", styled secondary because nothing is sent.
  const copy = screen.getByRole('button', { name: language === 'en' ? 'Copy email' : 'Copiar correo' })
  expect(copy).toHaveClass('secondary')
  expect(screen.getAllByText(language === 'en' ? 'Sample — sending disabled.' : 'Ejemplo — envío desactivado.').length).toBeGreaterThan(0)
  fireEvent.click(copy)
  await waitFor(() => expect(copied).toHaveLength(1))
  expect(copied[0]).toContain(label)
  expect(copied[0]).toContain('My subject\n\nMy manual text')
  expect(screen.queryByRole('button', { name: /Send message|Enviar mensaje/ })).not.toBeInTheDocument()
  expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Back' : 'Atrás' }))
  fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Write my email' : 'Escribir mi correo' }))
  expect(screen.getByLabelText(language === 'en' ? 'Message' : 'Mensaje')).toHaveValue('My manual text')
})
