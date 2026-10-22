import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'
import { en, es } from '../src/strings'
import { supplierArea, supplierIssued } from '../src/supplier-display'

const place = { id: 'ADH:one', name: 'Saved supplier', county: 'Benton', kind: 'system' as const }
const at = '2026-10-14T12:00:00Z'
const notice: Notice = { id: 'saved', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: 'Saved affected customers', reason: 'Saved reason', issued: 'Agency date as published', lifted: null, url: SOURCES.ADH }
const source: SourceSnapshot = { agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }
function card(s = source) { render(<StatusCard place={place} source={s} archive={[notice]} now={Date.parse(at) + 60000} t={en} onView={() => {}} />) }

it.each(['en', 'es'] as const)('orders provider information before history and service questions (%s)', language => {
  const t = language === 'en' ? en : es
  render(<StatusCard place={place} source={source} archive={[notice]} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
  const provider = screen.getByRole('button', { name: t.providerHelp })
  const history = screen.getByRole('button', { name: t.supplierAlertHistory })
  const service = screen.getByText(language === 'en' ? 'Service questions?' : '¿Preguntas del servicio?', { selector: 'h3' })
  expect(provider.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(history.compareDocumentPosition(service) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('shows active area and reason while keeping provider facts and technical activity separate', async () => {
  card()
  expect(screen.getByText(notice.area)).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: en.providerHelp }))
  expect(document.querySelector('.provider-info-content')).not.toHaveTextContent(notice.area)
  await userEvent.setup().click(screen.getByRole('button', { name: en.supplierAlertHistory }))
  const history = within(screen.getByRole('region', { name: en.supplierAlertHistory }))
  for (const text of [notice.area, notice.reason, notice.issued!]) expect(history.getByText(text)).toBeVisible()
  expect(screen.getByRole('link', { name: en.activeBoil })).toBeVisible()
  expect(screen.getByRole('link', { name: /Open ADH notice list/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Data-source activity' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Supplier details & tools' })).not.toBeInTheDocument()
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'About this supplier' })
  trigger.focus(); await user.keyboard('{Enter}')
  const popup = screen.getByRole('dialog', { name: /Supplier details/ })
  expect(within(popup).queryByText('Follow the official notice for instructions.')).toBeNull()
  expect(within(popup).getByRole('link', { name: 'View notice' })).toHaveAttribute('href', SOURCES.ADH)
  expect(popup.querySelector(`.supplier-popup-check time[datetime="${at}"]`)).toBeVisible()
  expect(screen.getByRole('link', { name: /View official source/ })).toHaveAttribute('href', SOURCES.ADH)
  expect(within(popup).queryByRole('button', { name: 'Data-source activity' })).toBeNull()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('compacts whole-system facts in the popup while preserving original wording in advisory history', async () => {
  const supplier = { ...place, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'BENTON' }
  const record = { ...notice, name: supplier.name, area: `${supplier.name} for the Entire System`, issued: '10/14/2026 3:12:14 PM' }
  render(<StatusCard place={supplier} source={{ ...source, records: [record] }} archive={[record]} now={Date.parse(at)} t={en} onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: en.providerHelp }))
  expect(screen.getByText('Benton County · Arkansas Department of Health')).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: en.supplierAlertHistory }))
  const history = within(screen.getByRole('region', { name: en.supplierAlertHistory }))
  for (const text of [record.area, record.issued]) expect(history.getByText(text)).toBeVisible()
  expect(screen.getByText(en.activeBoil)).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: 'About this supplier' }))
  const popup = within(screen.getByRole('dialog'))
  expect(popup.getByRole('heading', { name: 'Notice applies to: Entire system' })).toBeVisible()
  expect(popup.queryByText(en.supplierOriginal)).toBeNull()
})

it.each([
  ['Saved supplier for the Entire System', 'Entire system'],
  ['Entire System', 'Entire system'],
  ['Saved supplier for the Entire System except Creek Road', 'Saved supplier for the Entire System except Creek Road'],
  ['Other supplier for the Entire System', 'Other supplier for the Entire System'],
  ['Saved supplier for Creek Road and adjacent customers', 'Saved supplier for Creek Road and adjacent customers'],
])('only shortens an exactly equivalent whole-system area: %s', async (area, expected) => {
  expect(supplierArea(area, place, 'en')).toBe(expected)
})

it.each([
  ['10/14/2026 3:12:14 PM CDT', 'Oct 14, 2026 · 3:12 PM CDT'],
  ['12/14/2026 12:02:59 AM CST', 'Dec 14, 2026 · 12:02 AM CST'],
  ['2/30/2026 3:12:14 PM', '2/30/2026 3:12:14 PM'],
  ['Agency date as published', 'Agency date as published'],
])('formats explicit agency date fields without guessing or rewriting unsupported text: %s', async (issued, expected) => {
  expect(supplierIssued(issued, 'en')).toBe(expected)
})

it('keeps failed retrieval unavailable and labels saved notice facts historical rather than active', async () => {
  card({ ...source, error: 'Timeout' })
  await userEvent.setup().click(screen.getByRole('button', { name: en.supplierAlertHistory }))
  expect(screen.getByText(en.supplierUnavailable)).toBeVisible()
  expect(screen.getByText(en.unverified)).toBeVisible()
  expect(screen.getByText(notice.area)).toBeVisible()
  expect(screen.queryByText(en.active)).not.toBeInTheDocument()
})
