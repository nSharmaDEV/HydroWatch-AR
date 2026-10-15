import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES, SOURCES } from '../src/domain'
afterEach(() => window.history.replaceState(null, '', '/'))
it('shows changes only for watched live places, not sample or other suppliers', async () => {
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: ['ADH:real'], liftWatches: [], language: 'en', checkOnOpen: false }))
  const at = new Date().toISOString()
  const notice = { id: 'ADH:event', placeId: 'ADH:real', agency: 'ADH' as const, kind: 'boil' as const, name: 'Watched water', area: 'Agency area', county: 'Benton', issued: '10/13/2026', lifted: null, reason: '', url: SOURCES.ADH }
  render(<App liveData={{ sources: EMPTY_SOURCES.map(s => s.agency === 'ADH' ? { ...s, records: [notice], error: null, lastSuccessAt: at } : s), places: [{ id: notice.placeId, name: notice.name, kind: 'system', county: notice.county }], archive: [notice], coverageStart: at, recentChanges: [{ id: 'new:ADH:event', notice, type: 'new', observedAt: at }, { id: 'new:other', notice: { ...notice, id: 'ADH:other', placeId: 'ADH:other', name: 'Other supplier' }, type: 'new', observedAt: at }] }} />)
  expect(screen.getByRole('heading', { name: 'Changes since your previous visit' })).toBeVisible()
  expect(screen.queryByText(/Other supplier/)).not.toBeInTheDocument()
  await userEvent.setup().click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Try sample mode' }))
  expect(screen.queryByRole('heading', { name: 'Changes since your previous visit' })).not.toBeInTheDocument()
})

it('opens a push-linked real notice in live mode even if sample mode was previously saved', async () => {
  localStorage.setItem('water-alert:mode', 'sample')
  window.history.replaceState(null, '', '/?notice=ADH%3Alifted')
  const at = new Date().toISOString()
  const notice = { id: 'ADH:lifted', placeId: 'ADH:real', agency: 'ADH' as const, kind: 'boil' as const, name: 'Real water', area: 'Agency area', county: 'Benton', issued: '10/12/2026', lifted: '10/13/2026', reason: '', url: SOURCES.ADH }
  render(<App liveData={{ sources: EMPTY_SOURCES.map(s => s.agency === 'ADH' ? { ...s, records: [notice], error: null, lastSuccessAt: at } : s), places: [{ id: notice.placeId, name: notice.name, kind: 'system', county: notice.county }], archive: [notice], coverageStart: at }} />)
  expect(await screen.findByRole('heading', { name: 'Real water' })).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Sample mode' })).not.toBeInTheDocument()
  expect(screen.getByText('Agency lifted')).toBeVisible()
  window.history.replaceState(null, '', '/')
})
it('does not erase device preferences or deletion credentials if server removal fails', async () => {
  const saved = { watches: ['ADH:real'], liftWatches: [], language: 'en', checkOnOpen: true }
  localStorage.setItem('water-alert:live:v1', JSON.stringify(saved))
  localStorage.setItem('water-alert:push-device:v1', JSON.stringify({ token: 'a'.repeat(43), signature: 'old' }))
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
  try {
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
    await user.click(screen.getByRole('button', { name: 'Remove saved data' }))
    expect(await screen.findAllByText(/Could not complete the request/)).not.toHaveLength(0)
    expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual(['ADH:real'])
    expect(localStorage.getItem('water-alert:push-device:v1')).not.toBeNull()
  } finally { vi.unstubAllGlobals() }
})

it('explains an ADEQ N/A status without displaying an active advisory or a lift', async () => {
  const user = userEvent.setup()
  const at = new Date().toISOString()
  const notice = { id: 'ADEQ:unknown-event', placeId: 'ADEQ:unknown-lake', name: 'Uncertain Lake', agency: 'ADEQ' as const, kind: 'hab' as const, area: 'Test area', county: 'Benton', issued: 'July 12, 2018', lifted: null, liftStatus: 'unknown' as const, reason: '', url: SOURCES.ADEQ }
  render(<App liveData={{ sources: EMPTY_SOURCES.map(s => s.agency === 'ADEQ' ? { ...s, records: [notice], lastSuccessAt: at, retrievedAt: at, error: null } : s), places: [{ id: notice.placeId, name: notice.name, kind: 'lake', county: notice.county }], archive: [notice], coverageStart: at }} />)
  await user.click(screen.getByRole('button', { name: /A lake or waterbody/ }))
  await user.click(screen.getByRole('button', { name: 'Select Uncertain Lake' }))
  await user.click(screen.getByRole('button', { name: 'Yes — watch this place' }))
  expect(screen.getByText(/“N\/A” is excluded from ADEQ’s current table/)).toBeVisible()
  expect(screen.queryByText('Harmful-algal-bloom advisory')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'View details Uncertain Lake' }))
  expect(screen.getByText(/ADEQ’s current-advisories table excludes records/)).toBeVisible()
})

describe('sample resident journey', () => {
  it('chooses an explicit system, opens its guidance, and never promises push', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    expect(screen.getByRole('region', { name: 'Sample mode' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Start sample journey' }))
    await user.click(screen.getByRole('button', { name: 'Select Sample Creek Water' }))
    await user.click(screen.getByRole('button', { name: 'Yes — watch this place' }))
    await user.click(screen.getAllByRole('button', { name: 'About this supplier' })[0])
    await user.click(screen.getByRole('button', { name: 'Notice details' }))
    expect(screen.getByRole('heading', { name: 'Agency guidance' })).toBeVisible()
    expect(screen.getByText(/Exact agency instructions have not been verified/)).toBeVisible()
    await user.click(screen.getByText('Review alert options', { selector: 'summary' }))
    await user.click(screen.getByRole('button', { name: 'Notify when lifted' }))
    expect(screen.getAllByText(/Real push is not connected/).length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox', { name: 'Notify when the agency explicitly lifts a notice' })).toBeChecked()
  })
  it('shows all three states without color-only communication', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
    expect(screen.getByText('Boil-water notice')).toBeVisible()
    expect(screen.getAllByText('No active advisory found').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Data unavailable').length).toBeGreaterThan(0)
    expect(screen.getByText(/^Previously observed notice · current status unverified/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Exit sample' }))
    expect(screen.queryByRole('region', { name: 'Sample mode' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sample Creek Water')).not.toBeInTheDocument()
  })
  it('does not infer suppliers for a town search', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Start sample journey' }))
    await user.type(screen.getByRole('searchbox'), 'Sample Creek')
    expect(screen.getByText(/Choose your supplier explicitly/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Select Sample Creek Water' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Select Sample Creek Rural Water' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Go to my water' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('water-alert:sample:v1')!).watches).toEqual([])
  })
  it('explains private wells and offers optional lake selection', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: "I'm on a private well" }))
    expect(screen.getByText(/Private wells are not monitored/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Watch a lake instead' })).toBeVisible()
  })
  it('translates the sample status and settings screens', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
    await user.click(screen.getByRole('button', { name: 'ES' }))
    expect(screen.getByRole('heading', { name: 'Mi agua' })).toBeVisible()
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Ajustes/ }))
    await user.click(screen.getByRole('button', { name: /Opciones de avisos/ }))
    expect(screen.getAllByText(/Las notificaciones push reales no están conectadas/).length).toBeGreaterThan(0)
  })
})
