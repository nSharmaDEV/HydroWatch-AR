import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LogoIntro from '../src/LogoIntro'

beforeEach(() => {
  sessionStorage.clear()
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('keeps the overlay through the completed-logo hold and removes it at 2510ms', () => {
  const { container } = render(<><LogoIntro /><button>Website ready</button></>)
  const overlay = container.querySelector('.logo-intro')!
  expect(overlay).toHaveAttribute('aria-hidden', 'true')
  expect(overlay.querySelectorAll('path').length).toBeGreaterThan(15)
  expect(overlay.querySelector('text, image, rect')).toBeNull()
  expect(screen.getByRole('button', { name: 'Website ready' })).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(2509))
  expect(container.querySelector('.logo-intro')).not.toBeNull()
  act(() => vi.advanceTimersByTime(1))
  expect(container.querySelector('.logo-intro')).toBeNull()
})

it('survives StrictMode effect replay and skips subsequent mounts in the session', () => {
  const first = render(<StrictMode><LogoIntro /></StrictMode>)
  expect(first.container.querySelector('.logo-intro')).not.toBeNull()
  act(() => vi.advanceTimersByTime(2510))
  first.unmount()
  const next = render(<LogoIntro />)
  expect(next.container.querySelector('.logo-intro')).toBeNull()
})

it('shows completed artwork briefly for reduced motion, then removes it', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  const { container } = render(<LogoIntro />)
  expect(container.querySelector('.logo-intro')).toHaveClass('logo-intro--reduced')
  act(() => vi.advanceTimersByTime(650))
  expect(container.querySelector('.logo-intro')).toBeNull()
})

it('finishes even when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  const { container } = render(<LogoIntro />)
  act(() => vi.advanceTimersByTime(2510))
  expect(container.querySelector('.logo-intro')).toBeNull()
})

it('clears its removal timer on early unmount', () => {
  const clear = vi.spyOn(window, 'clearTimeout')
  const schedule = vi.spyOn(window, 'setTimeout')
  const view = render(<LogoIntro />)
  const index = schedule.mock.calls.findIndex(call => call[1] === 2510)
  const timer = schedule.mock.results[index].value
  view.unmount()
  expect(clear).toHaveBeenCalledWith(timer)
})
