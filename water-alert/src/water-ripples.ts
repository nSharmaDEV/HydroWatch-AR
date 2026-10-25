/** Bounded, time-based wavefronts shared by desktop and mobile rendering. */
export function createRippleField() {
  type Ripple = { x: number; y: number; strength: number; age: number }
  let waves: Ripple[] = []
  return {
    drop(x: number, y: number, strength: number) {
      // Keep input responsive without an unbounded trail of overlapping rings.
      if (waves.length === 8) {
        const weakest = waves.reduce((best, wave, index) =>
          wave.strength < waves[best].strength ? index : best, 0)
        waves.splice(weakest, 1)
      }
      waves.push({ x, y, strength: Math.min(1, Math.max(0, strength / .01)), age: 0 })
    },
    advance(milliseconds: number) {
      waves.forEach(wave => { wave.age += Math.max(0, milliseconds) / 1000 })
      waves = waves.filter(wave => wave.age < 6)
      const packed = new Float32Array(32)
      waves.forEach((wave, index) => {
        const appear = Math.min(1, wave.age / .2)
        const fade = Math.pow(1 - wave.age / 6, 2)
        packed.set([wave.x, wave.y, 8 + wave.age * 90, wave.strength * appear * fade], index * 4)
      })
      return packed
    },
  }
}
