import { describe, expect, it } from 'vitest'
import { desktopTransition } from '../src/desktop-transition'

describe('video-fitted desktop transition', () => {
  it('matches the observed gesture text positions rather than symmetric easing', () => {
    const transition = desktopTransition()
    expect(transition.duration).toBe(567)
    for (const [ms, observed] of [[100, .296], [167, .582], [267, .833], [367, .953], [467, .991]]) {
      expect(Math.abs(transition.at(ms / transition.duration) - observed)).toBeLessThan(.025)
    }
  })

  it('uses the remaining measured tail after a partial swipe', () => {
    const full = desktopTransition()
    const remaining = 1 - full.at(.5)
    const tail = desktopTransition(remaining)
    expect(tail.duration).toBeGreaterThan(200)
    expect(tail.duration).toBeCloseTo(full.duration / 2, 1)
    expect(tail.at(.5)).toBeCloseTo((full.at(.75) - full.at(.5)) / remaining, 4)
  })

  it('is bounded and monotonic, including short finishes and exact endpoints', () => {
    for (const remaining of [1, .5, .01]) {
      const transition = desktopTransition(remaining)
      expect(transition.at(0)).toBe(0)
      expect(transition.at(1)).toBe(1)
      let previous = 0
      for (let i = 1; i <= 100; i++) {
        const value = transition.at(i / 100)
        expect(value).toBeGreaterThanOrEqual(previous)
        expect(value).toBeLessThanOrEqual(1)
        previous = value
      }
    }
  })
})
