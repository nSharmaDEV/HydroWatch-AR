import type { HelpSource } from './help-requests'
/** Structured citations for new drafts; legacy text is only read, never rewritten. */
export function RequestSources({ text = '', sources, es, compact = false }: { text?: string; sources?: HelpSource[]; es: boolean; compact?: boolean }) {
  const citations = sources ?? [...new Set(text.match(/https?:\/\/[^\s<>]+/g) ?? [])].map(url => ({ recordId: url, url, label: '' }))
  const safe = citations.filter(source => { try { return new URL(source.url).protocol === 'https:' } catch { return false } })
  return safe.length ? <div className="request-source-links"><strong>{es ? 'Fuente' : 'Source'}</strong>{safe.map((source, i) => <a key={`${source.recordId}:${i}`} href={source.url} target="_blank" rel="noreferrer" title={source.label || source.url} aria-label={compact ? `${es ? 'Ver fuente' : 'View source'} ${i + 1}: ${source.label || source.url}` : undefined}>{compact ? `${es ? 'Ver fuente' : 'View source'} ${i + 1}` : <>{es ? 'Ver fuente oficial' : 'View official source'}{source.label ? ` — ${source.label}` : ''}</>}</a>)}</div> : null
}
