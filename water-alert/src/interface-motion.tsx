import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { disclosureSlide, type SlideSnapshot } from './disclosure-slide'
import './interface-motion.css'

// The same video-fitted curve as the supplier carousel, with shorter travel/timing.
const easing = 'cubic-bezier(.31,.24,.14,1)'
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
type Direction = 'tab' | 'forward' | 'back'
type NativeTransition = { finished: Promise<void>; ready: Promise<void>; skipTransition: () => void }
type TransitionDocument = Document & { startViewTransition?: (update: () => void) => NativeTransition }
let currentTransition: { transition: NativeTransition; finishUpdate: () => void; clean: () => void } | undefined

/** Stable browser API, not React's experimental ViewTransition component.
 * Snapshots are noninteractive; the real map/forms remain the same React tree.
 * Updates without this explicit boundary (typing, refreshes) never animate.
 */
export function useContentMotion(ref: RefObject<HTMLElement | null>) {
  // morphStrip: the flowing wave strip on both pages becomes one shared snapshot, so it
  // stretches and moves from its old size/position to the new one (Home hero -> supplier search).
  return useCallback((update: () => void, direction: Direction = 'tab', morphStrip = false) => {
    if (currentTransition) {
      currentTransition.transition.skipTransition()
      currentTransition.finishUpdate()
      currentTransition.clean()
      currentTransition = undefined
    }
    const element = ref.current
    if (!element || reduced() || document.hidden) { update(); return }
    const start = (document as TransitionDocument).startViewTransition
    // Without snapshots, don't move the live map, water canvas or form controls.
    if (!start) { update(); return }
    let committed = false
    const finishUpdate = () => { if (!committed) { committed = true; flushSync(update) } }
    const previousName = element.style.viewTransitionName
    element.style.viewTransitionName = 'wave-content'
    document.documentElement.dataset.waveMotion = direction
    if (morphStrip) document.documentElement.dataset.waveStrip = ''
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const preference = () => { if (media?.matches) currentTransition?.transition.skipTransition() }
    const clean = () => { element.style.viewTransitionName = previousName; delete document.documentElement.dataset.waveMotion; delete document.documentElement.dataset.waveStrip; media?.removeEventListener('change', preference) }
    let transition: NativeTransition
    try { transition = start.call(document, finishUpdate) }
    catch { clean(); finishUpdate(); return }
    media?.addEventListener('change', preference)
    const active = { transition, finishUpdate, clean }
    currentTransition = active
    // Hidden tabs, unsupported captures and rapid retargeting may skip snapshots.
    void transition.ready.catch(() => {})
    void transition.finished.catch(() => {}).finally(() => {
      if (currentTransition === active) { clean(); currentTransition = undefined }
    })
  }, [ref])
}

/** Delegation covers native disclosures added later without replacing their DOM. */
export function useDisclosureMotion(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const states = new Map<HTMLDetailsElement, { animation: Animation; target: boolean; restore: () => void }>()
    const clear = (el: HTMLDetailsElement) => {
      const state = states.get(el)
      states.delete(el)
      state?.animation.cancel(); state?.restore()
      el.style.height = ''; el.style.overflow = ''
      el.querySelector(':scope > summary')?.removeAttribute('aria-expanded')
    }
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const finish = () => {
      if (!media?.matches) return
      for (const [el, state] of states) { el.open = state.target; clear(el) }
    }
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return
      const summary = event.target.closest('summary'), el = summary?.parentElement
      if (!summary || !(el instanceof HTMLDetailsElement) || !root.contains(el) || event.target.closest('a,button,input,select,textarea') || !el.animate || reduced()) return
      event.preventDefault()
      const next = !(states.get(el)?.target ?? el.open)
      const height = el.getBoundingClientRect().height
      clear(el)
      el.open = next
      const end = el.getBoundingClientRect().height
      el.open = true
      summary.setAttribute('aria-expanded', String(next))
      const content = [...el.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child !== summary)
      const previous = content.map(child => child.inert)
      if (!next) {
        if (el.contains(document.activeElement) && !summary.contains(document.activeElement)) summary.focus()
        content.forEach(child => { child.inert = true })
      }
      el.style.overflow = 'clip'
      const animation = el.animate([{ height: `${height}px` }, { height: `${end}px` }], { duration: next ? 520 : 380, easing, fill: 'both' })
      states.set(el, { animation, target: next, restore: () => content.forEach((child, i) => { child.inert = previous[i] }) })
      void animation.finished.then(() => {
        if (states.get(el)?.animation !== animation) return
        el.open = next; clear(el)
      }, () => {})
    }
    root.addEventListener('click', click)
    media?.addEventListener('change', finish)
    // Drop detached panels promptly rather than retaining them until a route unmounts.
    const observer = new MutationObserver(() => { for (const el of states.keys()) if (!root.contains(el)) clear(el) })
    observer.observe(root, { childList: true, subtree: true })
    return () => { root.removeEventListener('click', click); observer.disconnect(); media?.removeEventListener('change', finish); for (const el of states.keys()) clear(el) }
  }, [ref])
}

/** Retain exiting surfaces; callers make their controls inert immediately. */
export function useMotionPresence(open: boolean, mode: 'popup' | 'slide' = 'popup') {
  const [retained, setRetained] = useState(open)
  const ref = useRef<HTMLDivElement>(null)
  const interrupted = useRef<Keyframe | null>(null)
  const interruptedSlide = useRef<SlideSnapshot>(new Map())
  useLayoutEffect(() => {
    const el = ref.current
    if (open) setRetained(true)
    if (!open && !retained) return
    if (!el || !el.animate || reduced()) { if (!open) setRetained(false); return }
    const frames: Keyframe[] = open
      ? [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }]
      : [{ opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform }, { opacity: 0, transform: 'translateY(8px)' }]
    if (interrupted.current) frames[0] = interrupted.current
    interrupted.current = null
    const slide = mode === 'slide' ? disclosureSlide(el, open, interruptedSlide.current) : null
    interruptedSlide.current = new Map()
    const animation = slide ?? el.animate(frames, { duration: open ? 360 : 320, easing, fill: 'both' })
    let cancelled = false
    let settled = false
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const finish = () => {
      if (cancelled) return
      settled = true
      // Keep the zero-height frame until React has hidden/unmounted the surface.
      // Releasing it before that commit exposes the natural height for one frame.
      if (!open) flushSync(() => setRetained(false))
      animation.cancel()
    }
    const preference = () => { if (media?.matches) finish() }
    media?.addEventListener('change', preference)
    void animation.finished.then(finish, () => {})
    return () => {
      if (!settled) {
        if (slide) interruptedSlide.current = slide.snapshot()
        else interrupted.current = { opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform }
      }
      cancelled = true; animation.cancel(); media?.removeEventListener('change', preference)
    }
  }, [open, mode])
  return { ref, present: open || retained }
}

const closingDialogs = new WeakMap<HTMLDialogElement, Animation>()
export function closeMotionDialog(dialog: HTMLDialogElement | null, after?: () => void) {
  if (!dialog || !dialog.open) { after?.(); return }
  if (closingDialogs.has(dialog)) return
  const finish = () => { if (dialog.open) dialog.close(); after?.() }
  if (!dialog.animate || reduced()) { finish(); return }
  const animation = dialog.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: dialog.classList.contains('map-detail-sheet') ? 'translateY(100%)' : 'translateY(12px)' }], { duration: dialog.classList.contains('map-detail-sheet') ? 380 : 320, easing, fill: 'both' })
  closingDialogs.set(dialog, animation)
  dialog.dataset.motionClosing = ''
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const complete = () => {
    if (closingDialogs.get(dialog) !== animation) return
    closingDialogs.delete(dialog); delete dialog.dataset.motionClosing
    media?.removeEventListener('change', preference)
    finish(); animation.cancel()
  }
  const preference = () => { if (media?.matches) complete() }
  media?.addEventListener('change', preference)
  void animation.finished.then(complete, () => { closingDialogs.delete(dialog); delete dialog.dataset.motionClosing; media?.removeEventListener('change', preference) })
}
