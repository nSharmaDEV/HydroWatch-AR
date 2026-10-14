// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { startChecking } from '../server/scheduler'

afterEach(() => vi.useRealTimers())
it('checks on startup and every five minutes, and stops cleanly', async () => {
  vi.useFakeTimers()
  let checks = 0
  const stop = startChecking(async () => { checks++ })
  await vi.advanceTimersByTimeAsync(0)
  expect(checks).toBe(1)
  await vi.advanceTimersByTimeAsync(299_999)
  expect(checks).toBe(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(checks).toBe(2)
  stop()
  await vi.advanceTimersByTimeAsync(300_000)
  expect(checks).toBe(2)
})
it('does not overlap slow checks and continues after errors', async () => {
  vi.useFakeTimers()
  let checks = 0
  let release!: () => void
  const stop = startChecking(async () => {
    checks++
    if (checks === 1) await new Promise<void>(resolve => { release = resolve })
    else throw new Error('offline')
  })
  await vi.advanceTimersByTimeAsync(600_000)
  expect(checks).toBe(1)
  release()
  await vi.advanceTimersByTimeAsync(300_000)
  expect(checks).toBe(2)
  await vi.advanceTimersByTimeAsync(300_000)
  expect(checks).toBe(3)
  stop()
})
