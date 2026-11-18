import { useEffect, useId, useState } from 'react'
import { Icon } from './icons'
import type { Language } from './domain'
import type { HelpAttachment } from './help-requests'
import { reviewLabel } from './review-labels'
import { attachmentSize, attachmentTag } from './attachment-display'

const OPEN_KEY = 'wave:review-files-open:v1'
function blob(file: HelpAttachment) {
  const binary = atob(file.data), bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: file.type })
}
function readOpen() { try { return sessionStorage.getItem(OPEN_KEY) !== '0' } catch { return true } }

/** Step 5 files, read straight from the draft. Opening an email app never attaches them; the resident attaches or drags them in. */
export function ReviewFiles({ files, language }: { files: HelpAttachment[]; language: Language }) {
  const listId = useId()
  const [open, setOpen] = useState(readOpen)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [dragging, setDragging] = useState('')
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    const made: Record<string, string> = {}
    for (const f of files) { try { made[f.id] = URL.createObjectURL(blob(f)) } catch { /* unreadable payload: no link */ } }
    setUrls(made)
    return () => { for (const url of Object.values(made)) URL.revokeObjectURL(url) }
  }, [files])
  if (!files.length) return null
  const title = `${reviewLabel('yourFiles', language)} · ${files.length}`
  function toggle() {
    const next = !open
    setOpen(next)
    try { sessionStorage.setItem(OPEN_KEY, next ? '1' : '0') } catch { /* session-only preference */ }
  }
  return <section className={`review-files${open ? ' is-open' : ''}`} aria-label={reviewLabel('yourFiles', language)}>
    <button type="button" className="review-files-toggle" aria-expanded={open} aria-controls={listId} aria-label={`${title}. ${reviewLabel(open ? 'hideFiles' : 'showFiles', language)}`} onClick={toggle}>
      <span className="review-card-title">{title}</span>
      {open ? <span className="review-files-hint">{reviewLabel('dragHint', language)}</span> : null}
      <span className="review-files-indicator" aria-hidden="true"><Icon name={open ? 'minus' : 'plus'} size={16} /></span>
    </button>
    {open ? <ul id={listId} className="review-files-list">{files.map(f => {
      const [label, kind] = attachmentTag(f), url = urls[f.id]
      return <li key={f.id} className={`review-file${dragging === f.id ? ' is-dragging' : ''}`} draggable
        onDragStart={e => { if (url) e.dataTransfer.setData('DownloadURL', `${f.type}:${f.name}:${url}`); e.dataTransfer.effectAllowed = 'copy'; setDragging(f.id) }}
        onDragEnd={() => setDragging('')}>
        <Icon className="review-file-grip" name="grip-vertical" size={16} />
        <span className={`review-file-tag ${kind}`}>{label}</span>
        <span className="review-file-name">{f.name}</span>
        <span className="review-file-size">{attachmentSize(f)}</span>
        <a className="review-file-download" href={url} download={f.name} aria-label={`${reviewLabel('download', language)} ${f.name}`} title={`${reviewLabel('download', language)} ${f.name}`} draggable={false}><Icon name="download" size={18} /></a>
      </li>
    })}</ul> : null}
  </section>
}

/** Plain next steps; WAVE does not promise delivery or a reply. */
export function ReviewNextSteps({ language }: { language: Language }) {
  const id = useId()
  const [open, setOpen] = useState(() => typeof matchMedia !== 'function' || matchMedia('(min-width: 761px)').matches)
  const steps = [['nextSend', 'nextSendText'], ['nextLog', 'nextLogText'], ['nextFollow', 'nextFollowText']] as const
  return <details className="review-next" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary id={id} className="review-card-title"><span>{reviewLabel('nextTitle', language)}</span><Icon name="chevron-down" size={16} /></summary>
    <ol>{steps.map(([head, text], i) => <li key={head}><span className="review-next-number" aria-hidden="true">{i + 1}</span><span><strong>{reviewLabel(head, language)}</strong><span>{reviewLabel(text, language)}</span></span></li>)}</ol>
  </details>
}
