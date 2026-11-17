import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { GuidedHelp } from '../src/GuidedHelp'
import { blankRequest } from '../src/help-requests'
import { PLACE_CATALOG } from '../src/place-catalog'

afterEach(cleanup)
for (const es of [false, true]) test(`Review icon actions and mutually exclusive info popovers (${es ? 'es' : 'en'})`, () => {
  const place = PLACE_CATALOG.find(p => p.place.name === 'BENTONVILLE WATER UTILITIES')!.place
  const draft = { ...blankRequest(place), issue: 'service' as const, description: 'Low pressure', flowStep: 'send' as const, subject: 'Pressure', body: 'Please check my pressure.' }
  const edit = vi.fn()
  render(<GuidedHelp draft={draft} place={place} language={es ? 'es' : 'en'} sample={false} deviceOnly delivery={false} sending={false} saveFailed={false} heading={createRef()} extras={null} onHistory={() => {}} edit={edit} changeFacts={() => {}} go={() => {}} send={() => {}} regenerate={() => {}} />)
  const toolbar = document.querySelector('.request-email-toolbar') as HTMLElement
  const labels = es ? ['Copiar mensaje', 'Editar mensaje', 'Abrir en mi app de correo'] : ['Copy message', 'Edit message', 'Open in my email app']
  labels.forEach(label => {
    const control = within(toolbar).getByLabelText(label)
    expect(control).toHaveAttribute('title', label)
    expect(control.textContent).toBe('')
  })
  expect(within(toolbar).getByRole('link', { name: labels[2] })).toHaveAttribute('href', expect.stringContaining('mailto:'))
  // 2026-11-12: the next-office ("Another option") card and its Call ADH action left Review.
  expect(screen.queryByLabelText(es ? 'Llamar a ADH' : 'Call ADH')).toBeNull()
  expect(screen.queryByRole('button', { name: es ? 'Información de la otra opción' : 'About the other option' })).toBeNull()
  for (const label of es ? ['Copiar correo', 'Llamar al proveedor'] : ['Copy email', 'Call supplier']) {
    const control = screen.getByLabelText(label)
    expect(control.textContent).toBe('')
    expect(control).toHaveAttribute('title', label)
  }
  fireEvent.click(within(toolbar).getByLabelText(labels[1]))
  expect(screen.getByRole('textbox', { name: es ? 'Mensaje' : 'Message' })).toHaveFocus()
  expect(screen.queryByText(es ? 'Después de contactarlos' : 'After you contact them')).toBeNull()
  const supplier = screen.getByRole('button', { name: es ? 'Información del contacto' : 'About this contact' })
  const agency = screen.getByRole('button', { name: es ? 'Fuentes citadas' : 'Cited sources' })
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(supplier)
  expect(supplier).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('dialog')).toHaveTextContent(es ? 'Contacto general' : 'General utility contact')
  expect(screen.getByRole('button', { name: es ? 'Fuentes de contacto' : 'Contact sources' })).toBeVisible()
  fireEvent.click(agency)
  expect(supplier).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(agency).toHaveFocus()
  fireEvent.click(supplier)
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('dialog')).toBeNull()
  const log = screen.getByRole('button', { name: es ? 'Registrar un intento de contacto' : 'Log a contact attempt' })
  expect(log.closest('.request-footer')).not.toBeNull()
  fireEvent.click(log)
  expect(screen.getByLabelText(es ? 'Fecha de contacto' : 'Contact date')).toBeVisible()
  expect(edit).not.toHaveBeenCalled()
})
