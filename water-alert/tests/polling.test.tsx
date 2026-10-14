import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../src/App'

afterEach(() => vi.useRealTimers())
it('reloads live observations every thirty seconds and stops in sample mode', async () => {
  vi.useFakeTimers()
  let reads = 0
  const view = render(<App onLiveOpen={async () => { reads++ }} />)
  expect(reads).toBe(1)
  await act(() => vi.advanceTimersByTimeAsync(30_000))
  expect(reads).toBe(2)
  fireEvent.click(screen.getByRole('button', { name: 'Try sample mode' }))
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(reads).toBe(2)
  view.unmount()
})
it('never reads the live server when launched in sample mode', async () => {
  vi.useFakeTimers()
  localStorage.setItem('water-alert:mode', 'sample')
  let reads = 0
  render(<App onLiveOpen={async () => { reads++ }} />)
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(reads).toBe(0)
})
