import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Welcome } from '../src/Journey'
import { StatusCard } from '../src/components'
import { RecoveryActions } from '../src/RecoveryActions'
import { PushPanel } from '../src/PushPanel'
import { en } from '../src/strings'
import { defaults } from '../src/storage'
import { SOURCES, type Place } from '../src/domain'

const place: Place = { id: 'ADH:test', name: 'TEST WATER SYSTEM', county: 'Benton', kind: 'system' }
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('puts choices before collapsed coverage and keeps the concise safety qualification', () => {
  render(<Welcome t={en} onSearch={() => {}} onWell={() => {}} onSample={() => {}} />)
  expect(screen.getByText('Check published water advisories for your Arkansas water supplier or lake.')).toBeVisible()
  expect(screen.getByText('Published notices are not a water safety test.')).toBeVisible()
  expect(screen.getByText('About WAVE', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
})

it('shows a readable name, successful check and official source before secondary tools', () => {
  const at = '2026-10-18T12:00:00Z'
  render(<StatusCard place={place} source={{ agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null }} now={Date.parse(at)} t={en} onView={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Test Water System' })).toBeVisible()
  expect(screen.getByText(/Last successful check/)).toBeVisible()
  expect(screen.getAllByText(/7:00 AM CDT/).some(el => !el.closest('dialog'))).toBe(true)
  expect(screen.getByRole('link', { name: /View official source/ })).toHaveAttribute('href', SOURCES.ADH)
})

it('opens templates only after choosing a task and retains edits when switching tasks', async () => {
  const user = userEvent.setup()
  render(<RecoveryActions place={place} language="en" sample={false} />)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  const select = screen.getByRole('combobox', { name: 'What do you need help with?' })
  await user.selectOptions(select, 'service')
  const body = screen.getByRole('textbox', { name: 'Draft body' })
  expect((body as HTMLTextAreaElement).value).toContain('whether my service address is affected')
  await user.clear(body); await user.type(body, 'My service question')
  await user.selectOptions(select, 'request')
  expect((screen.getByRole('textbox', { name: 'Draft body' }) as HTMLTextAreaElement).value).toContain('not stating that compensation is automatically owed')
  await user.selectOptions(select, 'service')
  expect(screen.getByRole('textbox', { name: 'Draft body' })).toHaveValue('My service question')
})

function push() { return render(<PushPanel mode="live" prefs={{ ...defaults(), watches: [place.id] }} t={en} onChange={() => {}} />) }
function supported() {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission: 'default' })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
}
it('ends a stalled configuration check with a retry action', async () => {
  supported(); vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  push()
  expect(screen.getByText(en.pushChecking)).toBeVisible()
  await act(async () => { vi.advanceTimersByTime(10_000) })
  expect(screen.queryByText(en.pushChecking)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Retry configuration/ })).toBeEnabled()
})
it.each([
  ['ready', { enabled: true, publicKey: 'key' }, 200],
  ['unavailable', { enabled: false, publicKey: null }, 200],
  ['error', {}, 503],
  ['error', { enabled: true }, 200],
] as const)('renders explicit %s configuration state', async (state, value, status) => {
  supported()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(value), { status })))
  push()
  const controls = await screen.findByTestId('push-controls')
  await vi.waitFor(() => expect(controls).toHaveAttribute('data-state', state))
  expect(within(controls).getByText(/Delivery has not been verified/)).toBeVisible()
})
it('explains unsupported browsers without waiting for configuration', () => {
  vi.stubGlobal('isSecureContext', false)
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  push()
  expect(screen.getByText(en.pushUnsupported)).toBeVisible()
  expect(screen.queryByText(en.pushChecking)).not.toBeInTheDocument()
})
it('retries a failed configuration read successfully', async () => {
  supported()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ enabled: true, publicKey: 'key' }))))
  push()
  await userEvent.setup().click(await screen.findByRole('button', { name: /Retry configuration/ }))
  await vi.waitFor(() => expect(screen.getByTestId('push-controls')).toHaveAttribute('data-state', 'ready'))
})
