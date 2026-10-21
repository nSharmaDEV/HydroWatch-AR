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
  expect(screen.queryByRole('button', { name: /A lake or waterbody/ })).not.toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
  await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
  expect(screen.queryByText(/Cove Lake/)).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: /HAB/ })).not.toBeInTheDocument()
})
