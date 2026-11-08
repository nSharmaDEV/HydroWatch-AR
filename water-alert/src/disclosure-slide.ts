import { useLayoutEffect, type RefObject } from 'react'
import { desktopTransition } from './desktop-transition'

/** Keep the carousel's spare status space when a disclosure opens below it. */
export function useStableStatus(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const minHeight = el.style.minHeight, shrink = el.style.flexShrink
    let width = -1
    const measure = () => {
      const next = el.getBoundingClientRect().width
      if (!next || next === width) return
      width = next
      el.style.minHeight = minHeight
      el.style.flexShrink = shrink
      const height = el.getBoundingClientRect().height
      el.style.minHeight = `${height}px`
      el.style.flexShrink = '0'
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    return () => { observer?.disconnect(); el.style.minHeight = minHeight; el.style.flexShrink = shrink }
  }, [ref])
}

export type SlideSnapshot = Map<HTMLElement, Keyframe>

/** One clipped viewport owns both the reveal and its space in the card. */
export function disclosureSlide(el: HTMLElement, open: boolean, interrupted: SlideSnapshot) {
  const style = getComputedStyle(el)
  const height = el.getBoundingClientRect().height
  const properties = ['height', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderBottomWidth'] as const
  const original = { overflow: el.style.overflow, minHeight: el.style.minHeight, boxSizing: el.style.boxSizing, flexShrink: el.style.flexShrink }
  const expanded: Keyframe = { height: `${height}px` }
  const closed: Keyframe = { height: '0px' }
  for (const property of properties.slice(1)) { expanded[property] = style[property]; closed[property] = '0px' }
  el.style.overflow = 'clip'
  el.style.minHeight = '0'
  el.style.boxSizing = 'border-box'
  el.style.flexShrink = '0'
  const effects: { el: HTMLElement; animation: Animation; properties: readonly string[] }[] = []
  const animate = (target: HTMLElement, closed: Keyframe, expanded: Keyframe, properties: readonly string[]) => {
    const start = interrupted.get(target) ?? (open ? closed : expanded)
    effects.push({ el: target, properties, animation: target.animate([start, open ? expanded : closed], {
      duration: desktopTransition().duration, easing: 'cubic-bezier(.31,.24,.14,1)', fill: 'both',
    }) })
  }
  animate(el, closed, expanded, properties)
  // Small content travel inside the viewport; no ancestor or following-row transforms.
  for (const child of Array.from(el.children)) {
    if (child instanceof HTMLElement && !child.hidden && child.tagName !== 'DIALOG') {
      animate(child, { transform: 'translate3d(0, -24px, 0)' }, { transform: getComputedStyle(child).transform }, ['transform'])
    }
  }
  return {
    finished: Promise.all(effects.map(effect => effect.animation.finished)),
    snapshot: () => new Map(effects.map(({ el: target, properties }) => {
      const style = getComputedStyle(target)
      return [target, Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`))])) as Keyframe]
    })),
    cancel: () => { effects.forEach(effect => effect.animation.cancel()); Object.assign(el.style, original) },
  }
}
