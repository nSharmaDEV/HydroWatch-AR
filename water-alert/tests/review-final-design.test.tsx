import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, expect, test } from 'vitest'
import { GuidedHelp } from '../src/GuidedHelp'
import { blankRequest } from '../src/help-requests'
import { samplePlaces } from '../src/sample'

afterEach(cleanup)
for (const es of [false, true]) test(`review and address privacy are visible (${es ? 'es' : 'en'})`, () => {
  const place = samplePlaces[0]
  const draft = { ...blankRequest(place), flowStep: 'send' as const, subject: 'Subject', body: 'Message' }
  const props = { place, draft, language: es ? 'es' as const : 'en' as const, sample: true, deviceOnly: true, delivery: false, sending: false, saveFailed: false, heading: createRef<HTMLHeadingElement>(), extras: null, onHistory: () => {}, edit: () => {}, changeFacts: () => {}, go: () => {}, send: () => {}, regenerate: () => {} }
  const view = render(<GuidedHelp {...props} />)
  expect(screen.getByRole('heading', { level: 1, name: es ? 'Tu mensaje está listo' : 'Your message is ready' })).toBeVisible()
  const email = screen.getByRole('region', { name: es ? 'Tu correo' : 'Your email' })
  expect(within(email).getByRole('button', { name: es ? 'Copiar mensaje' : 'Copy message' })).toBeVisible()
  fireEvent.click(within(email).getByRole('button', { name: es ? 'Editar mensaje' : 'Edit message' }))
  expect(screen.getByRole('textbox', { name: es ? 'Mensaje' : 'Message' })).toHaveFocus()
  expect(screen.getByText(es ? 'Revisión · último paso' : 'Review · last step')).toBeVisible()
  expect(screen.getByRole('heading', { name: es ? 'Envíalo tú' : 'Send it yourself' })).toBeVisible()
  // Address privacy lives on the Where step; Review uses compact disclosures.
  expect(screen.queryByText(es ? /Las direcciones que escribes se envían/ : /Addresses you type are sent/)).toBeNull()
  expect(screen.queryByText(es ? /Continuar no envía nada/ : /Nothing is sent by continuing/)).toBeNull()
  // Contact provenance stays one tap away inside the recipient card, and the To row has no colon.
  const card = document.querySelector('.send-contact-card')
  expect(card).not.toBeNull()
  fireEvent.click(within(card as HTMLElement).getByRole('button', { name: es ? 'Información del contacto' : 'About this contact' }))
  expect(screen.getByRole('button', { name: es ? 'Fuentes de contacto' : 'Contact sources' })).toBeVisible()
  expect(screen.getByText(es ? 'Para' : 'To', { selector: '.request-email-header-label' })).toBeVisible()
  expect(screen.queryByText(es ? 'Para:' : 'To:', { selector: '.request-email-header-label' })).toBeNull()
  view.rerender(<GuidedHelp {...props} draft={{ ...draft, flowStep: 'details' }} />)
  expect(screen.getByText(es ? /Las direcciones que escribes se envían/ : /Addresses you type are sent/)).toBeVisible()
})
