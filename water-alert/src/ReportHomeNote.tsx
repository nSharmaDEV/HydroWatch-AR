import { useState } from 'react'
import type { Language, Place } from './domain'
import { Icon } from './icons'
import { latestReport } from './report-findings'
import { supplierDisplayName } from './help-format'

const SEEN = 'wave:report-seen:v1'
const seenKeys = (): string[] => { try { const v = JSON.parse(localStorage.getItem(SEEN) ?? '[]'); return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [] } catch { return [] } }

/**
 * One visible line on a supplier card when its newest annual report lists
 * findings. Dated document findings only; never a present-day safety claim.
 */
export function ReportHomeNote({ place, language, sample, onOpen }: { place: Place; language: Language; sample: boolean; onOpen: () => void }) {
  const report = latestReport(place, sample)
  const key = report ? `${place.id}:${report.year}` : ''
  const [seen, setSeen] = useState(() => seenKeys().includes(key))
  if (!report || !report.findings.length) return null
  const es = language === 'es', n = report.findings.length, name = supplierDisplayName(place.name), ai = report.state === 'aiSummarized'
  function open() {
    if (!seen) { try { localStorage.setItem(SEEN, JSON.stringify([...seenKeys(), key].slice(-200))) } catch { /* storage full or blocked: still open the list */ } setSeen(true) }
    onOpen()
  }
  return <div className="report-home-note" role="note" aria-label={es ? 'Hallazgos del informe del agua' : 'Water report findings'}>
    <Icon name="file-text" size={20} />
    <p>
      {!seen ? <span className="report-home-new">{es ? 'Nuevo' : 'New'}</span> : null}
      <b>{es ? `El informe del agua de ${report.year} de ${name} indica ${n} ${n === 1 ? 'problema' : 'problemas'}.` : `${name}’s ${report.year} water report lists ${n} ${n === 1 ? 'issue' : 'issues'}.`}</b>{' '}
      {ai ? <span className="report-ai-tag">{es ? 'Resumen por IA' : 'AI summary'}</span> : null}{' '}
      <span className="quiet-note">{es ? 'Hallazgos fechados del informe, no el estado actual de seguridad.' : 'Dated report findings, not current safety status.'}</span>
    </p>
    <button className="text-button" onClick={open}>{es ? 'Ver los problemas' : 'See the issues'}</button>
  </div>
}
