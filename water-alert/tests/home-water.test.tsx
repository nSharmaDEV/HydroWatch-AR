import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomeWater, WATER_RIPPLE_EVENT } from '../src/HomeWater'
import { createWaterSurface } from '../src/water-surface'

vi.mock('../src/water-surface', () => ({ createWaterSurface: vi.fn() }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function motion(reduced = false) {
  const media = new EventTarget()
  Object.assign(media, { matches: reduced, addListener: vi.fn(), removeListener: vi.fn() })
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  return media
}

it.each(['running', 'paused'])('waits for %s expanding layout to settle before resizing water and skips unchanged sizes', playState => {
  vi.useFakeTimers()
  motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  let notify = () => {}
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback }
    observe() {}
    disconnect() {}
  })
  let height = 700
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: height, width: 1000, height, toJSON() {} }))
  try {
    const { unmount } = render(<main><HomeWater /></main>)
    expect(surface.resize).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 15; i++) {
      height += 20
      act(() => { notify(); vi.advanceTimersByTime(16) })
    }
    expect(surface.resize).toHaveBeenCalledTimes(1)
    const main = document.querySelector('main')!
    let expanding = true
    Object.defineProperty(main, 'getAnimations', { value: () => expanding ? [{ playState, effect: { getKeyframes: () => [{ height: '0px' }, { height: '1000px' }] } }] : [] })
    act(() => { vi.advanceTimersByTime(150) })
    expect(surface.resize).toHaveBeenCalledTimes(1)
    expanding = false
    act(() => { vi.advanceTimersByTime(150) })
    expect(surface.resize).toHaveBeenLastCalledWith(1000, 1000)
    expect(surface.resize).toHaveBeenCalledTimes(2)
    act(() => { notify(); vi.advanceTimersByTime(150) })
    expect(surface.resize).toHaveBeenCalledTimes(2)
    notify()
    unmount()
    act(() => { vi.advanceTimersByTime(150) })
    expect(surface.resize).toHaveBeenCalledTimes(2)
  } finally { vi.useRealTimers() }
})

it('keeps a decorative static fallback when WebGL is unavailable', () => {
  motion()
  vi.mocked(createWaterSurface).mockReturnValue(null)
  render(<main><HomeWater /><button>Open map</button></main>)
  expect(document.querySelector('.home-water')).toHaveAttribute('aria-hidden', 'true')
  expect(document.querySelector('canvas')).not.toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Open map' }))
  expect(screen.getByRole('button', { name: 'Open map' })).toBeEnabled()
})

it('does not initialize animation for reduced motion', () => {
  motion(true)
  vi.mocked(createWaterSurface).mockClear()
  render(<main><HomeWater /></main>)
  expect(createWaterSurface).not.toHaveBeenCalled()
  expect(document.querySelector('canvas')).not.toBeVisible()
})

it('uses the static fallback when motion preferences cannot be checked', () => {
  vi.stubGlobal('matchMedia', undefined)
  vi.mocked(createWaterSurface).mockClear()
  render(<main><HomeWater /></main>)
  expect(createWaterSurface).not.toHaveBeenCalled()
  expect(document.querySelector('canvas')).not.toBeVisible()
})

it('cleans up GPU resources on navigation and on a changed motion preference', () => {
  const media = motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  const { unmount } = render(<main><HomeWater /></main>)
  expect(document.querySelector('canvas')).toBeVisible()
  Object.assign(media, { matches: true })
  act(() => { media.dispatchEvent(new Event('change')) })
  expect(surface.dispose).toHaveBeenCalledTimes(1)
  expect(document.querySelector('canvas')).not.toBeVisible()
  unmount()
  expect(surface.dispose).toHaveBeenCalledTimes(1)
})

it('stops and hides the ripples while paused (the welcome screen), then resumes', () => {
  motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockClear().mockReturnValue(surface)
  const { rerender } = render(<main><HomeWater /></main>)
  expect(document.querySelector('canvas')).toBeVisible()
  rerender(<main><HomeWater paused /></main>)
  expect(surface.dispose).toHaveBeenCalledTimes(1)
  expect(document.querySelector('canvas')).not.toBeVisible()
  expect(createWaterSurface).toHaveBeenCalledTimes(1)
  rerender(<main><HomeWater /></main>)
  expect(createWaterSurface).toHaveBeenCalledTimes(2)
  expect(document.querySelector('canvas')).toBeVisible()
})

it('pauses hidden tabs and leaves touch scrolling and controls alone', () => {
  motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  let callback: FrameRequestCallback = () => {}
  const request = vi.fn((next: FrameRequestCallback) => { callback = next; return 42 })
  const cancel = vi.fn()
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, top: 100, left: 0, right: 1000, bottom: 800, width: 1000, height: 700, toJSON() {} })
  const { unmount } = render(<main><HomeWater /><button>Open map</button></main>)
  callback(100)
  expect(surface.frame).toHaveBeenCalledWith(100)
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  expect(cancel).toHaveBeenCalledWith(42)
  const calls = request.mock.calls.length
  callback(200)
  expect(request).toHaveBeenCalledTimes(calls)
  hidden.mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  expect(request).toHaveBeenCalledTimes(calls + 1)
  const touch = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.assign(touch, { pointerType: 'touch', clientX: 100, clientY: 200, isPrimary: true, button: 0 })
  screen.getByRole('button').dispatchEvent(touch)
  expect(touch.defaultPrevented).toBe(false)
  expect(surface.drop).toHaveBeenCalledWith(.1, 1 - 100 / 700, .005)
  const touchMove = new Event('pointermove', { bubbles: true, cancelable: true })
  Object.assign(touchMove, { pointerType: 'touch', clientX: 100, clientY: 230 })
  screen.getByRole('button').dispatchEvent(touchMove)
  expect(surface.drop).toHaveBeenCalledTimes(1)
  unmount()
  expect(surface.dispose).toHaveBeenCalledTimes(1)
})

it('drops only on a physical press, never while the mouse merely moves', () => {
  motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, top: 100, left: 0, right: 1000, bottom: 800, width: 1000, height: 700, toJSON() {} })
  render(<main><HomeWater /></main>)
  for (const [x, y] of [[100, 200], [400, 300], [700, 500]] as const) {
    const move = new Event('pointermove', { bubbles: true, cancelable: true })
    Object.assign(move, { pointerType: 'mouse', clientX: x, clientY: y, isPrimary: true })
    document.querySelector('main')!.dispatchEvent(move)
  }
  expect(surface.drop).not.toHaveBeenCalled()
  const press = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.assign(press, { pointerType: 'mouse', clientX: 400, clientY: 300, isPrimary: true, button: 0 })
  document.querySelector('main')!.dispatchEvent(press)
  expect(surface.drop).toHaveBeenCalledTimes(1)
  expect(surface.drop).toHaveBeenCalledWith(.4, 1 - 200 / 700, .005)
})

it('turns a ripple request into one soft drop where it was asked for, and ignores it once stopped', () => {
  const media = motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, top: 100, left: 0, right: 1000, bottom: 800, width: 1000, height: 700, toJSON() {} })
  render(<main><HomeWater /></main>)
  act(() => { window.dispatchEvent(new CustomEvent(WATER_RIPPLE_EVENT, { detail: { x: 500, y: 240 } })) })
  expect(surface.drop).toHaveBeenCalledTimes(1)
  expect(surface.drop).toHaveBeenCalledWith(.5, 1 - 140 / 700, .012)
  // Malformed or off-page requests are ignored.
  act(() => { window.dispatchEvent(new CustomEvent(WATER_RIPPLE_EVENT, { detail: { x: 'a', y: 240 } })) })
  act(() => { window.dispatchEvent(new CustomEvent(WATER_RIPPLE_EVENT, { detail: { x: 500, y: 20 } })) })
  expect(surface.drop).toHaveBeenCalledTimes(1)
  // Reduced motion switched on: the surface is gone and requests do nothing.
  Object.assign(media, { matches: true })
  act(() => { media.dispatchEvent(new Event('change')) })
  act(() => { window.dispatchEvent(new CustomEvent(WATER_RIPPLE_EVENT, { detail: { x: 500, y: 240 } })) })
  expect(surface.drop).toHaveBeenCalledTimes(1)
})

it('never draws a requested ripple under reduced motion', () => {
  motion(true)
  vi.mocked(createWaterSurface).mockClear()
  render(<main><HomeWater /></main>)
  window.dispatchEvent(new CustomEvent(WATER_RIPPLE_EVENT, { detail: { x: 500, y: 240 } }))
  expect(createWaterSurface).not.toHaveBeenCalled()
})

it('never drops on its own: ripples start only from a press, and keep animating afterwards', () => {
  motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  let callback: FrameRequestCallback = () => {}
  vi.stubGlobal('requestAnimationFrame', vi.fn(next => { callback = next; return 42 }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, top: 100, left: 0, right: 1000, bottom: 800, width: 1000, height: 700, toJSON() {} })
  render(<main><HomeWater /></main>)
  for (let now = 100; now <= 10_100; now += 16) callback(now)
  expect(surface.drop).not.toHaveBeenCalled()
  const press = new Event('pointerdown', { bubbles: true, cancelable: true })
  Object.assign(press, { pointerType: 'mouse', clientX: 400, clientY: 300, isPrimary: true, button: 0 })
  document.querySelector('main')!.dispatchEvent(press)
  expect(surface.drop).toHaveBeenCalledTimes(1)
  const frames = surface.frame.mock.calls.length
  callback(10_200)
  expect(surface.frame).toHaveBeenCalledTimes(frames + 1)
  expect(surface.drop).toHaveBeenCalledTimes(1)
})
