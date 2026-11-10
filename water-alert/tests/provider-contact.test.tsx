import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { StatusCard } from '../src/components'
import { NoticeDetail } from '../src/NoticeDetail'
import { en, es } from '../src/strings'
import { PLACE_CATALOG } from '../src/place-catalog'
import type { Place } from '../src/domain'
import { ADH_ENGINEERING_SOURCE } from '../src/recovery-resources'

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
  expect(contact.getByRole('link', { name: /Email provider: LEISUREHILLSWATERCO@GMAIL.COM/ })).toHaveAttribute('href', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
  expect(contact.queryByText(/No verified email address is available/i)).not.toBeInTheDocument()
  const directory = contact.getByRole('link', { name: /ADH directory contact/ })
  expect(directory).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
  expect(directory).toHaveAttribute('title', expect.stringContaining('2026-10-14'))
  expect(contact.getByRole('link', { name: /Call.*479.*549-2158/ })).toHaveTextContent(/^Call$/)
  expect(contact.getByRole('link', { name: /Email provider:/ })).toHaveTextContent(/^Email$/)
  expect(directory.closest('.contact-bar')?.querySelector('.contact-leader')).toHaveAttribute('aria-hidden', 'true')
  expect(document.querySelector('.contact-provenance')).toBeNull()
})

it.each(['en', 'es'] as const)('uses only the ADH fallback, not guessed similar-name or county contacts (%s)', language => {
  card({ ...leisure, id: 'ADH:unknown' }, false, language)
  expect(screen.getByRole('link', { name: language === 'en' ? 'Contact ADH' : 'Contactar a ADH' })).toHaveAttribute('href', ADH_ENGINEERING_SOURCE)
  expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
  expect(document.querySelector('.provider-contact-actions')).toBeNull()
  expect(screen.queryByRole('link', { name: /ADH directory contact|Contacto del directorio ADH/ })).not.toBeInTheDocument()
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
  expect(contact.getByRole('link', { name: /Enviar correo al proveedor: LEISUREHILLSWATERCO@GMAIL.COM/ })).toHaveAttribute('href', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
})

// Restoring a website-wide no-messages claim must fail: opt-in push is separate.
it.each([
  ['en', 'Contact water provider', 'This website does not automatically call or email your provider.'],
  ['es', 'Contactar al proveedor de agua', 'Este sitio no llama ni envía correos automáticamente a su proveedor.'],
] as const)('limits the %s no-send disclaimer to provider contact actions', async (language, title, disclaimer) => {
  card(leisure, false, language)
  expect(screen.getByRole('region', { name: title })).toBeVisible()
  expect(document.querySelector('.provider-contact-actions')).toHaveAttribute('title', expect.stringContaining(disclaimer))
  expect(screen.queryByText(/This website does not send messages\.|Este sitio no envía mensajes\./)).not.toBeInTheDocument()
})

it.each([
  ['FAYETTEVILLE WATERWORKS', 'tel:+14795758386'],
  ['SPRINGDALE WATER UTILITIES', 'tel:+14797515751'],
  ['ROGERS WATER UTILITIES', 'tel:+14796211142'],
  ['BENTONVILLE WATER UTILITIES', 'tel:+14792713140'],
])('provides the directory phone for %s and only a sourced email', (name, phone) => {
  card(PLACE_CATALOG.find(entry => entry.place.name === name)!.place)
  expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', phone)
  const listed: Record<string, string> = { 'ROGERS WATER UTILITIES': 'WATER@RWU.ORG', 'BENTONVILLE WATER UTILITIES': 'pnewbill@bentonvillear.com', 'FAYETTEVILLE WATERWORKS': 'tnyander@fayetteville-ar.gov' }
  if (listed[name]) {
    expect(screen.getByRole('link', { name: new RegExp(`Email provider: ${listed[name]}`) })).toHaveAttribute('href', `mailto:${listed[name]}`)
    // The ADH page misspells Fayetteville's domain; WAVE uses the EPA record and says so.
    if (name === 'FAYETTEVILLE WATERWORKS') expect(screen.getByRole('link', { name: 'Email source: EPA' })).toHaveAttribute('href', 'https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/AR0000569/JSON')
    else expect(screen.queryByText('Email source: EPA')).toBeNull()
  } else {
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.queryByText(/No verified email address is available/i)).not.toBeInTheDocument()
  }
})

it.each([
  ['en', 'Email source: EPA', 'Checked'],
  ['es', 'Fuente del correo: EPA', 'Verificado'],
] as const)('groups contact sources without a visible check date (%s)', (language, label, checked) => {
  card(leisure, false, language)
  const link = screen.getByRole('link', { name: label })
  expect(link).toHaveAttribute('href', expect.stringContaining('https://data.epa.gov/'))
  expect(link).toHaveAttribute('title', `${checked}: 2026-11-08`)
  const sources = link.closest('.contact-sources')!
  expect(within(sources as HTMLElement).getByRole('link', { name: /ADH/ })).toBeInTheDocument()
  expect(sources).not.toHaveTextContent('2026-11-08')
})

it('keeps the same contact actions on the notice detail page', () => {
  render(<NoticeDetail place={leisure} now={now} t={en} language="en" onBack={() => {}} onShare={() => {}} onAlerts={() => {}} />)
  expect(screen.getByRole('link', { name: /Call.*479/ })).toHaveAttribute('href', 'tel:+14795492158')
})
