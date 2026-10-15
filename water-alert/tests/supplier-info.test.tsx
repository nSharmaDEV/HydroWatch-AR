import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'
import { en } from '../src/strings'

const place = { id: 'ADH:one', name: 'Saved supplier', county: 'Benton', kind: 'system' as const }
const at = '2026-10-14T12:00:00Z'
const notice: Notice = { id: 'saved', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: 'Saved affected customers', reason: 'Saved reason', issued: 'Agency date as published', lifted: null, url: SOURCES.ADH }
const source: SourceSnapshot = { agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }
function card(s = source) { render(<StatusCard place={place} source={s} archive={[notice]} now={Date.parse(at) + 60000} t={en} onView={() => {}} />) }

it('keeps actual notice facts on the card and moves instructions, retrieval times and technical activity into supplier info', async () => {
  card()
  for (const text of [notice.area, notice.reason, notice.issued!, 'Active']) expect(screen.getByText(text)).toBeVisible()
  expect(screen.queryByRole('link', { name: /Read official notice/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Data-source activity' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Supplier details/ })).not.toBeInTheDocument()
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'About this supplier' })
  trigger.focus(); await user.keyboard('{Enter}')
  const popup = screen.getByRole('dialog', { name: /Supplier details/ })
  expect(within(popup).getByText('Follow the official notice for instructions.')).toBeVisible()
  expect(within(popup).getByRole('link', { name: /Read official notice/ })).toHaveAttribute('href', SOURCES.ADH)
  expect(popup.querySelector(`time[datetime="${at}"]`)).toBeVisible()
  expect(within(popup).getByRole('button', { name: 'Data-source activity' })).toHaveAttribute('aria-expanded', 'false')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('compacts exact whole-system facts and preserves the full published wording in the info popup', async () => {
  const supplier = { ...place, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'BENTON' }
  const record = { ...notice, name: supplier.name, area: `${supplier.name} for the Entire System`, issued: '10/14/2026 3:12:14 PM' }
  render(<StatusCard place={supplier} source={{ ...source, records: [record] }} now={Date.parse(at)} t={en} onView={() => {}} />)
  expect(screen.getByText('Benton County · Arkansas Department of Health')).toBeVisible()
  for (const text of ['Affected area', 'Reason', 'Issued', 'Entire system', 'Oct 14, 2026 · 3:12 PM', 'Active']) expect(screen.getByText(text)).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: 'About this supplier' }))
  const popup = within(screen.getByRole('dialog'))
  expect(popup.getByText(record.area)).toBeVisible()
  expect(popup.getByText(record.issued)).toBeVisible()
})

it.each([
  ['Saved supplier for the Entire System', 'Entire system'],
  ['Entire System', 'Entire system'],
  ['Saved supplier for the Entire System except Creek Road', 'Saved supplier for the Entire System except Creek Road'],
  ['Other supplier for the Entire System', 'Other supplier for the Entire System'],
  ['Saved supplier for Creek Road and adjacent customers', 'Saved supplier for Creek Road and adjacent customers'],
])('only shortens an exactly equivalent whole-system area: %s', (area, expected) => {
  card({ ...source, records: [{ ...notice, area }] })
  expect(screen.getByText(expected)).toBeVisible()
})

it.each([
  ['10/14/2026 3:12:14 PM CDT', 'Oct 14, 2026 · 3:12 PM CDT'],
  ['12/14/2026 12:02:59 AM CST', 'Dec 14, 2026 · 12:02 AM CST'],
  ['2/30/2026 3:12:14 PM', '2/30/2026 3:12:14 PM'],
  ['Agency date as published', 'Agency date as published'],
])('formats explicit agency date fields without guessing or rewriting unsupported text: %s', (issued, expected) => {
  card({ ...source, records: [{ ...notice, issued }] })
  expect(screen.getByText(expected)).toBeVisible()
})

it('keeps failed retrieval unavailable and labels saved notice facts historical rather than active', () => {
  card({ ...source, error: 'Timeout' })
  expect(screen.getByText(en.supplierUnavailable)).toBeVisible()
  expect(screen.getByText(en.unverified)).toBeVisible()
  expect(screen.getByText(notice.area)).toBeVisible()
  expect(screen.queryByText(en.active)).not.toBeInTheDocument()
})
