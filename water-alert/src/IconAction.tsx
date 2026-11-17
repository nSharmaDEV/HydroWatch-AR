import { useId } from 'react'
import { Icon, type IconName } from './icons'

/** Shared tooltip and accessible name for icon-only buttons and handoff links. */
export function IconAction({ label, icon, primary = false, disabled = false, href, onClick }: { label: string; icon: IconName; primary?: boolean; disabled?: boolean; href?: string; onClick?: () => void }) {
  const id = useId()
  const props = { className: `${primary ? 'primary' : 'secondary'} review-icon-action`, 'aria-label': label, title: label, 'aria-describedby': id, onClick }
  return <span className="review-icon-tooltip">{href && !disabled ? <a {...props} href={href}><Icon name={icon} size={20} /></a> : <button {...props} type="button" disabled={disabled}><Icon name={icon} size={20} /></button>}<span id={id} role="tooltip">{label}</span></span>
}
