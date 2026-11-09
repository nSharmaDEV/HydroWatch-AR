import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { blankRequest } from '../src/help-requests'
import { helpPath, helpStep } from '../src/help-flow'
import { samplePlaces } from '../src/sample'
import { RequestWorkspace } from '../src/RequestWorkspace'
afterEach(() => { cleanup(); localStorage.clear() })

test('Help is four screens and older drafts open on the screen holding their answers', () => {
  const d = blankRequest(samplePlaces[0])
  expect(helpPath(d)).toEqual(['choose', 'details', 'response', 'send'])
  expect(helpStep({ ...d, flowStep: 'experience' })).toBe('choose')
  for (const old of ['billing', 'timing', 'where'] as const) expect(helpStep({ ...d, flowStep: old })).toBe('details')
  expect(helpStep({ ...d, flowStep: 'response' })).toBe('response')
  for (const old of ['review', 'confirm', 'records'] as const) expect(helpStep({ ...d, flowStep: old })).toBe('send')
})

test('a billing complaint takes four screens and the email carries every answer', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Bill or charge' }))
  expect(screen.getByText('Step 1 of 4 · What’s wrong?')).toBeVisible()
  const next = () => screen.getByRole('button', { name: /^(Continue|Write my email)$/ })
  expect(next()).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'A charge appears more than once' }))
  expect(screen.getByLabelText('Anything else? (optional)')).toBeVisible()
  fireEvent.click(next())

  expect(screen.getByText('Step 2 of 4 · When and where')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Address where this happened'), { target: { value: '1908 SW Huntwick Ave' } })
  fireEvent.change(screen.getByLabelText('Account number (optional)'), { target: { value: '4421-07' } })
  fireEvent.change(screen.getByLabelText('Which bill? (optional)'), { target: { value: 'October 2026' } })
  fireEvent.click(next())
  expect(screen.getByText('Step 3 of 4 · What should they do?')).toBeVisible()
  // The usual requests start ticked; the resident can untick them.
  expect(screen.getByRole('checkbox', { name: 'Review the charge' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Explain the bill' })).toBeChecked()
  fireEvent.change(screen.getByLabelText('What have you already tried? (optional)'), { target: { value: 'I called once.' } })
  fireEvent.change(screen.getByLabelText('Your name (optional)'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('How can they reach you? (optional)'), { target: { value: 'ana@example.test' } })
  fireEvent.click(screen.getByRole('button', { name: 'Write my email' }))

  expect(screen.getByText('Step 4 of 4 · Send it')).toBeVisible()
  const body = (screen.getByLabelText('Message') as HTMLTextAreaElement).value
  for (const text of ['1908 SW Huntwick Ave', 'account number 4421-07', 'October 2026', 'A charge appears more than once on my bill.', '1. Review the charge', '2. Explain the bill', 'I called once.', 'within 5 business days', 'ana@example.test', 'Ana']) expect(body).toContain(text)
  const send = screen.getByRole('region', { name: 'How to send it' })
  expect(within(send).getAllByText('Sample — sending disabled.').length).toBeGreaterThan(0)
  expect(document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]')).toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Copy email' })).toHaveClass('secondary')
})

test('Spanish uses the same four screens', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="es" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Factura o cargo' }))
  expect(screen.getByText('Paso 1 de 4 · ¿Qué pasa?')).toBeVisible()
  fireEvent.change(screen.getByLabelText('¿Algo más? (opcional)'), { target: { value: 'Me cobraron dos veces.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText('Paso 2 de 4 · Cuándo y dónde')).toBeVisible()
  expect(screen.getByLabelText('Dirección donde pasó')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText('Paso 3 de 4 · ¿Qué deben hacer?')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Escribir mi correo' }))
  expect(screen.getByText('Paso 4 de 4 · Envíalo')).toBeVisible()
  expect((screen.getByLabelText('Mensaje') as HTMLTextAreaElement).value).toContain('Me cobraron dos veces.')
})
