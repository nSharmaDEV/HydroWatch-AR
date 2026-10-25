import { useEffect, useRef } from 'react'
import { createWaterSurface } from './water-surface'
import './home-water.css'

/** Decorative only: the canvas never receives events or contains page content. */
export function HomeWater() {
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
      if (motion.matches) return
      const surface = createWaterSurface(canvas)
      if (!surface) return
      canvas.hidden = false
      let frame = 0
      let lastMove = 0
      let lastPoint: { x: number; y: number } | undefined
      let nextAmbient = 0
      const ambientDelay = () => 1100 + Math.random() * 400
      const resize = () => {
        const box = host.getBoundingClientRect()
        try { surface.resize(box.width, box.height) }
        catch { lost() }
      }
      const animate = (now: number) => {
        if (document.hidden) return
        // Low-amplitude drops, not DOM layers, with no catch-up burst on return.
        if (!nextAmbient) nextAmbient = now + 400
        if (now >= nextAmbient) {
          surface.drop(.08 + Math.random() * .84, .08 + Math.random() * .84, .01)
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
        surface.drop((event.clientX - box.left) / box.width, 1 - (event.clientY - box.top) / box.height, .01)
      }
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || event.timeStamp - lastMove < 180) return
        if (lastPoint && Math.hypot(event.clientX - lastPoint.x, event.clientY - lastPoint.y) < 28) return
        lastMove = event.timeStamp
        lastPoint = { x: event.clientX, y: event.clientY }
        const box = host.getBoundingClientRect()
        if (!document.hidden && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) {
          surface.drop((event.clientX - box.left) / box.width, 1 - (event.clientY - box.top) / box.height, .002)
        }
      }
      const lost = () => { stop(); canvas.hidden = true }
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
      observer?.observe(main)
      window.addEventListener('resize', resize)
      main.addEventListener('pointerdown', drop, { passive: true })
      main.addEventListener('pointermove', move, { passive: true })
      document.addEventListener('visibilitychange', visibility)
      canvas.addEventListener('webglcontextlost', lost)
      stop = () => {
        cancelAnimationFrame(frame)
        observer?.disconnect()
        window.removeEventListener('resize', resize)
        main.removeEventListener('pointerdown', drop)
        main.removeEventListener('pointermove', move)
        document.removeEventListener('visibilitychange', visibility)
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
  }, [])
  return <div className="home-water" aria-hidden="true"><canvas ref={canvasRef} hidden /></div>
}
