import { describe, expect, it } from 'vitest'
import { createRippleField } from '../src/water-ripples'

describe('calm water wavefronts', () => {
  it('starts at the input point and expands at a consistent CSS-pixel speed', () => {
    const field = createRippleField()
    field.drop(.2, .7, .01)
    const first = field.advance(200)
    const later = field.advance(500)
    expect(Array.from(first.slice(0, 2))).toEqual([expect.closeTo(.2), expect.closeTo(.7)])
    expect(later[2] - first[2]).toBeCloseTo(45)
    expect(later[3]).toBeGreaterThan(0)
  })

  it('fades fully to a clean still surface rather than leaving simulation noise', () => {
    const field = createRippleField()
    field.drop(.5, .5, .01)
    const young = field.advance(250)
    const old = field.advance(4000)
    expect(old[3]).toBeLessThan(young[3])
    expect(Array.from(field.advance(2000))).toEqual(Array(32).fill(0))
  })

  it('keeps a cursor wake weaker than a deliberate drop and bounds overlapping waves', () => {
    const field = createRippleField()
    field.drop(.2, .3, .002)
    field.drop(.4, .5, .01)
    const waves = field.advance(250)
    expect(waves[3]).toBeLessThan(waves[7] / 3)
    for (let i = 0; i < 100; i++) field.drop(.5, .5, .002)
    expect(field.advance(16)).toHaveLength(32)
    expect(Array.from(field.advance(7000))).toEqual(Array(32).fill(0))
  })
})
