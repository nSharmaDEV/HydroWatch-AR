import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES, SOURCES } from '../src/domain'
afterEach(() => window.history.replaceState(null, '', '/'))
it('shows the welcome landing page at Home and keeps the watched advisory dashboard under Places', async () => {
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: ['ADH:real'], liftWatches: [], language: 'en', checkOnOpen: false }))
  const notice = { id: 'ADH:event', placeId: 'ADH:real', agency: 'ADH' as const, kind: 'boil' as const, name: 'Watched water', area: 'Agency area', county: 'Benton', issued: '10/13/2026', lifted: null, reason: '', url: SOURCES.ADH }
  render(<App liveData={{ sources: EMPTY_SOURCES, places: [{ id: notice.placeId, name: notice.name, kind: 'system', county: notice.county }], archive: [notice], coverageStart: null }} />)
  expect(screen.getByRole('heading', { name: 'Water information, made easier.' })).toBeVisible()
  expect(document.querySelector('.wave-marquee')).toHaveAttribute('aria-label', 'WAVE: Water Awareness, Verification, and Empowerment')
  expect(document.querySelector('.wave-marquee')).toHaveTextContent('WAVE: Water Awareness, Verification, and Empowerment●')
  expect(document.querySelector('.wave-marquee-copy')?.textContent.match(/WAVE: Water Awareness, Verification, and Empowerment/g)).toHaveLength(6)
  expect(screen.queryByText('Welcome to WAVE')).not.toBeInTheDocument()
  const home = document.querySelector('.wave-home') as HTMLElement
  fireEvent.mouseMove(home, { clientX: 120, clientY: 80 })
  expect(home.style.getPropertyValue('--ripple-x')).toBe('120px')
  expect(screen.queryByRole('heading', { name: 'What would you like to do?' })).not.toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Places' }))
  expect(document.querySelector('.wave-marquee')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'My Water' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Watched water' })).toBeVisible()
})
it('separates curated preparation references from live advisory feeds', async () => {
  render(<App />)
  const user = userEvent.setup()
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
  await user.click(screen.getByRole('button', { name: /Sources and coverage limits/ }))
  expect(screen.getByRole('heading', { name: 'Curated references — not live advisory feeds' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Arkansas Attorney General' })).toHaveAttribute('href', 'https://arkansasag.gov/file-a-complaint/')
})
it('shows changes only for watched live places, not sample or other suppliers', async () => {
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: ['ADH:real'], liftWatches: [], language: 'en', checkOnOpen: false }))
  const at = new Date().toISOString()
  const notice = { id: 'ADH:event', placeId: 'ADH:real', agency: 'ADH' as const, kind: 'boil' as const, name: 'Watched water', area: 'Agency area', county: 'Benton', issued: '10/13/2026', lifted: null, reason: '', url: SOURCES.ADH }
  render(<App liveData={{ sources: EMPTY_SOURCES.map(s => s.agency === 'ADH' ? { ...s, records: [notice], error: null, lastSuccessAt: at } : s), places: [{ id: notice.placeId, name: notice.name, kind: 'system', county: notice.county }], archive: [notice], coverageStart: at, recentChanges: [{ id: 'new:ADH:event', notice, type: 'new', observedAt: at }, { id: 'new:other', notice: { ...notice, id: 'ADH:other', placeId: 'ADH:other', name: 'Other supplier' }, type: 'new', observedAt: at }] }} />)
  await userEvent.setup().click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Places' }))
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
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }))
    expect(await screen.findAllByText(/Could not complete the request/)).not.toHaveLength(0)
    expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual(['ADH:real'])
    expect(localStorage.getItem('water-alert:push-device:v1')).not.toBeNull()
  } finally { vi.unstubAllGlobals() }
})

it('does not offer ADEQ records in supplier-only setup', async () => {
  const at = new Date().toISOString()
  const notice = { id: 'ADEQ:unknown-event', placeId: 'ADEQ:unknown-lake', name: 'Uncertain Lake', agency: 'ADEQ' as const, kind: 'hab' as const, area: 'Test area', county: 'Benton', issued: 'July 12, 2018', lifted: null, liftStatus: 'unknown' as const, reason: '', url: SOURCES.ADEQ }
  render(<App liveData={{ sources: EMPTY_SOURCES.map(s => s.agency === 'ADEQ' ? { ...s, records: [notice], lastSuccessAt: at, retrievedAt: at, error: null } : s), places: [{ id: notice.placeId, name: notice.name, kind: 'lake', county: notice.county }], archive: [notice], coverageStart: at }} />)
  expect(screen.queryByRole('button', { name: /A lake or waterbody/ })).not.toBeInTheDocument()
  expect(screen.queryByText('Uncertain Lake')).not.toBeInTheDocument()
  expect(screen.queryByText('Harmful-algal-bloom advisory')).not.toBeInTheDocument()
})

describe('sample resident journey', () => {
  it('keeps sample notifications disabled for supplier watches', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    expect(screen.getByRole('region', { name: 'Sample mode' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
    await user.click(screen.getByRole('button', { name: /Alert Options/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Notify when the agency explicitly lifts a notice' }))
    expect(screen.getByText('Notifications are disabled in sample mode.')).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Notify when the agency explicitly lifts a notice' })).toBeChecked()
  })
  it('shows supplier sample statuses without waterbody cards', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
    expect(screen.getByText('Active boil-water notice')).toBeVisible()
    expect(screen.getAllByText('No active boil-water notice found').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Sample Cove Lake' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Exit sample' }))
    expect(screen.queryByRole('region', { name: 'Sample mode' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sample Creek Water')).not.toBeInTheDocument()
  })
  it('does not infer suppliers for a town search', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Start sample journey' }))
    await user.type(screen.getByRole('searchbox'), 'Sample Creek')
    expect(screen.getByText(/Choose your supplier explicitly/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Select Sample Creek Water' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Select Sample Creek Rural Water' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Go to my water' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('water-alert:sample:v1')!).watches).toEqual([])
  })
  it('explains private-well exclusion without lake selection', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: /Get help with a water issue/ }))
    await user.click(screen.getByRole('button', { name: "I'm on a private well" }))
    expect(screen.getByText(/Private wells are outside coverage/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Watch a lake instead' })).not.toBeInTheDocument()
  })
  it('translates the sample status and settings screens', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
    await user.click(screen.getByRole('button', { name: 'ES' }))
    expect(screen.getByRole('heading', { name: 'Mi agua' })).toBeVisible()
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Ajustes/ }))
    await user.click(screen.getByRole('button', { name: /Opciones de avisos/ }))
    expect(screen.getByText('Las notificaciones están desactivadas en modo de muestra.')).toBeVisible()
  })
})
