import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'

const openedEvent = 'wave:info-popover-open'

/** Click/touch/keyboard disclosure; only one information popover stays open. */
export function InfoButton({ label, children }: { label: string; children: ReactNode }) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ top: 0, left: 0 })
  useEffect(() => {
    const otherOpened = (event: Event) => { if ((event as CustomEvent).detail !== id) setOpen(false) }
    document.addEventListener(openedEvent, otherOpened)
    return () => document.removeEventListener(openedEvent, otherOpened)
  }, [id])
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect(), box = panel.current!.getBoundingClientRect()
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - box.height - 8)), left: Math.max(8, Math.min(rect.right - box.width, window.innerWidth - box.width - 8)) })
    }
    place()
    panel.current?.focus()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <><button ref={trigger} type="button" className="request-answer-info review-info-button" aria-label={label} title={label} aria-expanded={open} aria-controls={id} onClick={() => { if (!open) document.dispatchEvent(new CustomEvent(openedEvent, { detail: id })); setOpen(!open) }}><Icon name="info" size={22} /></button>{open ? createPortal(<div ref={panel} id={id} role="dialog" aria-label={label} tabIndex={-1} className="review-info-popover" style={position}>{children}</div>, document.body) : null}</>
}
