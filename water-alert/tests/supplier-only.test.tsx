import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES } from '../src/domain'

it('hides waterbody entry points and previously saved waterbodies without erasing preferences', async () => {
  const saved = { watches: ['ADEQ:old-lake'], liftWatches: [], language: 'en', checkOnOpen: false }
  localStorage.setItem('water-alert:live:v1', JSON.stringify(saved))
  render(<App liveData={{ sources: EMPTY_SOURCES, places: [{ id: 'ADEQ:old-lake', name: 'Old Lake', kind: 'lake', county: 'Test' }], archive: [], coverageStart: null }} />)
  expect(screen.queryByText('Old Lake')).not.toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Places/ }))
  expect(screen.queryByText('Old Lake')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Add.*lake/i })).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual(saved.watches)
})

it('offers only suppliers at setup and in sample mode', async () => {
  render(<App />)
  const user = userEvent.setup()
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Places' }))
  await user.click(screen.getByRole('button', { name: /Add a place/ }))
  expect(screen.getByRole('searchbox')).toBeVisible()
  expect(screen.queryByRole('button', { name: /A lake or waterbody/ })).not.toBeInTheDocument()
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Settings' }))
  await user.click(screen.getByRole('button', { name: /^Try sample mode/ }))
  await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
  expect(screen.queryByText(/Cove Lake/)).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /HAB/ })).not.toBeInTheDocument()
})

it('goes straight from Home supplier/county/ZIP search to supplier results without a source-choice step', async () => {
  render(<App />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Search' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Find your public water supplier' })).toBeVisible()
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.queryByRole('heading', { name: 'How do you get your water?' })).not.toBeInTheDocument()
  expect(window.location.hash).toBe('#search')
  await user.click(screen.getByRole('button', { name: /Back/ }))
  expect(screen.getByRole('searchbox', { name: 'Supplier name, county, or ZIP code' })).toBeVisible()
})

it('carries the Home search text into the existing supplier search', async () => {
  render(<App liveData={{ sources: [], places: [{ id: 'ADH:hero-test', name: 'Hero Test Water', kind: 'system', county: 'Benton' }], archive: [], coverageStart: null }} />)
  const user = userEvent.setup()
  await user.type(screen.getByRole('searchbox', { name: 'Supplier name, county, or ZIP code' }), 'Hero Test{Enter}')
  expect(screen.getByRole('heading', { level: 1, name: 'Find your public water supplier' })).toBeVisible()
  expect(screen.getByRole('searchbox')).toHaveValue('Hero Test')
  expect(screen.getByRole('heading', { level: 2, name: 'Hero Test Water' })).toBeVisible()
  window.history.replaceState(null, '', '/')
})
