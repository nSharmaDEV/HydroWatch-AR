import { useEffect, useRef } from 'react'
import { createWaterSurface } from './water-surface'
import './home-water.css'

/** Window event other components may send (detail: viewport {x, y}) for one soft ripple. */
export const WATER_RIPPLE_EVENT = 'wave:water-ripple'
const RIPPLE_STRENGTH = .012

/** Decorative only: the canvas never receives events or contains page content. `paused` stops
 *  the surface and hides the canvas (the welcome screen has its own wave strip). */
export function HomeWater({ paused = false }: { paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const host = canvas.parentElement!
    const main = host.closest('main')!
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!motion) return // Prefer static decoration when motion preferences are unknown.
    let stop = () => {}
    const start = () => {
      stop()
      canvas.hidden = true
      if (paused || motion.matches) return
      const surface = createWaterSurface(canvas)
      if (!surface) return
      canvas.hidden = false
      let frame = 0
      let nextAmbient = 0
      const ambientDelay = () => 1000 + Math.random() * 1000
      const resize = () => {
        const box = host.getBoundingClientRect()
        try { surface.resize(box.width, box.height) }
        catch { lost() }
      }
      const animate = (now: number) => {
        if (document.hidden) return
        // Low-amplitude drops, not DOM layers, with no catch-up burst on return.
        if (!nextAmbient) nextAmbient = now + ambientDelay()
        if (now >= nextAmbient) {
          surface.drop(.08 + Math.random() * .84, .08 + Math.random() * .84, .005)
          nextAmbient = now + ambientDelay()
        }
        surface.frame(now)
        frame = requestAnimationFrame(animate)
      }
      const visibility = () => {
        cancelAnimationFrame(frame)
        nextAmbient = 0
        if (!document.hidden) frame = requestAnimationFrame(animate)
      }
      const drop = (event: PointerEvent) => {
        if (document.hidden || !event.isPrimary || event.button > 0) return
        const box = host.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return
        surface.drop((event.clientX - box.left) / box.width, 1 - (event.clientY - box.top) / box.height, .005)
      }
      const ripple = (event: Event) => {
        const { x, y } = (event as CustomEvent<{ x?: unknown; y?: unknown }>).detail ?? {}
        if (document.hidden || typeof x !== 'number' || typeof y !== 'number') return
        const box = host.getBoundingClientRect()
        if (!box.width || !box.height || x < box.left || x > box.right || y < box.top || y > box.bottom) return
        surface.drop((x - box.left) / box.width, 1 - (y - box.top) / box.height, RIPPLE_STRENGTH)
      }
      const lost = () => { stop(); canvas.hidden = true }
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
      observer?.observe(main)
      window.addEventListener('resize', resize)
      main.addEventListener('pointerdown', drop, { passive: true })
      document.addEventListener('visibilitychange', visibility)
      window.addEventListener(WATER_RIPPLE_EVENT, ripple)
      canvas.addEventListener('webglcontextlost', lost)
      stop = () => {
        cancelAnimationFrame(frame)
        observer?.disconnect()
        window.removeEventListener('resize', resize)
        main.removeEventListener('pointerdown', drop)
        document.removeEventListener('visibilitychange', visibility)
        window.removeEventListener(WATER_RIPPLE_EVENT, ripple)
        canvas.removeEventListener('webglcontextlost', lost)
        surface.dispose()
        stop = () => {}
      }
      resize()
      if (!document.hidden && !canvas.hidden) frame = requestAnimationFrame(animate)
    }
    start()
    motion.addEventListener('change', start)
    return () => { stop(); motion.removeEventListener('change', start) }
  }, [paused])
  return <div className="home-water" aria-hidden="true"><canvas ref={canvasRef} hidden /></div>
}
