import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Welcome } from '../src/Journey'
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

it('puts choices before collapsed coverage and keeps the concise safety qualification', () => {
  render(<Welcome t={en} onSearch={() => {}} onWell={() => {}} onSample={() => {}} />)
  expect(screen.getByRole('heading', { level: 1, name: 'How do you get your water?' })).toBeVisible()
  // The heading's question replaces the old, repetitive intro line.
  expect(screen.queryByText(en.welcomeIntro)).not.toBeInTheDocument()
  expect(screen.getByText('Published notices are not a water safety test.')).toBeVisible()
  // About WAVE now lives on the Sources page; the welcome card stays focused on the choice.
  expect(screen.queryByText('About WAVE')).not.toBeInTheDocument()
})

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

it('centres the question and subtitle above the unchanged choices, with no glossary', async () => {
  const onSearch = vi.fn(), onWell = vi.fn(), onSample = vi.fn()
  const { container } = render(<Welcome t={en} onSearch={onSearch} onWell={onWell} onSample={onSample} />)
  expect(screen.getByRole('heading', { level: 1, name: en.welcome })).toBeVisible()
  expect(screen.getByText('Choose your water source to find relevant notices and guidance.')).toHaveClass('welcome-subtitle')
  expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  // Reading order: question, subtitle, choices, safety note. No glossary or About section.
  const panel = container.querySelector('.panel.welcome')!
  expect([...panel.children].map(el => el.className)).toEqual(['welcome-title', 'welcome-subtitle', 'welcome-options', 'quiet-note'])
  expect(screen.queryByRole('list', { name: 'What WAVE stands for' })).not.toBeInTheDocument()
  expect(container.querySelector('details')).toBeNull()
  // The three buttons keep their order, text and behaviour; the first stays primary.
  expect(screen.getAllByRole('button').map(b => b.className)).toEqual(['welcome-option welcome-option--primary', 'welcome-option welcome-option--secondary', 'welcome-option welcome-option--sample'])
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /My public water supplier/ }))
  await user.click(screen.getByRole('button', { name: "I'm on a private well" }))
  await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
  expect(onSearch).toHaveBeenCalledWith('system'); expect(onWell).toHaveBeenCalled(); expect(onSample).toHaveBeenCalled()
})

it('shows the Spanish subtitle', () => {
  render(<Welcome t={es} onSearch={vi.fn()} onWell={vi.fn()} onSample={vi.fn()} />)
  expect(screen.getByRole('heading', { level: 1, name: es.welcome })).toBeVisible()
  expect(screen.getByText('Elige tu fuente de agua para ver avisos y orientación relevantes.')).toBeVisible()
})

it('draws a decorative teal and aqua wave strip behind the card (no navy band)', () => {
  const { container } = render(<Welcome t={en} onSearch={vi.fn()} onWell={vi.fn()} onSample={vi.fn()} />)
  const stage = container.querySelector('.welcome-stage')!
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
  const { container } = render(<Welcome t={en} onSearch={vi.fn()} onWell={vi.fn()} onSample={vi.fn()} />)
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
  const { container } = render(<Welcome t={en} onSearch={vi.fn()} onWell={vi.fn()} onSample={vi.fn()} />)
  expect(raf).not.toHaveBeenCalled()
  expect(container.querySelector('.welcome-band--aqua')!.getAttribute('d')).toMatch(/^M.+Z$/)
})

it('keeps the welcome calm: no entrance ripple on the page water', () => {
  sessionStorage.clear()
  vi.useFakeTimers()
  const ripples: Event[] = []
  const listen = (event: Event) => ripples.push(event)
  window.addEventListener(WATER_RIPPLE_EVENT, listen)
  try {
    render(<Welcome t={en} onSearch={vi.fn()} onWell={vi.fn()} onSample={vi.fn()} />)
    act(() => { vi.advanceTimersByTime(10000) })
    expect(ripples).toHaveLength(0)
  } finally {
    window.removeEventListener(WATER_RIPPLE_EVENT, listen)
    vi.useRealTimers()
  }
})
