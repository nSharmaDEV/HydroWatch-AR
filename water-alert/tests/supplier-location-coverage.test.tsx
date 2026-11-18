import { createHash } from 'node:crypto'
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ObservedSupplierMap } from '../src/ObservedSupplierMap'
import { MapSources } from '../src/MapSources'
import { MapSupplierDetails } from '../src/MapSupplierDetails'
import { SUPPLIER_LOCATIONS } from '../src/supplier-locations'
import { SOURCES, type Notice } from '../src/domain'
import { en } from '../src/strings'

// Public supplier identities observed locally on 2026-10-21, not live advisory fixtures.
const names = [
  'BANKS WATERWORKS', 'BERGMAN WATERWORKS', 'BRUNNER HILL PUBLIC WATER AUTHORITY',
  'BULL SHOALS WATER SYSTEM', 'CENTRAL LOGAN COUNTY PWFB', 'CROSS COUNTY RURAL WATER SYS',
  'DOVER WATERWORKS', 'EAST JOHNSON CO WATER ASSN', 'FLIPPIN WATERWORKS',
  'FORT SMITH WATER UTILITIES', 'GLEN ACRES', 'GURDON WATERWORKS', 'HOLLY GROVE WATERWORKS',
  'LEAD HILL WATERWORKS', 'LEISURE HILLS MOBILE HOME PARK', 'LESLIE WATER SYSTEM',
  'MIDWAY WATER ASSOCIATION', 'MOCKINGBIRD HILL WATER ASSOC', 'NEWPORT WATERWORKS',
  'NORTH JACKSON CO RURAL WATER ASSN', 'PALESTINE WATER ASSOCIATION',
  'RIVERSIDE RESORT AT KINGS RIVER', 'SALEM WATER USERS LLC', 'SMACKOVER WATERWORKS',
  'SOUTH MOUNTAIN WATER ASSN', 'SYLAMORE VALLEY WATER ASSN', 'TEXARKANA WATER UTILITIES',
  'TUCKERMAN WATERWORKS', 'USCOE OC - LITTLE FIR', 'WALDRON WATERWORKS', 'WEST STONE COUNTY WATER ASSN',
]
const placeId = (name: string) => `ADH:${createHash('sha256').update(JSON.stringify(['system', name.toLowerCase()])).digest('hex')}`

it('shows advisory and location provenance separately in supplier details', () => {
  render(<MapSupplierDetails place={{ id: placeId('FOREMAN WATERWORKS'), name: 'FOREMAN WATERWORKS', county: 'LITTLE RIVER', kind: 'system' }} archive={[]} now={0} t={en} language="en" label="Status unavailable" state="unavailable" />)
  // Advisory provenance sits with the status; map-point provenance is a separate note.
  expect(screen.getByText(en.noSuccessfulCheck).closest('.supplier-finding')).not.toBeNull()
  expect(screen.getByRole('link', { name: en.officialSource })).toHaveAttribute('href', SOURCES.ADH)
  expect(screen.getByText(/Historical public-water-system polygon reference point/).closest('.map-detail-notes')).not.toBeNull()
  expect(screen.getByRole('link', { name: 'View map point source' })).toHaveAttribute('href', expect.stringContaining('objectIds=184'))
})

it('maps newly observed exact-name GIS matches with source provenance', () => {
  for (const name of ['FOREMAN WATERWORKS', 'HOPE WATER LIGHT COMM', 'KIBLER WATER SYSTEM', 'SEVIER CO WATER ASSOCIATION', 'RAVENDEN WATERWORKS', 'LITTLE RIVER WATER ASSOCIATION', 'NORTH HOWARD RURAL WATER ASSOCIATION', 'BURDETTE WATERWORKS', 'HEAFER-BLACK OAK WATER ASSOC']) {
    const point = SUPPLIER_LOCATIONS.find(p => p.placeId === placeId(name))
    expect(point?.sourceName).toBe(name)
    expect(point?.pointMeaning).toBe('historical-polygon-centroid')
    expect(point?.sourceUrl).toContain('gis.arkansas.gov')
  }
})

it('has an exact-ID reference point for every supplier in the reviewed observed-history inventory', () => {
  const mapped = new Set(SUPPLIER_LOCATIONS.map(p => p.placeId))
  expect(names).toHaveLength(31)
  expect(names.filter(name => !mapped.has(placeId(name)))).toEqual([])
})

it('preserves documented identity evidence for renamed suppliers and non-polygon reference points', () => {
  for (const name of ['BRUNNER HILL PUBLIC WATER AUTHORITY', 'NORTH JACKSON CO RURAL WATER ASSN', 'SALEM WATER USERS LLC', 'RIVERSIDE RESORT AT KINGS RIVER', 'USCOE OC - LITTLE FIR']) {
    const point = SUPPLIER_LOCATIONS.find(p => p.placeId === placeId(name))
    expect(point, name).toBeDefined()
    expect(point).toHaveProperty('identitySourceUrls', expect.arrayContaining([expect.stringMatching(/^https:\/\//)]))
  }
  expect(SUPPLIER_LOCATIONS.find(p => p.placeId === placeId('SALEM WATER USERS LLC'))?.pointMeaning).toBe('provider-office')
  expect(SUPPLIER_LOCATIONS.find(p => p.placeId === placeId('RIVERSIDE RESORT AT KINGS RIVER'))?.pointMeaning).toBe('provider-site')
  expect(SUPPLIER_LOCATIONS.find(p => p.placeId === placeId('USCOE OC - LITTLE FIR'))?.pointMeaning).toBe('recreation-site')
})

it('renders all reviewed suppliers without a pagination cap and discloses office/site meanings', () => {
  const at = '2026-10-21T12:00:00Z'
  const archive: Notice[] = names.map((name, i) => ({ id: `test:${i}`, placeId: placeId(name), name, county: 'Synthetic county', agency: 'ADH', kind: 'boil', area: 'Synthetic area', issued: 'Synthetic date', lifted: null, reason: 'Synthetic reason', url: SOURCES.ADH }))
  render(<><ObservedSupplierMap archive={archive} watches={[]} places={[]} sources={[]} now={Date.parse(at)} coverageStart={null} active t={en} language="en" /><MapSources language="en" archive={archive} /></>)
  expect(within(screen.getByRole('group', { name: 'Arkansas supplier map' })).getAllByRole('button')).toHaveLength(31)
  expect(screen.getByRole('region', { name: 'Supplier results' })).toBeInTheDocument()
  expect(screen.getByText('Provider office reference point')).toBeInTheDocument()
  expect(screen.getByText('Provider site reference point')).toBeInTheDocument()
  expect(screen.getByText('Government campground reference point')).toBeInTheDocument()
})
