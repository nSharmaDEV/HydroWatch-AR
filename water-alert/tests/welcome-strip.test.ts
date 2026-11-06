import { expect, it } from 'vitest'
import { logoCurve, motifScale, motifStart, sampleAt, STRIP_WIDTH, stripPaths } from '../src/welcome-strip'

const seeds = [0, 1, 0xdeadbeef, 123456789]

it('follows the logo profile: shallow first crest, deep dip, taller second crest', () => {
  const ys = Array.from({ length: 1001 }, (_, i) => logoCurve(i / 1000))
  // SVG y grows downward, so crests are negative values.
  const firstCrest = Math.min(...ys.slice(0, 300))
  const dip = Math.max(...ys)
  const secondCrest = Math.min(...ys.slice(600))
  expect(firstCrest).toBeCloseTo(-0.3, 2)
  expect(dip).toBeCloseTo(1, 2)
  expect(secondCrest).toBeCloseTo(-1, 2)
  expect(Math.abs(secondCrest)).toBeGreaterThan(Math.abs(firstCrest) * 3)
  expect(logoCurve(0)).toBe(0); expect(logoCurve(1)).toBe(0)
})

it('is one continuous strip: no jumps between neighbouring slices, including motif joins', () => {
  for (const seed of seeds) {
    for (const offset of [0, 333.3, 5000, 123456.7]) {
      let previous = sampleAt(-8, offset, seed)
      for (let x = -7; x <= STRIP_WIDTH + 8; x += 1) {
        const s = sampleAt(x, offset, seed)
        for (const key of ['aquaTop', 'aquaBottom', 'tealTop', 'tealBottom'] as const) {
          expect(Math.abs(s[key] - previous[key])).toBeLessThan(2.5)
        }
        // Bands never cross or vanish: aqua sits above teal with a small gap.
        expect(s.aquaTop).toBeLessThan(s.aquaBottom)
        expect(s.aquaBottom).toBeLessThanOrEqual(s.tealTop)
        expect(s.tealTop).toBeLessThan(s.tealBottom)
        previous = s
      }
    }
  }
})

it('moves right to left: a later offset shows what was further right', () => {
  for (const seed of seeds) {
    const a = sampleAt(700, 100, seed)
    const b = sampleAt(600, 200, seed)
    expect(b.centre).toBeCloseTo(a.centre, 6)
  }
})

it('varies motif width and height slightly while keeping the shape', () => {
  for (const seed of seeds) {
    const widths = Array.from({ length: 40 }, (_, i) => motifStart(i + 1, seed) - motifStart(i, seed))
    const scales = Array.from({ length: 40 }, (_, i) => motifScale(i, seed))
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(580); expect(Math.max(...widths)).toBeLessThanOrEqual(880)
    expect(new Set(widths.map(w => Math.round(w))).size).toBeGreaterThan(30)
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(92); expect(Math.max(...scales)).toBeLessThanOrEqual(119)
    expect(new Set(scales.map(s => Math.round(s))).size).toBeGreaterThan(10)
  }
})

it('is deterministic for a seed and produces closed outlines', () => {
  expect(stripPaths(42, 7)).toEqual(stripPaths(42, 7))
  const { aqua, teal } = stripPaths(42, 7)
  expect(aqua).toMatch(/^M-8,[\d.-]+L.+Z$/); expect(teal).toMatch(/^M-8,[\d.-]+L.+Z$/)
})
