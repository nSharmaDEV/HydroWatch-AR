import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { StatusCard } from '../src/components'
import { NoticeDetail } from '../src/NoticeDetail'
import { en, es } from '../src/strings'
import { PLACE_CATALOG } from '../src/place-catalog'
import type { Place } from '../src/domain'

const leisure: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const now = Date.parse('2026-10-14T20:00:00Z')
function card(place = leisure, sample = false, language: 'en' | 'es' = 'en') {
  render(<StatusCard place={place} now={now} t={language === 'en' ? en : es} language={language} sample={sample} onView={() => {}} />)
}

// Removing the contact section or changing a destination must fail these tests.
it('offers verified Leisure Hills call and email directly on an unavailable supplier card', async () => {
  card()
  const contact = within(screen.getByRole('region', { name: 'Contact water provider' }))
  expect(contact.getByRole('link', { name: /Call.*479.*549-2158/ })).toHaveAttribute('href', 'tel:+14795492158')
  expect(contact.getByRole('link', { name: 'Email provider' })).toHaveAttribute('href', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
  await userEvent.setup().click(contact.getByText('Contact source: ADH directory', { selector: 'summary' }))
  expect(contact.getByRole('link', { name: /Contact source/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
  expect(contact.getByText(/2026-10-14/)).toBeVisible()
  expect(contact.getByText(/Opens your phone or email app/)).toBeVisible()
})

it('does not guess contacts from a similar name or shared county', () => {
  card({ ...leisure, id: 'ADH:unknown' })
  expect(screen.getByText(/Contact details have not been verified/)).toBeVisible()
  expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
  expect(screen.getByText(/water bill or contact park management/)).toBeVisible()
})

it('does not direct sample users to a real provider', () => {
  card(leisure, true)
  expect(screen.queryByRole('region', { name: 'Contact water provider' })).not.toBeInTheDocument()
  expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
})

it('does not add water-provider contacts to lake cards', () => {
  card({ ...leisure, kind: 'lake' })
  expect(screen.queryByRole('region', { name: 'Contact water provider' })).not.toBeInTheDocument()
})

it('localizes the contact section in Spanish', () => {
  card(leisure, false, 'es')
  const contact = within(screen.getByRole('region', { name: 'Contactar al proveedor de agua' }))
  expect(contact.getByRole('link', { name: /Llamar/ })).toHaveAttribute('href', 'tel:+14795492158')
  expect(contact.getByRole('link', { name: 'Enviar correo al proveedor' })).toHaveAttribute('href', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
})

it.each([
  ['FAYETTEVILLE WATERWORKS', 'tel:+14795758386'],
  ['SPRINGDALE WATER UTILITIES', 'tel:+14797515751'],
  ['ROGERS WATER UTILITIES', 'tel:+14796211142'],
  ['BENTONVILLE WATER UTILITIES', 'tel:+14792713140'],
])('provides the directory phone for %s without invented email', (name, phone) => {
  card(PLACE_CATALOG.find(entry => entry.place.name === name)!.place)
  expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', phone)
  if (name === 'ROGERS WATER UTILITIES') expect(screen.getByRole('link', { name: 'Email provider' })).toHaveAttribute('href', 'mailto:WATER@RWU.ORG')
  else expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
})

it('keeps the same contact actions on the notice detail page', () => {
  render(<NoticeDetail place={leisure} now={now} t={en} language="en" onBack={() => {}} onShare={() => {}} onAlerts={() => {}} />)
  expect(screen.getByRole('link', { name: /Call.*479/ })).toHaveAttribute('href', 'tel:+14795492158')
})
