import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { adhSystemPlaceId } from '../server/parsers'
import { diffDirectory, normalizeDirectory, type EpaSystemRow } from '../scripts/epa-directory-lib'
import { DIRECTORY, adhPlaceIdsFor, directorySystem, withDirectory } from '../src/water-system-directory'
import { PLACE_CATALOG, noticeMatchesPlace, withPlaceCatalog } from '../src/place-catalog'
import { resolvePlaces, type Notice } from '../src/domain'
import { providerContact } from '../src/provider-contacts'
import { StatusCard } from '../src/components'
import { en, es } from '../src/strings'

const row = (patch: Partial<EpaSystemRow>): EpaSystemRow => ({ pwsid: 'AR0000001', pws_name: 'EXAMPLE WATER', pws_activity_code: 'A', pws_type_code: 'CWS', primacy_agency_code: 'AR', population_served_count: 10, email_addr: null, phone_number: null, ...patch })

describe('EPA directory snapshot script', () => {
  it('keeps only active Arkansas community systems and copies contacts without correcting them', () => {
    const d = normalizeDirectory([
      row({ pwsid: 'AR0000002', pws_name: ' SECOND  WATER ', email_addr: 'Office@Example.ORG', phone_number: '479-555-0100' }),
      row({ pwsid: 'AR0000003', pws_activity_code: 'I' }), row({ pwsid: 'AR0000004', pws_type_code: 'NTNCWS' }), row({ pwsid: 'OK0000005', primacy_agency_code: 'OK' }),
      row({ pwsid: 'ART001101', pws_name: 'LETTER ID', email_addr: 'bad address@x', phone_number: '555-01' }),
    ], [{ pwsid: 'AR0000002', area_type_code: 'CN', county_served: 'Benton' }, { pwsid: 'AR0000002', area_type_code: 'CT', county_served: 'Ignored' }], '2026-11-08')
    expect(d.systems.map(s => s.pwsid)).toEqual(['AR0000002', 'ART001101'])
    expect(d.systems[0]).toEqual({ pwsid: 'AR0000002', name: 'SECOND WATER', county: 'Benton', placeId: adhSystemPlaceId('SECOND WATER'), population: 10, email: 'Office@Example.ORG', phone: '479-555-0100' })
    expect(d.systems[1]).toMatchObject({ county: 'County not listed' })
    expect(d.systems[1].email).toBeUndefined()
    expect(d.systems[1].phone).toBeUndefined()
  })

  it('reports added, removed and changed systems for review', () => {
    const a = normalizeDirectory([row({}), row({ pwsid: 'AR0000002' })], [], '2026-11-01')
    const b = normalizeDirectory([row({ email_addr: 'new@example.org' }), row({ pwsid: 'AR0000003' })], [], '2026-11-08')
    const diff = diffDirectory(a, b)
    expect(diff.added.map(s => s.pwsid)).toEqual(['AR0000003'])
    expect(diff.removed.map(s => s.pwsid)).toEqual(['AR0000002'])
    expect(diff.changed).toEqual([{ pwsid: 'AR0000001', fields: [{ field: 'email', from: undefined, to: 'new@example.org' }] }])
  })
})

describe('checked-in directory', () => {
  it('covers the active Arkansas community systems with ADH-compatible IDs', () => {
    expect(DIRECTORY.checkedOn).toBe('2026-11-08')
    expect(DIRECTORY.systems.length).toBe(658)
    expect(new Set(DIRECTORY.systems.map(s => s.pwsid)).size).toBe(658)
    for (const s of DIRECTORY.systems) expect(s.placeId).toBe(adhSystemPlaceId(s.name))
    for (const { place } of PLACE_CATALOG.filter(e => e.place.kind === 'system')) expect(directorySystem(place.id)?.name).toBe(place.name)
  })

  it('is searchable by name, county or PWS ID without inventing a household match', () => {
    const places = withDirectory(withPlaceCatalog([]))
    expect(places.filter(p => p.kind === 'system').length).toBeGreaterThanOrEqual(658)
    expect(resolvePlaces('AR0000569', places).map(p => p.name)).toEqual(['FAYETTEVILLE WATERWORKS'])
    expect(resolvePlaces('MARYSVILLE WATER', places).map(p => p.county)).toEqual(['Union'])
    expect(places.find(p => p.name === 'FAYETTEVILLE WATERWORKS')!.aliases).toContain('AR0000569')
  })

  it('links ADH notices only by exact published name (or a reviewed alias)', () => {
    const marysville = directorySystem(adhSystemPlaceId('MARYSVILLE WATER ASSOCIATION'))!
    const notice = (name: string): Notice => ({ id: name, placeId: adhSystemPlaceId(name), name, agency: 'ADH', kind: 'boil', area: 'Entire system', county: 'Union', issued: '2026-11-01', lifted: null, reason: 'Main break', url: 'https://health.arkansas.gov/' })
    expect(noticeMatchesPlace(marysville.placeId, notice('MARYSVILLE WATER ASSOCIATION'))).toBe(true)
    expect(noticeMatchesPlace(marysville.placeId, notice('Marysville  Water Association'))).toBe(true) // same ADH parser key
    expect(noticeMatchesPlace(marysville.placeId, notice('MARYSVILLE WATER ASSN'))).toBe(false)
    expect(noticeMatchesPlace(marysville.placeId, notice('UNION COUNTY WATER'))).toBe(false)
    expect(adhPlaceIdsFor(marysville.placeId)).toEqual([marysville.placeId])
  })

  it('uses reviewed contacts first and labels EPA directory contacts', () => {
    expect(providerContact(adhSystemPlaceId('LEISURE HILLS MOBILE HOME PARK'))!.phone).toBe('(479) 549-2158')
    const epa = DIRECTORY.systems.find(s => s.email && s.phone && !PLACE_CATALOG.some(e => e.place.id === s.placeId))!
    const c = providerContact(epa.placeId)!
    expect(c).toMatchObject({ phoneSource: 'EPA', email: epa.email, emailSource: { source: 'EPA', checkedOn: '2026-11-08' } })
    expect(c.dial).toMatch(/^\+1\d{10}$/)
    expect(c.sourceUrl).toBe(`https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/${epa.pwsid}/JSON`)
  })

  it.each([['en', en], ['es', es]] as const)('keeps the directory matching warning inside expandable advisory history (%s)', async (language, t) => {
    const at = '2026-11-08T12:00:00.000Z'
    const s = DIRECTORY.systems.find(x => !PLACE_CATALOG.some(e => e.place.id === x.placeId))!
    render(<StatusCard place={{ id: s.placeId, name: s.name, county: s.county, kind: 'system' }} source={{ agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null }} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
    const warning = language === 'en' ? /Matched by exact name only/ : /Coincidencia solo por nombre exacto/
    expect(screen.queryByText(warning)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.supplierAlertHistory }))
    expect(await within(screen.getByRole('region', { name: t.supplierAlertHistory })).findByText(warning)).toBeVisible()
  })
})
