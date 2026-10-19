import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { SupplierProfile } from '../src/SupplierProfile'
import { SOURCES, type Notice, type Place } from '../src/domain'
import { en, es } from '../src/strings'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const at = '2026-10-19T12:00:00Z'
const notice: Notice = { id: 'synthetic', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: 'Benton', area: 'Entire system', reason: 'Synthetic loss of pressure', issued: '10/12/2026', lifted: null, url: SOURCES.ADH, firstObservedAt: at, lastObservedAt: at }
function card(language: 'en' | 'es' = 'en', archive: Notice[] = []) {
  render(<StatusCard place={place} archive={archive} now={Date.parse(at)} t={language === 'en' ? en : es} language={language} onView={() => {}} />)
}

// Contact content must start collapsed without losing verified destinations.
it.each(['en', 'es'] as const)('keeps %s contact details behind its own title', async language => {
   card(language)
   const disclosure = document.querySelector('.supplier-contact-section') as HTMLDetailsElement
   expect(disclosure).not.toBeNull()
   expect(disclosure.open).toBe(false)
   await userEvent.setup().click(disclosure.querySelector('summary')!)
  const contact = within(screen.getByRole('region', { name: language === 'en' ? 'Contact water provider' : 'Contactar al proveedor de agua' }))
  expect(contact.getByRole('link', { name: language === 'en' ? /ADH directory contact/ : /Contacto del directorio ADH/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
  expect(document.querySelector('.contact-provenance')).toBeNull()
  expect(contact.getByRole('link', { name: /479/ })).toHaveAttribute('href', 'tel:+14795492158')
})

// Header clutter or nesting links in the toggle must fail.
it.each(['en', 'es'] as const)('keeps %s provider sources inside the six-fact disclosure', async language => {
  card(language)
  const toggle = screen.getByRole('button', { name: language === 'en' ? 'Provider information' : 'Información del proveedor' })
  const header = toggle.closest('.provider-info-header')!
   expect(within(header as HTMLElement).queryAllByRole('link')).toHaveLength(0)
  expect(toggle.querySelector('a')).toBeNull()
   expect(toggle).toHaveAttribute('aria-expanded', 'false')
   expect(toggle.querySelector('.disclosure-icon')).not.toBeNull()
  await userEvent.setup().click(toggle)
  const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!
  expect(panel).toBeVisible()
  expect(within(panel).queryByRole('link', { name: /ADH profile|Perfil de ADH/ })).toBeNull()
  expect(within(panel).getByRole('link', { name: language === 'en' ? /Annual water-quality reports/ : /Informes anuales/ })).toBeVisible()
  expect(panel.querySelectorAll('.profile-facts>div')).toHaveLength(6)
  expect(within(panel).getByText('WELL #1')).toHaveAttribute('lang', 'en')
  expect(panel).toHaveTextContent(language === 'en' ? 'Not live readings' : 'No son mediciones en vivo')
  await userEvent.setup().click(toggle)
  expect(panel).not.toBeVisible()
   expect(within(panel).getAllByRole('link', { hidden: true })[0]).not.toBeVisible()
 })

it.each(['en', 'es'] as const)('uses a short %s guide action inside its separate help section', async language => {
  let opened = false
  render(<StatusCard place={place} now={Date.parse(at)} language={language} t={language === 'en' ? en : es} onView={() => {}} onHelp={() => { opened = true }} />)
  const help = document.querySelector('.supplier-help-section') as HTMLDetailsElement
  expect(help).not.toBeNull()
  expect(help.open).toBe(false)
  expect(screen.queryByText('More details')).toBeNull()
  expect(screen.getByText(language === 'en' ? en.uncheckedStatus : es.uncheckedStatus)).toBeVisible()
  await userEvent.setup().click(help.querySelector('summary')!)
  await userEvent.setup().click(within(help).getByRole('button', { name: language === 'en' ? 'Open guide' : 'Abrir guía' }))
  expect(opened).toBe(true)
})

it('retains directory provenance on the standalone supplier profile', () => {
  render(<SupplierProfile place={place} language="en" sample={false} />)
  expect(screen.getByRole('link', { name: /ADH profile/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
})

// Observation timestamps must not outrank agency issue dates; unknown dates sort last.
it('shows five distinct notices newest-issued first, with a source icon and no nested detail clutter', async () => {
  const records = [null, '2026-01-01', '2/18/2026', '4/3/2026', '6/11/2026', '8/20/2026', '10/12/2026'].map((issued, i) => ({ ...notice, id: `n${i}`, issued, reason: `Synthetic reason ${i}` }))
  card('en', [...records, records[6]])
  await userEvent.setup().click(screen.getByRole('button', { name: 'Advisory history' }))
  let rows = document.querySelectorAll('.supplier-alert-notice')
  expect(rows).toHaveLength(5)
  expect(rows[0]).toHaveTextContent('Synthetic reason 6')
  expect(within(rows[0] as HTMLElement).getByRole('heading', { name: 'Boil-water notice' })).toBeVisible()
  expect(within(rows[0] as HTMLElement).getByRole('link', { name: /Open ADH notice list/ })).toHaveAttribute('href', SOURCES.ADH)
  expect(rows[0].querySelector('details')).toBeNull()
  expect(rows[0].querySelector('.alert-status')).toHaveTextContent('Status: Unconfirmed')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Show more advisories' }))
  rows = document.querySelectorAll('.supplier-alert-notice')
  expect(rows).toHaveLength(7)
  expect(rows[6]).toHaveTextContent('Not provided by ADH')
})
