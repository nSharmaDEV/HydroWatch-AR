import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './icons'
import type { Language } from './domain'

/**
 * One modal shell for History's forms and its full record. Native <dialog> keeps focus
 * inside while open; focus starts on the first field and returns to the opener on close.
 */
export function HistoryDialog({ title, subtitle, language, wide = false, onClose, children }: { title: string; subtitle?: string; language: Language; wide?: boolean; onClose: () => void; children: ReactNode }) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), opener = useRef<Element | null>(null)
  useEffect(() => {
    const d = dialog.current
    opener.current = document.activeElement
    if (d && !d.open) d.showModal()
    d?.querySelector<HTMLElement>('input, select, textarea, a[href], button:not(.history-dialog-close)')?.focus()
    return () => {
      if (d?.open) d.close()
      const back = opener.current as HTMLElement | null
      if (back?.isConnected) back.focus?.()
    }
  }, [])
  return <dialog ref={dialog} className={`history-dialog${wide ? ' history-dialog--wide' : ''}`} aria-labelledby={`${id}-title`}
    onCancel={e => { e.preventDefault(); onClose() }}
    onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }}>
    <div className="history-dialog-inner">
      <header className="history-dialog-head">
        <div><h2 id={`${id}-title`}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
        <button type="button" className="history-dialog-close" aria-label={language === 'es' ? 'Cerrar' : 'Close'} onClick={onClose}><Icon name="x" size={22} /></button>
      </header>
      {children}
    </div>
  </dialog>
}
