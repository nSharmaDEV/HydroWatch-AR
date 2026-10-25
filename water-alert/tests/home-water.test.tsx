import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomeWater } from '../src/HomeWater'
import { createWaterSurface } from '../src/water-surface'

vi.mock('../src/water-surface', () => ({ createWaterSurface: vi.fn() }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function motion(reduced = false) {
  const media = new EventTarget()
  Object.assign(media, { matches: reduced, addListener: vi.fn(), removeListener: vi.fn() })
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  return media
}

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
  expect(surface.drop).toHaveBeenCalledWith(.1, 1 - 100 / 700, .01)
  const touchMove = new Event('pointermove', { bubbles: true, cancelable: true })
  Object.assign(touchMove, { pointerType: 'touch', clientX: 100, clientY: 230 })
  screen.getByRole('button').dispatchEvent(touchMove)
  expect(surface.drop).toHaveBeenCalledTimes(1)
  unmount()
  expect(surface.dispose).toHaveBeenCalledTimes(1)
})

it('starts soft ambient motion promptly and overlaps waves continuously without input', () => {
  motion()
  const surface = { resize: vi.fn(), drop: vi.fn(), frame: vi.fn(), dispose: vi.fn() }
  vi.mocked(createWaterSurface).mockReturnValue(surface)
  let callback: FrameRequestCallback = () => {}
  vi.stubGlobal('requestAnimationFrame', vi.fn(next => { callback = next; return 42 }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(1)
    .mockReturnValueOnce(1).mockReturnValueOnce(1).mockReturnValue(.5)
  render(<main><HomeWater /></main>)
  callback(100)
  callback(499)
  expect(surface.drop).not.toHaveBeenCalled()
  callback(500)
  expect(surface.drop).toHaveBeenNthCalledWith(1, .08, .08, .01)
  callback(1999)
  expect(surface.drop).toHaveBeenCalledTimes(1)
  callback(2000)
  expect(surface.drop.mock.calls[1][0]).toBeCloseTo(.92)
  expect(surface.drop.mock.calls[1][1]).toBeCloseTo(.92)
  expect(surface.drop.mock.calls[1][2]).toBe(.01)
})
