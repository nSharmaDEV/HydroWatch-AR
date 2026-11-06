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

it('shows the latest observed advisory once and keeps observation dates in a closed history disclosure', async () => {
  const { container } = render(<MapSupplierDetails {...props} t={en} language="en" />)
  const summary = container.querySelector('.map-advisory-summary') as HTMLElement
  expect(summary).not.toBeNull()
  expect(within(summary).getByText('Previously observed advisory')).toBeVisible()
  expect(within(summary).getByText(latest.area)).toBeVisible()
  expect(within(summary).getByText(latest.reason)).toBeVisible()
  expect(within(summary).getByText(latest.issued!)).toBeVisible()
  expect(within(summary).getByText(latest.lifted!)).toBeVisible()
  expect(within(summary).queryByText(en.firstObserved)).toBeNull()
  expect(summary.querySelector('.source-link')).toBeNull()
  expect(container.querySelectorAll('.map-detail-content > .source-link')).toHaveLength(1)

  const historySummary = screen.getByText(/Observation history · 2 records/, { selector: 'summary' })
  const history = historySummary.closest('details')!
  expect(history).not.toHaveAttribute('open')
  expect(history.querySelectorAll('.map-detail-record')).toHaveLength(2)
  expect(within(history as HTMLElement).getAllByText(en.firstObserved)).toHaveLength(2)
  expect(within(history as HTMLElement).getAllByText(en.firstObserved)[0]).not.toBeVisible()

  await userEvent.click(historySummary)
  expect(history).toHaveAttribute('open')
  within(history as HTMLElement).getAllByText(en.firstObserved).forEach(label => expect(label).toBeVisible())
  expect(within(history as HTMLElement).getByText(older.issued!)).toBeVisible()
  expect(historySummary.querySelector('.disclosure-icon')).not.toBeNull()
  expect(within(history as HTMLElement).getByText(en.observationMeaning)).toBeVisible()
})

it('uses the same compact summary and disclosure in Spanish', async () => {
  const { container } = render(<MapSupplierDetails {...props} t={es} language="es" />)
  const summary = container.querySelector('.map-advisory-summary') as HTMLElement
  expect(within(summary).getByText('Aviso observado anteriormente')).toBeVisible()
  const historySummary = screen.getByText(/Historial de observaciones · 2 registros/, { selector: 'summary' })
  expect(historySummary.closest('details')).not.toHaveAttribute('open')
  expect(screen.getByText(es.observationMeaning)).not.toBeVisible()
  await userEvent.click(historySummary)
  expect(historySummary.closest('details')).toHaveAttribute('open')
  expect(screen.getByText(es.observationMeaning)).toBeVisible()
})
