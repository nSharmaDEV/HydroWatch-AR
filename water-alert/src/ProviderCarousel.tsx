import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import type { Language } from './domain'

const copy = {
  en: {
    label: 'Watched places',
    previous: 'Previous place',
    next: 'Next place',
    of: (index: number, total: number) => `${index + 1} of ${total} places`,
    slide: (index: number, total: number) => `${index + 1} of ${total}`,
  },
  es: {
    label: 'Lugares seguidos',
    previous: 'Lugar anterior',
    next: 'Lugar siguiente',
    of: (index: number, total: number) => `${index + 1} de ${total} lugares`,
    slide: (index: number, total: number) => `${index + 1} de ${total}`,
  },
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * One-card-at-a-time horizontal carousel. Cards stay mounted, so expanded
 * sections, dialogs and other card state survive every transition. Only the
 * Previous/Next controls and keyboard arrows move the track; the track itself
 * is not user-scrollable, so swipes, wheel and drag cannot change cards.
 */
export function ProviderCarousel({ children, language = 'en' }: { children: ReactNode; language?: Language }) {
  const track = useRef<HTMLDivElement>(null)
  const slides = Children.toArray(children)
  const count = slides.length
  const strings = copy[language]
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  indexRef.current = index

  const clamp = useCallback((value: number) => Math.max(0, Math.min(count - 1, value)), [count])

  const cardStep = useCallback(() => {
    const el = track.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return 0
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0
    return first.getBoundingClientRect().width + gap
  }, [])

  const showIndex = useCallback((target: number, smooth = true) => {
    const el = track.current
    if (!el) return
    const next = clamp(target)
    setIndex(next)
    indexRef.current = next
    const left = next * cardStep()
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
    } else {
      el.scrollLeft = left
    }
  }, [cardStep, clamp])

  // Keep the current card aligned when the available width changes.
  useLayoutEffect(() => {
    const el = track.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => showIndex(indexRef.current, false))
    observer.observe(el)
    return () => observer.disconnect()
  }, [showIndex])

  // Removing a watched place can leave the index past the last card.
  useEffect(() => {
    if (indexRef.current > count - 1) showIndex(count - 1, false)
  }, [count, showIndex])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return
    if (event.key === 'ArrowRight') { event.preventDefault(); showIndex(indexRef.current + 1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); showIndex(indexRef.current - 1) }
    else if (event.key === 'Home') { event.preventDefault(); showIndex(0) }
    else if (event.key === 'End') { event.preventDefault(); showIndex(count - 1) }
  }

  return <div className="status-carousel">
    <div className="carousel-viewport">
      <div
        ref={track}
        className="carousel-track"
        role="region"
        aria-roledescription={language === 'en' ? 'carousel' : 'carrusel'}
        aria-label={strings.label}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {slides.map((slide, i) => <div className="carousel-slide" key={(slide as { key?: string | null }).key ?? i} role="group" aria-roledescription={language === 'en' ? 'slide' : 'diapositiva'} aria-label={strings.slide(i, count)}>{slide}</div>)}
      </div>
    </div>
    {count > 1 ? <div className="carousel-controls">
      <button type="button" className="secondary" aria-label={strings.previous} disabled={index <= 0} onClick={() => showIndex(indexRef.current - 1)}>‹<span aria-hidden="true"> {language === 'en' ? 'Previous' : 'Anterior'}</span></button>
      <p className="carousel-status" aria-live="polite" aria-atomic="true">{strings.of(index, count)}</p>
      <button type="button" className="secondary" aria-label={strings.next} disabled={index >= count - 1} onClick={() => showIndex(indexRef.current + 1)}><span aria-hidden="true">{language === 'en' ? 'Next' : 'Siguiente'} </span>›</button>
    </div> : null}
  </div>
}
