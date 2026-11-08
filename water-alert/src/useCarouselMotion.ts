import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { desktopTransition } from './desktop-transition'

type Drag = { id: number; x: number; y: number; origin: number; lastX: number; lastTime: number; velocity: number; locked: boolean }
const interactive = 'button,a,input,textarea,select,summary,[contenteditable],[role="button"],[role="slider"],dialog'

/** Imperative transforms keep drag/animation frames out of React rendering. */
export function useCarouselMotion(count: number) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const motion = useRef({ x: 0, step: 0, frame: 0 })
  const reducedMotion = useRef<MediaQueryList | null>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)

  const paint = useCallback(() => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${motion.current.x}px, 0, 0)`
  }, [])
  const stop = useCallback(() => {
    cancelAnimationFrame(motion.current.frame)
    motion.current.frame = 0
  }, [])
  const settle = useCallback((released = false) => {
    stop()
    const m = motion.current
    const target = -indexRef.current * m.step
    const origin = m.x
    const distance = target - origin
    if (reducedMotion.current?.matches || !m.step || distance === 0) {
      m.x = target
      paint()
      return
    }
    const transition = desktopTransition(released ? Math.abs(distance) / m.step : 1)
    const started = performance.now()
    const frame = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - started) / transition.duration))
      m.x = origin + distance * transition.at(progress)
      if (progress === 1) {
        m.x = target
        m.frame = 0
        paint()
      } else {
        paint()
        m.frame = requestAnimationFrame(frame)
      }
    }
    m.frame = requestAnimationFrame(frame)
  }, [paint, stop])

  const showIndex = useCallback((target: number, released = false) => {
    const next = Math.max(0, Math.min(Math.max(0, count - 1), target))
    const track = trackRef.current
    const focused = document.activeElement
    if (next !== indexRef.current && focused instanceof HTMLElement && track?.contains(focused) && focused !== track) track.focus({ preventScroll: true })
    indexRef.current = next
    setIndex(next)
    settle(released)
  }, [count, settle])

  useLayoutEffect(() => {
    const track = trackRef.current!
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    reducedMotion.current = media ?? null
    const preference = () => {
      if (!drag.current) settle()
    }
    preference()
    media?.addEventListener('change', preference)
    const measure = () => {
      const m = motion.current
      const step = track.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0)
      if (step === m.step) return // Expanded content must not restart horizontal motion.
      stop()
      drag.current = null
      m.step = step
      m.x = -indexRef.current * step
      paint()
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(track)
    return () => { stop(); observer?.disconnect(); media?.removeEventListener('change', preference) }
  }, [paint, settle, stop])

  useLayoutEffect(() => {
    drag.current = null
    showIndex(Math.min(indexRef.current, count - 1))
  }, [count, showIndex])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false
    if (count < 2 || drag.current || event.isPrimary === false || event.button !== 0 || (event.target as Element).closest(interactive)) return
    stop()
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: motion.current.x, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, locked: false }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const dx = event.clientX - d.x, dy = event.clientY - d.y
    if (!d.locked) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return
      if (Math.abs(dy) >= Math.abs(dx)) { drag.current = null; settle(true); return }
      d.locked = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    suppressClick.current = true
    const elapsed = event.timeStamp - d.lastTime
    if (elapsed > 0) d.velocity = Math.max(-2400, Math.min(2400, (event.clientX - d.lastX) / elapsed * 1000))
    d.lastX = event.clientX
    d.lastTime = event.timeStamp
    const m = motion.current
    const raw = d.origin + dx
    const edge = Math.max(-(count - 1) * m.step, Math.min(0, raw))
    m.x = edge
    paint()
  }
  const finish = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const d = drag.current
    if (!d || event.pointerId !== d.id) return
    drag.current = null
    if (d.locked && !cancelled) {
      const velocity = event.timeStamp - d.lastTime > 100 ? 0 : d.velocity
      const displacement = motion.current.x - d.origin
      const projected = displacement + velocity * .18
      const direction = Math.abs(projected) > motion.current.step * .22 ? (projected < 0 ? 1 : -1) : 0
      showIndex(indexRef.current + direction, true)
    } else settle(true)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return { trackRef, index, indexRef, showIndex, pointerHandlers: {
    onPointerDown, onPointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => finish(event),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => finish(event, true),
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
      // Touch begins with implicit capture on the touched descendant. Transferring
      // that capture to the track is not a cancelled gesture.
      if (event.target === event.currentTarget) finish(event, true)
    },
    onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false }
    },
  } }
}
