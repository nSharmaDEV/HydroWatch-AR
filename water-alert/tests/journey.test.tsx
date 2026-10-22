import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES, SOURCES, type Notice } from '../src/domain'
import { DateRow } from '../src/components'

const place = { id: 'ADH:real', name: 'Real supplier', county: 'Benton', kind: 'system' as const }
const at = '2026-10-13T12:00:00Z'
const notice: Notice = { id: 'ADH:record', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Published area', reason: 'Published reason', issued: 'Oct 12, 2026', lifted: null, url: SOURCES.ADH, firstObservedAt: at, lastObservedAt: at }
const data = { sources: EMPTY_SOURCES.map(s => s.agency === 'ADH' ? { ...s, records: [notice], retrievedAt: at, lastSuccessAt: at, error: null } : s), places: [place], archive: [notice], coverageStart: at }
function saved() { localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [place.id], liftWatches: [place.id], language: 'en', checkOnOpen: false })) }
function nav(name: string) { return within(screen.getByRole('navigation')).getByRole('button', { name }) }
afterEach(() => window.history.replaceState(null, '', '/'))

it('requires confirmation before saving an exact supplier and supports choosing another place', async () => {
  const user = userEvent.setup(); render(<App liveData={data} />)
  await user.click(screen.getByRole('button', { name: /My public water supplier/ }))
  expect(screen.getByRole('heading', { name: 'Find your public water supplier' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Select Real supplier' }))
  expect(screen.getByRole('heading', { name: 'Confirm your public water supplier' })).toBeVisible()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Choose a different place' }))
  await user.click(screen.getByRole('button', { name: 'Select Real supplier' }))
  await user.click(screen.getByRole('button', { name: 'Yes — watch this place' }))
  expect(screen.getByRole('heading', { name: 'My Water' })).toBeVisible()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([place.id])
})

it('shows a supplier no-match warning with edit search and an official-source escape', async () => {
  const user = userEvent.setup(); render(<App liveData={data} />)
  await user.click(screen.getByRole('button', { name: /My public water supplier/ }))
  await user.type(screen.getByRole('searchbox'), 'Springfield')
  expect(screen.getByRole('heading', { name: 'No matching supplier' })).toBeVisible()
  expect(screen.getByText('This does not mean there is no advisory.')).toBeVisible()
  expect(screen.getByRole('link', { name: /Check ADH directly/ })).toHaveAttribute('href', SOURCES.ADH)
  await user.click(screen.getByRole('button', { name: 'Edit search' }))
  expect(screen.getByRole('searchbox')).toHaveFocus()
})

it('removes and restores a watched place including its explicit-lift preference', async () => {
  saved(); const user = userEvent.setup(); render(<App liveData={data} />)
  await user.click(nav('Places'))
  await user.click(screen.getByRole('button', { name: 'Remove Real supplier' }))
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Undo' }))
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).liftWatches).toEqual([place.id])
})

it('filters observed history to watched places without treating disappearance as a lift', async () => {
  saved(); const user = userEvent.setup()
  render(<App liveData={{ ...data, archive: [notice, { ...notice, id: 'other', placeId: 'ADH:other', name: 'Other supplier', firstObservedAt: undefined }] }} />)
  await user.click(nav('History'))
  expect(screen.queryByText('Other supplier')).not.toBeInTheDocument()
  expect(screen.getByText(/Previously observed/)).toBeVisible()
  expect(screen.queryByText('Agency explicitly lifted')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'All observed places' }))
  expect(screen.getByText('Other supplier')).toBeVisible()
})

it('labels retained failed-source notices as previous observations, with unavailable status', async () => {
  saved(); const user = userEvent.setup(); const view = render(<App liveData={{ ...data, sources: data.sources.map(s => ({ ...s, error: 'Failed' })) }} />)
  const card = screen.getByRole('article')
  expect(card).toHaveClass('unavailable')
  expect(within(card).queryByText('No active boil-water notice found')).not.toBeInTheDocument()
  expect(within(card).getByText('Current advisory status unavailable.')).toBeVisible()
  expect(within(card).queryByText('No successful check recorded yet for this supplier.')).not.toBeInTheDocument()
  expect(within(card).queryByText('Boil-water notice')).not.toBeInTheDocument()
  view.unmount()
  window.history.replaceState(null, '', `/?notice=${encodeURIComponent(notice.id)}`)
  render(<App liveData={{ ...data, sources: data.sources.map(s => ({ ...s, error: 'Failed' })) }} />)
  expect(screen.getByText('Previously observed notice · current status unverified')).toBeVisible()
  expect(screen.queryByText('Published \(this record\)')).not.toBeInTheDocument()
})

it('keeps agency dates verbatim and formats only app timestamps with language and explicit timezone', () => {
  const view = render(<dl><DateRow label="Agency issued" value="Oct 12, 2026" unknown="Unknown" /><DateRow label="App checked" value={at} unknown="Unknown" app language="en" /><DateRow label="Missing date" value={null} unknown="Unknown" /></dl>)
  expect(screen.getByText('Oct 12, 2026')).toBeVisible()
  expect(screen.getByText(/CDT.*America\/Chicago/)).toBeVisible()
  expect(screen.queryByText('Missing date')).not.toBeInTheDocument()
  view.rerender(<dl><DateRow label="Consulta de la app" value={at} unknown="Unknown" app language="es" /></dl>)
  expect(screen.getByText(/oct.*America\/Chicago/)).toBeVisible()
})

it('describes feed retrieval and browser/server deletion accurately in both languages', async () => {
  saved(); const user = userEvent.setup(); render(<App liveData={data} />)
  expect(screen.getByRole('heading', { name: 'About these results' })).toBeVisible()
  expect(screen.getByText(/WAVE checks ADH boil-water notices for public-water suppliers/)).toBeVisible()
  await user.click(nav('Settings'))
  await user.click(screen.getByRole('button', { name: /Privacy and stored data/ }))
  expect(screen.getByText(/Disable\/delete removes the server subscription and browser credential/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'ES' }))
  expect(screen.getByText(/Desactivar\/eliminar borra la suscripción del servidor y la credencial del navegador/)).toBeVisible()
})

it('keeps About these results permanently visible and exposes an accessible push switch', () => {
  saved(); const { container } = render(<App liveData={data} />)
  expect(container.querySelector('.about-results details')).toBeNull()
  expect(screen.getByRole('switch', { name: 'Get water updates' })).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('heading', { name: 'About these results' })).toBeVisible()
})

it('keeps the switch off and explains blocked permission when enable is attempted', async () => {
  saved(); vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() })
  const user = userEvent.setup(); render(<App liveData={data} />)
  const toggle = screen.getByRole('switch', { name: 'Get water updates' })
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('status')).toHaveTextContent(/Notifications are blocked for this site/)
})

it('introduces a fictional sample journey and keeps removal/undo isolated from live preferences', async () => {
  saved(); const before = localStorage.getItem('water-alert:live:v1'); const user = userEvent.setup()
  render(<App liveData={data} />)
  await user.click(nav('Settings')); await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
  expect(screen.getByRole('heading', { name: 'Try a resident journey' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Start sample journey' }))
  await user.click(screen.getByRole('button', { name: 'Select Sample Creek Water' }))
  await user.click(screen.getByRole('button', { name: 'Yes — watch this place' }))
  await user.click(nav('Places')); await user.click(screen.getByRole('button', { name: 'Remove Sample Creek Water' }))
  await user.click(screen.getByRole('button', { name: 'Exit sample' }))
  expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!)).toEqual(JSON.parse(before!))
})

it('retains deletion credentials and choices until server removal succeeds on retry', async () => {
  saved(); localStorage.setItem('water-alert:push-device:v1', JSON.stringify({ token: 'a'.repeat(43), signature: 'old' }))
  let fail = true
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: fail ? 503 : 200 })))
  try {
    const user = userEvent.setup(); render(<App liveData={data} />)
    await user.click(nav('Settings')); await user.click(screen.getByRole('button', { name: /Privacy and stored data/ }))
    await user.click(screen.getByRole('button', { name: 'Remove saved data' }))
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }))
    expect(localStorage.getItem('water-alert:push-device:v1')).not.toBeNull()
    expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([place.id])
    fail = false
    await user.click(screen.getByRole('button', { name: 'Confirm removal' }))
    expect(localStorage.getItem('water-alert:push-device:v1')).toBeNull()
    expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual([])
    expect(screen.getByRole('heading', { name: 'Follow water notices for your places.' })).toBeVisible()
  } finally { vi.unstubAllGlobals() }
})

it('allows keyboard-only entry to supplier selection and confirmation', async () => {
  const user = userEvent.setup(); render(<App liveData={data} />)
  screen.getByRole('button', { name: /My public water supplier/ }).focus()
  await user.keyboard('{Enter}')
  screen.getByRole('button', { name: 'Select Real supplier' }).focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Confirm your public water supplier' })).toBeVisible()
  screen.getByRole('button', { name: 'Yes — watch this place' }).focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'My Water' })).toBeVisible()
})

it('does not present a lifted deep-linked record as the active notice for that place', async () => {
  const fresh = new Date().toISOString()
  window.history.replaceState(null, '', '/?notice=old-lifted')
  render(<App liveData={{ ...data, sources: data.sources.map(s => s.agency === 'ADH' ? { ...s, lastSuccessAt: fresh } : s), archive: [notice, { ...notice, id: 'old-lifted', lifted: 'Oct 11, 2026' }] }} />)
  const detail = document.querySelector('.detail-status')!
  expect(detail).not.toHaveClass('boil')
  expect(detail.querySelector('.status-label')).toHaveTextContent('Agency explicitly lifted')
  expect(screen.getByText('Oct 11, 2026')).toBeVisible()
})

it('orders history by known app observation times and progressively reveals records', async () => {
  saved(); const user = userEvent.setup()
  const archive = Array.from({ length: 12 }, (_, i) => ({ ...notice, id: `record-${i}`, name: `Record ${i}`, lastObservedAt: new Date(Date.UTC(2026, 9, i + 1)).toISOString() }))
  render(<App liveData={{ ...data, archive }} />)
  await user.click(nav('History'))
  expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Record 11')
  expect(screen.queryByRole('heading', { name: 'Record 0' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Show more records/ }))
  expect(screen.getByRole('heading', { name: 'Record 0' })).toBeVisible()
})
