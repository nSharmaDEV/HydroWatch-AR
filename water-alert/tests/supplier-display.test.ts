import { expect, it } from 'vitest'
import { supplierName, supplierCounty } from '../src/supplier-display'

it.each([
  ['BELLA VISTA POA', 'Bella Vista POA'],
  ['VILLAGE WATER LLC', 'Village Water LLC'],
  ['TEST PWA', 'Test PWA'],
  ['BENTON COUNTY WATER AUTHORITY4', 'Benton County Water Authority4'],
  ['BENTON COUNTY WATER AUTHORITY5', 'Benton County Water Authority5'],
  ['BENTON COUNTY WATER DISTRICT #1', 'Benton County Water District #1'],
  ['Mixed Case LLC', 'Mixed Case LLC'],
])('formats %s without changing supplier identity', (raw, displayed) => {
  expect(supplierName(raw)).toBe(displayed)
})

it('keeps county formatting independent of supplier acronyms', () => {
  expect(supplierCounty('BENTON')).toBe('Benton')
})
