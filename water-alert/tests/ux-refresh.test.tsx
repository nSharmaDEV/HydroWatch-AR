import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ConfirmPlace, SearchPlace, WelcomeStrip } from '../src/Journey'
import { WATER_RIPPLE_EVENT } from '../src/HomeWater'
import { StatusCard } from '../src/components'
import { RecoveryActions } from '../src/RecoveryActions'
import { PushPanel } from '../src/PushPanel'
import { en } from '../src/strings'
import { defaults } from '../src/storage'
import { SOURCES, type Place } from '../src/domain'
import { es } from '../src/strings'

const place: Place = { id: 'ADH:test', name: 'TEST WATER SYSTEM', county: 'Benton', kind: 'system' }
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('shows a readable name and official source with check timing reserved for details', async () => {
  const at = '2026-10-18T12:00:00Z'
  render(<StatusCard place={place} source={{ agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null }} now={Date.parse(at)} t={en} onView={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Test Water System' })).toBeVisible()
  expect(screen.queryByText(/Last successful check/)).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: en.supplierAbout }))
  expect(within(screen.getByRole('dialog')).getByText(/Last successful check/)).toBeVisible()
  expect(within(screen.getByRole('dialog')).getByText(/7:00 AM CDT/)).toBeVisible()
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

it('lists at most three supplier matches with no extra instruction line', () => {
  const many: Place[] = Array.from({ length: 6 }, (_, i) => ({ id: `ADH:test-${i}`, name: `TEST WATER ${i}`, county: 'Benton', kind: 'system' }))
  const { container } = render(<SearchPlace kind="system" places={many} query="test water" t={en} onQuery={vi.fn()} onSelect={vi.fn()} onBack={vi.fn()} />)
  expect(container.querySelectorAll('.place-row')).toHaveLength(3)
  expect(screen.queryByText(/Choose your supplier explicitly/)).not.toBeInTheDocument()
  expect(container.querySelector('.info')).toBeNull()
  expect(container.querySelector('.search-stage > .welcome-strip')).not.toBeNull()
})

const confirm = (t = en) => render(<ConfirmPlace place={place} t={t} onConfirm={vi.fn()} onBack={vi.fn()} />)

it('draws a decorative teal and aqua wave strip behind the confirm card (no navy band)', () => {
  const { container } = confirm()
  const stage = container.querySelector('.search-stage')!
  expect([...stage.children].map(c => c.classList[0])).toEqual(['welcome-strip', 'panel'])
  const strip = stage.querySelector('.welcome-strip')!
  expect(strip).toHaveAttribute('aria-hidden', 'true')
  const bands = [...strip.querySelectorAll('path')]
  expect(bands.map(p => p.getAttribute('class'))).toEqual(['welcome-band welcome-band--aqua', 'welcome-band welcome-band--teal'])
  // Each band is filled by its own vertical gradient, and is drawn on mount.
  for (const band of bands) {
    const id = band.getAttribute('fill')!.match(/^url\(#(.+)\)$/)![1]
    expect(strip.querySelector(`linearGradient[id="${id}"]`)).not.toBeNull()
    expect(band.getAttribute('d')).toMatch(/^M.+Z$/)
  }
  expect(strip.querySelectorAll('stop[stop-color="#102f46"], stop[stop-color="#102e43"]')).toHaveLength(0)
})

function stubMotion(reduce: boolean) {
  const listeners = new Set<() => void>()
  const query = { matches: reduce, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return { set(value: boolean) { query.matches = value; listeners.forEach(fn => fn()) } }
}

it('animates the strip only when motion is allowed, and stops when reduced motion turns on', () => {
  const motion = stubMotion(false)
  let queued: FrameRequestCallback | null = null
  const raf = vi.fn((cb: FrameRequestCallback) => { queued = cb; return 1 })
  vi.stubGlobal('requestAnimationFrame', raf)
  vi.stubGlobal('cancelAnimationFrame', vi.fn(() => { queued = null }))
  const { container } = confirm()
  const teal = container.querySelector('.welcome-band--teal')!
  const first = teal.getAttribute('d')
  act(() => { queued!(1000) })
  act(() => { queued!(1500) })
  expect(teal.getAttribute('d')).not.toBe(first)
  act(() => motion.set(true))
  expect(queued).toBeNull()
  const still = teal.getAttribute('d')
  expect(still).toMatch(/^M.+Z$/)
})

it('shows a still strip under reduced motion', () => {
  stubMotion(true)
  const raf = vi.fn(() => 1)
  vi.stubGlobal('requestAnimationFrame', raf)
  const { container } = confirm()
  expect(raf).not.toHaveBeenCalled()
  expect(container.querySelector('.welcome-band--aqua')!.getAttribute('d')).toMatch(/^M.+Z$/)
})

it('draws a still, quieter strip (Settings) that never animates even when motion is allowed', () => {
  stubMotion(false)
  const raf = vi.fn(() => 1)
  vi.stubGlobal('requestAnimationFrame', raf)
  const { container } = render(<WelcomeStrip still />)
  expect(raf).not.toHaveBeenCalled()
  expect(container.querySelector('.welcome-strip')).toHaveClass('welcome-strip--still')
  expect(container.querySelector('.welcome-band--teal')!.getAttribute('d')).toMatch(/^M.+Z$/)
})

it('keeps the confirm step calm: no entrance ripple on the page water', () => {
  sessionStorage.clear()
  vi.useFakeTimers()
  const ripples: Event[] = []
  const listen = (event: Event) => ripples.push(event)
  window.addEventListener(WATER_RIPPLE_EVENT, listen)
  try {
    confirm()
    act(() => { vi.advanceTimersByTime(10000) })
    expect(ripples).toHaveLength(0)
  } finally {
    window.removeEventListener(WATER_RIPPLE_EVENT, listen)
    vi.useRealTimers()
  }
})
