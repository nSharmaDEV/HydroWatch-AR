import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { ObservedHistory } from '../src/ObservedHistory'
import { SOURCES, type Language, type Notice, type SourceSnapshot, type Place } from '../src/domain'
import { en, es } from '../src/strings'
import { SUPPLIER_LOCATIONS, projectArkansas } from '../src/supplier-locations'

const at = '2026-10-21T12:00:00Z'
const id = 'ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d'
const notice: Notice = { id: 'test:notice', placeId: id, name: 'BULL SHOALS WATER SYSTEM', county: 'MARION', agency: 'ADH', kind: 'boil', area: 'Synthetic affected street', issued: '10/20/2026', lifted: null, reason: 'Synthetic break', url: SOURCES.ADH, lastObservedAt: at }
const other = { ...notice, id: 'test:other', placeId: 'ADH:unmapped', name: 'Unmapped test supplier', county: 'TEST COUNTY', area: 'Another synthetic street' }
const source: SourceSnapshot = { agency: 'ADH', records: [notice, other], retrievedAt: at, lastSuccessAt: at, error: null }
const base = { archive: [notice, other], watches: [id], coverageStart: at, t: en, language: 'en' as Language, places: [] as Place[], sources: [source], now: Date.parse(at), onView: vi.fn() }
async function openMap(props = base) {
  const result = render(<ObservedHistory {...props} />)
  return result
}

it('offers a compact map workspace, Sources shortcut and one supplier list for both scopes', async () => {
  const onSources = vi.fn()
  render(<ObservedHistory {...base} onSources={onSources} />)
  expect(screen.getByRole('heading', { name: 'Advisory map' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: en.sources }))
  expect(onSources).toHaveBeenCalledOnce()
  expect(screen.queryByText(notice.area)).toBeNull()
  expect(screen.getAllByRole('list')).toHaveLength(1)
  expect(screen.getByText('Location unavailable')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: en.myPlaces }))
  expect(screen.queryByRole('button', { name: /Unmapped test supplier/ })).toBeNull()
  expect(screen.getByRole('searchbox')).toBeVisible()
})

it('maps exact IDs and selects the same local details from markers and rows, preserving filters and zoom', async () => {
  const onView = vi.fn()
  await openMap({ ...base, onView })
  const map = screen.getByRole('group', { name: 'Arkansas supplier map' })
  const marker = within(map).getByRole('button', { name: /BULL SHOALS WATER SYSTEM.*Active advisory/ })
  await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
  const position = map.getAttribute('viewBox')
  marker.focus()
  await userEvent.keyboard('{Enter}')
  expect(onView).not.toHaveBeenCalled()
  expect(screen.getByText(notice.area)).toBeVisible()
  expect(screen.getByText(en.lastObserved)).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /Back to results/ }))
  expect(map).toHaveAttribute('viewBox', position)
  const results = screen.getByRole('region', { name: 'Supplier results' })
  expect(within(results).getByRole('button', { name: /BULL SHOALS/ })).toHaveAttribute('aria-pressed', 'true')
  expect(within(results).getByRole('button', { name: /Unmapped test supplier.*Active advisory/ })).toBeVisible()
  expect(within(map).queryByRole('button', { name: /Unmapped test supplier/ })).toBeNull()
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search supplier or county' }), 'test county')
  expect(within(map).queryByRole('button', { name: /BULL SHOALS/ })).toBeNull()
  await userEvent.click(within(results).getByRole('button', { name: /Unmapped test supplier/ }))
  expect(screen.getByText(other.area)).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /Back to results/ }))
  expect(screen.getByRole('searchbox')).toHaveValue('test county')
})

it('applies status filters to both results and markers, active first, without treating retained notices as current', async () => {
  await openMap({ ...base, sources: [{ ...source, records: [other] }] })
  const results = screen.getByRole('region', { name: 'Supplier results' })
  expect(within(results).getAllByRole('button')[0]).toHaveTextContent(other.name)
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'active')
  expect(within(results).getAllByRole('button')).toHaveLength(1)
  expect(within(screen.getByRole('group', { name: 'Arkansas supplier map' })).queryByRole('button')).toBeNull()
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'none')
  await userEvent.click(within(results).getByRole('button', { name: /BULL SHOALS/ }))
  expect(within(screen.getByRole('region', { name: notice.name })).getByText('No active advisory found')).toBeVisible()
  expect(screen.getByText(en.historyPrevious)).toBeVisible()
  expect(screen.getByText(notice.area)).toBeVisible()
})

it.each([
  { records: [], error: null, age: 0, expected: 'No active advisory found' },
  { records: [notice], error: 'Timeout', age: 0, expected: 'Status unavailable' },
  { records: [notice], error: null, age: 900_000, expected: 'Outdated information' },
  { records: [notice], error: null, age: -30_000, expected: 'Status unavailable' },
  { records: [{ ...notice, liftStatus: 'unknown' as const }], error: null, age: 0, expected: 'Status unavailable' },
  { records: [{ ...notice, lifted: '10/21/2026' }], error: null, age: 0, expected: 'No active advisory found' },
])('uses current snapshot status, not retained events: $expected ($age)', async ({ records, error, age, expected }) => {
  await openMap({ ...base, sources: [{ ...source, records, error }], now: Date.parse(at) + age })
  expect(within(screen.getByRole('group', { name: 'Arkansas supplier map' })).getByRole('button', { name: new RegExp(`BULL SHOALS WATER SYSTEM.*${expected}`) })).toBeVisible()
})

it('deduplicates observed suppliers, excludes unobserved places, and translates controls without translating agency names', async () => {
  await openMap({ ...base, archive: [notice, { ...notice, id: 'another-event' }], places: [{ id: 'unobserved', name: 'Not observed', county: 'MARION', kind: 'system' }], t: es, language: 'es' })
  expect(screen.getByRole('button', { name: 'Mapa' })).toBeVisible()
  expect(screen.getByRole('searchbox', { name: 'Buscar proveedor o condado' })).toBeVisible()
  expect(within(screen.getByRole('group', { name: 'Mapa de proveedores de Arkansas' })).getAllByRole('button')).toHaveLength(1)
  expect(screen.queryByText('Not observed')).toBeNull()
})

it('shows source failure context and the last successful timestamp without trusting retained active records', async () => {
  await openMap({ ...base, sources: [{ ...source, error: 'Timeout' }] })
  expect(screen.getByText(en.checkRetrievalFailed)).toBeVisible()
  expect(screen.getByText(en.successfulCheck)).toBeVisible()
  expect(screen.queryByRole('button', { name: /BULL SHOALS.*Active advisory/ })).toBeNull()
})

it('recomputes markers with the existing app clock and snapshot updates', async () => {
  const { rerender } = await openMap()
  const map = screen.getByRole('group', { name: 'Arkansas supplier map' })
  rerender(<ObservedHistory {...base} now={base.now + 900_000} />)
  expect(within(map).getByRole('button', { name: /BULL SHOALS.*Outdated information/ })).toBeVisible()
  rerender(<ObservedHistory {...base} sources={[{ ...source, records: [] }]} />)
  expect(within(map).getByRole('button', { name: /BULL SHOALS.*No active advisory found/ })).toBeVisible()
})

it('keeps absent-source suppliers discoverable without making an all-clear claim', async () => {
  await openMap({ ...base, sources: [] })
  expect(screen.getByText(en.noSuccessfulCheck)).toBeVisible()
  expect(within(screen.getByRole('group', { name: 'Arkansas supplier map' })).getByRole('button', { name: /BULL SHOALS.*Status unavailable/ })).toBeVisible()
})

it('keeps reviewed geographic facts separate from advisory data with exact IDs and provenance', () => {
  expect(new Set(SUPPLIER_LOCATIONS.map(p => p.placeId)).size).toBe(SUPPLIER_LOCATIONS.length)
  for (const point of SUPPLIER_LOCATIONS) {
    expect(point.placeId).toMatch(/^ADH:[a-f0-9]{64}$/)
    expect(point.sourceUrl).toMatch(/^https:\/\//)
    expect(point.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(['historical-polygon-centroid', 'provider-office', 'provider-site', 'recreation-site']).toContain(point.pointMeaning)
    if (point.pointMeaning === 'historical-polygon-centroid') expect(point.sourceUrl).toMatch(/^https:\/\/gis\.arkansas\.gov\//)
    else expect(point.identitySourceUrls?.some(url => url.startsWith('https://health.arkansas.gov/Eng/WS.aspx?ID='))).toBe(true)
    const projected = projectArkansas(point.longitude, point.latitude)
    expect(projected.x).toBeGreaterThan(0)
    expect(projected.x).toBeLessThan(620)
    expect(projected.y).toBeGreaterThan(0)
    expect(projected.y).toBeLessThan(540)
  }
})
