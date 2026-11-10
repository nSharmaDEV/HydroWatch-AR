import { Children, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { useCarouselMotion } from './useCarouselMotion'
import { Icon } from './icons'
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

/**
 * One-card-at-a-time horizontal carousel. Cards stay mounted, so expanded
 * sections, dialogs and other card state survive every transition. Only the
 * controls, keyboard and horizontal pointer gestures move a spring-driven track.
 * Vertical touch scrolling and descendant controls retain their native behavior.
 */
export function ProviderCarousel({ children, language = 'en', initialIndex = 0 }: { children: ReactNode; language?: Language; initialIndex?: number }) {
  const slides = Children.toArray(children)
  const count = slides.length
  const strings = copy[language]
  const { trackRef, index, indexRef, showIndex, pointerHandlers } = useCarouselMotion(count, initialIndex)

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Descendant controls own their native text, select and disclosure keys.
    if (event.target !== event.currentTarget) return
    if (event.altKey || event.metaKey || event.ctrlKey) return
    if (event.key === 'ArrowRight') { event.preventDefault(); showIndex(indexRef.current + 1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); showIndex(indexRef.current - 1) }
    else if (event.key === 'Home') { event.preventDefault(); showIndex(0) }
    else if (event.key === 'End') { event.preventDefault(); showIndex(count - 1) }
  }

  return <div className="status-carousel">
    <div className="carousel-viewport">
      <div
        className="carousel-track"
        ref={trackRef}
        {...pointerHandlers}
        role="region"
        aria-roledescription={language === 'en' ? 'carousel' : 'carrusel'}
        aria-label={strings.label}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {slides.map((slide, i) => <div className="carousel-slide" key={(slide as { key?: string | null }).key ?? i} role="group" aria-roledescription={language === 'en' ? 'slide' : 'diapositiva'} aria-label={strings.slide(i, count)} inert={i !== index} aria-hidden={i !== index ? true : undefined}>{slide}</div>)}
      </div>
    </div>
    {count > 1 ? <div className="carousel-controls">
      <button type="button" className="secondary" aria-label={strings.previous} disabled={index <= 0} onClick={() => showIndex(indexRef.current - 1)}><Icon name="chevron-left" size={18} /><span aria-hidden="true">{language === 'en' ? 'Previous' : 'Anterior'}</span></button>
      <p className="carousel-status" aria-live="polite" aria-atomic="true">{strings.of(index, count)}</p>
      <button type="button" className="secondary" aria-label={strings.next} disabled={index >= count - 1} onClick={() => showIndex(indexRef.current + 1)}><span aria-hidden="true">{language === 'en' ? 'Next' : 'Siguiente'}</span><Icon name="chevron-right" size={18} /></button>
    </div> : null}
  </div>
}
