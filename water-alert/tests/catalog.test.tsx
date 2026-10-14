import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES, SOURCES, statusFor, type Notice, type SourceSnapshot } from '../src/domain'

const beaver = 'ADEQ:catalog:beaver-lake'
const buffalo = 'ADEQ:catalog:buffalo-national-river'
const at = new Date().toISOString()
const record: Notice = { id: 'ADEQ:published-area', placeId: 'ADEQ:original-area-id', name: 'Beaver Lake', kind: 'hab', agency: 'ADEQ', county: 'Benton', area: 'Published cove only', issued: 'October 13, 2026', lifted: null, reason: '', url: SOURCES.ADEQ, lastObservedAt: at }
const source: SourceSnapshot = { agency: 'ADEQ', records: [record], retrievedAt: at, lastSuccessAt: at, error: null }

it('offers both verified waterbodies offline, confirms before watching, and shows unavailable rather than safety', async () => {
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: /A lake or waterbody/ }))
  expect(screen.getByRole('button', { name: 'Select Beaver Lake' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Select Buffalo National River' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Select Beaver Lake' }))
  expect(screen.getByRole('link', { name: /Catalog source/ })).toHaveAttribute('href', 'https://www.swl.usace.army.mil/Missions/Recreation/Lakes/Beaver-Lake/Dam-and-Lake-Information/')
  expect(screen.getByText(/not drinking-water tests, bacterial results, or park closures/)).toBeVisible()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Yes — watch this place' }))
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([beaver])
  expect(within(screen.getByRole('article')).getByText('Data unavailable')).toBeVisible()
})

it('offers all four ADH-verified suppliers without an observed notice and does not guess a supplier from a lake', async () => {
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: /My public water supplier/ }))
  for (const name of ['FAYETTEVILLE WATERWORKS', 'SPRINGDALE WATER UTILITIES', 'ROGERS WATER UTILITIES', 'BENTONVILLE WATER UTILITIES']) expect(screen.getByRole('button', { name: `Select ${name}` })).toBeVisible()
  await user.type(screen.getByRole('searchbox'), 'Beaver Lake')
  expect(screen.getByRole('heading', { name: 'No matching supplier' })).toBeVisible()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([])
})

it('matches exact waterbody records without changing their area identities or treating a lake HAB as a boil notice', () => {
  const other = { ...record, id: 'other', placeId: 'other-place', area: 'Second published area' }
  const status = statusFor(beaver, { ...source, records: [record, other] })
  expect(status.state).toBe('active')
  expect(status.records.map(n => [n.id, n.placeId, n.area])).toEqual([[record.id, record.placeId, record.area], [other.id, other.placeId, other.area]])
  expect(statusFor(beaver, { ...source, records: [{ ...record, name: 'Beaver Lake Estates' }] }).records).toEqual([])
  expect(statusFor(beaver, { ...source, agency: 'ADH', records: [{ ...record, agency: 'ADH', kind: 'boil' }] }).records).toEqual([])
  expect(statusFor(buffalo, { ...source, records: [{ ...record, name: 'Buffalo River' }] }).state).toBe('active')
  expect(statusFor(beaver, { ...source, error: 'Offline' }).state).toBe('unavailable')
  expect(statusFor(beaver, { ...source, lastSuccessAt: '2000-01-01T00:00:00Z' }).state).toBe('unavailable')
})

it('shows a catalog watch matching observed records in home, details, and my-place history', async () => {
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [beaver], liftWatches: [], language: 'en', checkOnOpen: false }))
  const user = userEvent.setup(); render(<App liveData={{ sources: [EMPTY_SOURCES[0], source], places: [], archive: [record], coverageStart: at }} />)
  expect(within(screen.getByRole('article')).getByText('Published cove only')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Understand this notice Beaver Lake' }))
  expect(within(document.querySelector('.detail-status') as HTMLElement).getByText('Published cove only')).toBeVisible()
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'History' }))
  expect(screen.getByRole('heading', { name: 'Beaver Lake' })).toBeVisible()
})

it('keeps real catalog entries out of the fictional sample catalog', async () => {
  localStorage.setItem('water-alert:mode', 'sample')
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: /A lake or waterbody/ }))
  expect(screen.queryByRole('button', { name: 'Select Beaver Lake' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Select Buffalo National River' })).not.toBeInTheDocument()
})

it('distinguishes catalog identity sources from the two advisory feeds in Sources and coverage limits', async () => {
  const user = userEvent.setup(); render(<App />)
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Settings' }))
  await user.click(screen.getByRole('button', { name: /Sources and coverage limits/ }))
  expect(screen.getByText(/small source-verified directory/)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Buffalo National River' })).toHaveAttribute('href', 'https://www.nps.gov/buff/learn/nature/waterquality.htm')
})
