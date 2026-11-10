import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { SearchPlace } from '../src/Journey'
import { en, es } from '../src/strings'
import type { Place } from '../src/domain'
import type { ZipIndex } from '../src/zip-suppliers'

const places: Place[] = ['ALPHA', 'BETA', 'DELTA', 'GAMMA'].map((name, i) => ({ id: `p${i}`, name, kind: 'system', county: 'Test' }))
const systems = Object.fromEntries(places.map((p, i) => [`AR000000${i}`, { pwsid: `AR000000${i}`, placeId: p.id, name: p.name, boundarySource: i === 1 ? 'modeled' as const : 'system-sourced' as const, boundaryDates: ['2023-07-08'], providers: ['ADH'] }]))
const index: ZipIndex = { schemaVersion: 1, systems, zips: { '72001': Object.keys(systems) } }
const select = vi.fn()
function Search({ t = en, data = index, enabled = true }: { t?: typeof en; data?: ZipIndex | null; enabled?: boolean }) {
  const [query, setQuery] = useState('72001')
  return <SearchPlace kind="system" places={places} query={query} onQuery={setQuery} onSelect={select} onBack={() => {}} t={t} zipIndex={data} enableZip={enabled} />
}
it('lists all ZIP candidates alphabetically without pagination and selects the original supplier', async () => {
  select.mockClear()
  render(<Search />)
  expect(screen.queryByText('Possible suppliers for 72001')).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /^Select / }).map(b => b.getAttribute('aria-label'))).toEqual(['Select ALPHA', 'Select BETA', 'Select DELTA', 'Select GAMMA'])
  expect(screen.queryByRole('button', { name: 'Next results' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Select GAMMA' }))
  expect(select).toHaveBeenCalledWith(places[3])
})
it('keeps the caveat and unrestricted name-search fallback inside Suggestion sources', async () => {
  render(<Search />)
  expect(screen.getByText(/Suggestions may be incomplete/).closest('details')).not.toHaveAttribute('open')
  await userEvent.click(screen.getByText('Suggestion sources'))
  expect(screen.getByRole('button', { name: 'My supplier isn’t listed' }).closest('details')).toHaveClass('zip-provenance')
  await userEvent.click(screen.getByRole('button', { name: 'My supplier isn’t listed' }))
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.getByRole('searchbox')).toHaveFocus()
  await userEvent.type(screen.getByRole('searchbox'), 'ALPHA')
  expect(screen.getByRole('button', { name: 'Select ALPHA' })).toBeVisible()
})
it('explains partial input, no mapped match and unavailable data separately', async () => {
  const { rerender } = render(<Search />)
  const input = screen.getByRole('searchbox')
  await userEvent.clear(input); await userEvent.type(input, '72')
  expect(screen.getByText('Enter a five-digit ZIP code.')).toBeVisible()
  expect(screen.queryByRole('button', { name: /^Select / })).not.toBeInTheDocument()
  await userEvent.clear(input); await userEvent.type(input, '99999')
  expect(screen.getByText(/No mapped matches/)).toBeVisible()
  rerender(<Search data={null} />)
  expect(screen.getByText(/ZIP suggestions are unavailable/)).toBeVisible()
})
it('shows Spanish caveats and provenance without treating modeled boundaries as confirmed', async () => {
  render(<Search t={es} />)
  expect(screen.queryByText('Posibles proveedores para 72001')).not.toBeInTheDocument()
  expect(screen.getByText(/Área estimada/)).toBeVisible()
  await userEvent.click(screen.getByText('Fuentes de las sugerencias'))
  expect(screen.getAllByText(/2023-07-08/).length).toBeGreaterThan(0)
})
it('never runs geographic lookup in sample mode', () => {
  render(<Search enabled={false} />)
  expect(screen.queryByText(/Possible suppliers/)).not.toBeInTheDocument()
})
