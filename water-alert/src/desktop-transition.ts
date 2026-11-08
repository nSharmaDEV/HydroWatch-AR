// Video-fitted gesture, not an Apple API/constant. Provenance, samples and
// uncertainty: IMPLEMENTATION-NOTES.md, "Measured Spaces motion — November 7".
const durationMs = 567
const x1 = .31, y1 = .24, x2 = .14, y2 = 1
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const cubic = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3

function parameter(value: number, a: number, b: number) {
  let low = 0, high = 1
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (cubic(mid, a, b) < value) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export function desktopTransition(remaining = 1) {
  const fraction = clamp(remaining)
  if (fraction === 0) return { duration: 0, at: () => 1 }
  // A finger-following swipe already covers part of the travel. Continue the
  // corresponding tail instead of replaying the full acceleration on release.
  const start = 1 - fraction
  const phase = start === 0 ? 0 : cubic(parameter(start, y1, y2), x1, x2)
  return {
    duration: durationMs * (1 - phase),
    at: (progress: number) => {
      if (progress <= 0) return 0
      if (progress >= 1) return 1
      const time = phase + (1 - phase) * progress
      return clamp((cubic(parameter(time, x1, x2), y1, y2) - start) / fraction)
    },
  }
}
