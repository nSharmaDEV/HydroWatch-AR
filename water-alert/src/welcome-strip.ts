// Geometry for the welcome screen's two-band wave strip (teal under aqua, the WAVE logo's
// colours without the navy band). Pure functions so the shape can be tested without a browser.
//
// The strip is one continuous run of "motifs". Every motif follows the logo's asymmetric
// profile: a shallow first crest, a deep dip, then a taller second crest, starting and ending
// on the centre line so neighbouring motifs join without a gap or jump. Motif width and height
// vary slightly per motif (seeded, so each motif keeps its size as it travels). The strip moves
// right to left by increasing `offset`; it never reverses.

export const STRIP_WIDTH = 1200
export const STRIP_HEIGHT = 420
const CENTRE = 210
const MOTIF_WIDTH = 730
const WIDTH_JITTER = 150
const STEP = 4

/** Logo profile: [phase, height] knots; -0.30 is the shallow first crest (SVG y grows down). */
const PROFILE: ReadonlyArray<readonly [number, number]> = [[0, 0], [0.15, -0.30], [0.43, 1], [0.80, -1], [1, 0]]

/** Deterministic 0..1 hash of an integer index for a given seed. */
export function randomAt(index: number, seed: number) {
  let value = Math.imul(index ^ seed, 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000
}

export function motifStart(index: number, seed: number) {
  return index * MOTIF_WIDTH + (randomAt(index, seed) - 0.5) * WIDTH_JITTER
}

/** Motif height scale in viewBox units (92–119). */
export function motifScale(index: number, seed: number) {
  return 92 + 27 * randomAt(index + 4096, seed)
}

/** Smooth (smoothstep) interpolation through the profile knots; phase in [0, 1]. */
export function logoCurve(phase: number) {
  const p = Math.min(1, Math.max(0, phase))
  let segment = PROFILE.findIndex(([position]) => position > p)
  if (segment < 1) segment = PROFILE.length - 1
  const [left, from] = PROFILE[segment - 1]
  const [right, to] = PROFILE[segment]
  const t = (p - left) / (right - left)
  return from + (to - from) * t * t * (3 - 2 * t)
}

export interface StripSample { x: number; centre: number; aquaTop: number; aquaBottom: number; tealTop: number; tealBottom: number }

/** One vertical slice of the strip at viewBox x for a given travel offset. */
export function sampleAt(x: number, offset: number, seed: number): StripSample {
  const worldX = x + offset
  let index = Math.floor((worldX + WIDTH_JITTER / 2) / MOTIF_WIDTH)
  if (worldX < motifStart(index, seed)) index--
  const start = motifStart(index, seed)
  const phase = (worldX - start) / (motifStart(index + 1, seed) - start)
  const centre = CENTRE + motifScale(index, seed) * logoCurve(phase)
  // Bands swell through the motif and thin at the joins, and trade thickness through the dip
  // like the logo's strands.
  const taper = Math.sin(Math.PI * phase) ** 2
  const fold = Math.sin(2 * Math.PI * (phase - 0.15))
  const tealWidth = 20 + taper * (33 + 13 * fold)
  const aquaWidth = 13 + taper * (25 - 12 * fold)
  const split = 5 + taper * (11 - 8 * fold)
  return { x, centre, aquaTop: centre - split - aquaWidth, aquaBottom: centre - split, tealTop: centre, tealBottom: centre + tealWidth }
}

function outline(top: Array<[number, number]>, bottom: Array<[number, number]>) {
  return 'M' + top.concat(bottom.reverse()).map(([x, y]) => `${x},${y.toFixed(1)}`).join('L') + 'Z'
}

/** SVG path data for both bands at a travel offset. */
export function stripPaths(offset: number, seed: number) {
  const aquaTop: Array<[number, number]> = [], aquaBottom: Array<[number, number]> = []
  const tealTop: Array<[number, number]> = [], tealBottom: Array<[number, number]> = []
  for (let x = -8; x <= STRIP_WIDTH + 8; x += STEP) {
    const s = sampleAt(x, offset, seed)
    aquaTop.push([x, s.aquaTop]); aquaBottom.push([x, s.aquaBottom])
    tealTop.push([x, s.tealTop]); tealBottom.push([x, s.tealBottom])
  }
  return { aqua: outline(aquaTop, aquaBottom), teal: outline(tealTop, tealBottom) }
}

/** Travel speed in viewBox units per millisecond (right to left). */
export const STRIP_SPEED = 0.048
/** Longest frame step applied, so a stalled tab never makes the strip jump. */
export const STRIP_MAX_STEP_MS = 48
