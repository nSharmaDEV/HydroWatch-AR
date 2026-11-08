import { afterEach, expect, it, vi } from 'vitest'
import { createWaterSurface } from '../src/water-surface'

afterEach(() => vi.restoreAllMocks())

it('does not clear an unchanged drawing buffer and redraws a resized buffer immediately', () => {
  // Stub only the unavailable GPU boundary; exercise the real resize renderer.
  const draw = vi.fn()
  const gpu = new Proxy({}, { get: (_, key) => {
    if (key === 'drawArrays') return draw
    if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true
    if (String(key).startsWith('create')) return () => ({})
    return () => {}
  } })
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getContext').mockReturnValue(gpu as WebGLRenderingContext)
  const width = vi.spyOn(canvas, 'width', 'set')
  const height = vi.spyOn(canvas, 'height', 'set')
  const surface = createWaterSurface(canvas)!
  expect(surface).not.toBeNull()
  surface.resize(1000, 700)
  width.mockClear(); height.mockClear(); draw.mockClear()
  surface.resize(1000, 700)
  expect(width).not.toHaveBeenCalled()
  expect(height).not.toHaveBeenCalled()
  surface.resize(1000, 1000)
  expect(draw).toHaveBeenCalledTimes(1)
  surface.dispose()
})
