import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { MapSupplierDetails } from '../src/MapSupplierDetails'
import { SOURCES, type Notice, type Place } from '../src/domain'
import { en, es } from '../src/strings'

const at = '2026-11-05T12:00:00Z'
const place: Place = { id: 'ADH:leisure', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const latest: Notice = {
  id: 'latest', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil',
  area: 'North customers', reason: 'Pressure loss', issued: 'Nov 3, 2026', lifted: 'Nov 5, 2026', url: SOURCES.ADH,
  firstObservedAt: '2026-11-03T12:00:00Z', lastObservedAt: '2026-11-04T12:00:00Z',
}
const older: Notice = {
  ...latest, id: 'older', area: 'South customers', reason: 'Main break', issued: 'Oct 20, 2026', lifted: null,
  firstObservedAt: '2026-10-21T12:00:00Z', lastObservedAt: '2026-10-22T12:00:00Z',
}
const source = { agency: 'ADH' as const, records: [], retrievedAt: at, lastSuccessAt: at, error: null }
const props = { place, archive: [older, latest], source, now: Date.parse(at), label: 'No active advisory found', state: 'none' }

it('uses the Places heading, finding box and notice record for the latest observed advisory', async () => {
  const { container } = render(<MapSupplierDetails {...props} t={en} language="en" />)
  expect(screen.getByRole('heading', { level: 2, name: 'Leisure Hills Mobile Home Park' })).toBeVisible()
  expect(screen.getByText('Benton County · Arkansas Department of Health')).toBeVisible()
  const finding = container.querySelector('.supplier-finding') as HTMLElement
  expect(within(finding).getByText('No active advisory found')).toBeVisible()
  expect(within(finding).getByText(en.successfulCheck)).toBeVisible()
  expect(screen.getByRole('link', { name: en.officialSource })).toBeVisible()

  const summary = container.querySelector('.map-detail-content > .supplier-alert-notice') as HTMLElement
  expect(within(summary).getByRole('heading', { level: 3, name: 'Boil-water notice' })).toBeVisible()
  expect(within(summary).getByText(latest.area)).toBeVisible()
  expect(within(summary).getByText(latest.reason)).toBeVisible()
  expect(within(summary).getByText(latest.issued!)).toBeVisible()
  expect(within(summary).getByText(latest.lifted!)).toBeVisible()
  expect(within(summary).getByText(`Status: ${en.supplierAlertLifted}`)).toBeVisible()
  expect(within(summary).queryByText(en.firstObserved)).toBeNull()
  expect(summary.querySelector('.source-link')).toBeNull()

  const historySummary = screen.getByText(/Observation history · 2 records/, { selector: 'summary' })
  const history = historySummary.closest('details')!
  expect(history).not.toHaveAttribute('open')
  expect(history.querySelectorAll('.map-detail-record')).toHaveLength(2)
  expect(within(history as HTMLElement).getAllByText(en.firstObserved)[0]).not.toBeVisible()

  await userEvent.click(historySummary)
  expect(history).toHaveAttribute('open')
  within(history as HTMLElement).getAllByText(en.firstObserved).forEach(label => expect(label).toBeVisible())
  expect(within(history as HTMLElement).getByText(older.issued!)).toBeVisible()
  // A missing lift date is never shown as lifted.
  expect(within(history as HTMLElement).getByText('Status: Unconfirmed')).toBeVisible()
  expect(historySummary.querySelector('.disclosure-icon')).not.toBeNull()
  expect(within(history as HTMLElement).getByText(en.observationMeaning)).toBeVisible()
})

it('keeps map-point provenance in an accessible dismissible pop-up and a quiet source note', async () => {
  const mappedPlace = { ...place, id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf' }
  render(<MapSupplierDetails {...props} place={mappedPlace} archive={[{ ...latest, placeId: mappedPlace.id }]} t={en} language="en" />)
  expect(screen.getByRole('link', { name: 'View map point source' })).toBeVisible()
  expect(screen.getByText(/not proof of safe water/)).toBeVisible()
  const info = screen.getByRole('button', { name: 'About this map point' })
  expect(info).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByText(/Location reviewed:/)).toBeNull()
  await userEvent.click(info)
  expect(info).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText(/Location reviewed: 2026-10-21/)).toBeVisible()
  expect(screen.getByText(/Approximate reference point, not an affected area/)).toBeVisible()
  await userEvent.keyboard('{Escape}')
  expect(info).toHaveAttribute('aria-expanded', 'false')
  expect(info).toHaveFocus()
})

it('never presents unavailable data as an all-clear and marks retained records as historical', () => {
  const failed = { ...source, lastSuccessAt: null, error: 'timeout' }
  const { container } = render(<MapSupplierDetails {...props} source={failed} label="Information unavailable" state="unavailable" t={en} language="en" />)
  const finding = container.querySelector('.supplier-finding') as HTMLElement
  expect(within(finding).getByText('Information unavailable')).toBeVisible()
  expect(within(finding).getByText(en.noSuccessfulCheck)).toBeVisible()
  expect(screen.queryByText(en.noNoticeExplanation)).toBeNull()
})

it('uses the same layout in Spanish', async () => {
  const { container } = render(<MapSupplierDetails {...props} t={es} language="es" />)
  expect(screen.getByText('Condado de Benton · Arkansas Department of Health')).toBeVisible()
  const summary = container.querySelector('.map-detail-content > .supplier-alert-notice') as HTMLElement
  expect(within(summary).getByRole('heading', { name: 'Aviso de hervir el agua' })).toBeVisible()
  const historySummary = screen.getByText(/Historial de observaciones · 2 registros/, { selector: 'summary' })
  expect(historySummary.closest('details')).not.toHaveAttribute('open')
  expect(screen.getByText(es.observationMeaning)).not.toBeVisible()
  await userEvent.click(historySummary)
  expect(historySummary.closest('details')).toHaveAttribute('open')
  expect(screen.getByText(es.observationMeaning)).toBeVisible()
})
