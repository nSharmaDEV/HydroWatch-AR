import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import type { AnnualReport } from '../src/annual-reports'
import { AnnualWaterReport, reportHasFindings, reportHeaderChip } from '../src/AnnualWaterReport'
import { annualReportAiDisclaimer } from '../src/annual-report-disclaimer'
import { StatusCard } from '../src/components'
import type { SourceSnapshot } from '../src/domain'
import { en, es } from '../src/strings'

const url = 'https://health.arkansas.gov/eng/d.aspx?P=068&YEAR=2025'
const issue = { category: 'publicNotice' as const, heading: { en: 'Public notice', es: 'Aviso público' }, title: { en: 'Failed to conduct a public notice', es: 'No se realizó el aviso público' }, action: { en: 'No corrective action taken', es: 'No se tomó ninguna acción correctiva' }, reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2 }
const ai = (issues = [issue]): AnnualReport[] => [{ year: 2025, state: 'aiSummarized', url, summarizedOn: '2026-11-08', model: 'claude-opus-5-5', issues }]

it.each(['en', 'es'] as const)('labels automatic summaries as AI, never as reviewed (%s)', async language => {
  const spanish = language === 'es'
  render(<AnnualWaterReport reports={ai()} language={language} />)
  expect(screen.getByText(spanish ? 'Resumen por IA' : 'AI summary', { selector: '.report-ai-tag' })).toBeVisible()
  expect(document.querySelector('.report-reviewed')).toHaveTextContent(spanish ? 'Resumido por IA' : 'AI summary')
  expect(screen.queryByText(spanish ? 'Revisado' : 'Reviewed')).toBeNull()
  await userEvent.setup().click(screen.getByRole('button', { name: spanish ? 'Ver 1 problema' : 'View 1 issue' }))
  expect(screen.getByRole('link', { name: spanish ? /Informe, página 2/ : /Report, page 2/ })).toHaveAttribute('href', `${url}#page=2`)
  expect(reportHasFindings(ai()[0])).toBe(true)
  expect(reportHeaderChip(ai()[0], language)).toBe(spanish ? '2025: 1 problema de cumplimiento · resumen por IA' : '2025: 1 compliance issue · AI summary')
})

it('labels a clean AI summary in the PDF link and pill', () => {
  render(<AnnualWaterReport reports={ai([])} language="en" />)
  expect(screen.getByText('AI summary', { selector: '.report-ai-tag' })).toBeVisible()
  expect(screen.getByRole('link', { name: /View original report \(PDF\), AI summary Nov 8, 2026/ })).toHaveAttribute('href', url)
  expect(screen.getByText('No violations reported')).toBeVisible()
})

it.each(['en', 'es'] as const)('shows the AI disclaimer in the supplier info dialog (%s)', async language => {
  const t = language === 'en' ? en : es
  const place = { id: 'ADH:one', name: 'Saved supplier', county: 'Benton', kind: 'system' as const }
  const at = '2026-10-14T12:00:00Z'
  const source: SourceSnapshot = { agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null }
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: t.supplierAbout }))
  const text = annualReportAiDisclaimer[language]
  expect(screen.getByRole('heading', { name: text.heading })).toBeInTheDocument()
  expect(screen.getByText(text.body)).toBeInTheDocument()
  expect(text.body).toMatch(language === 'en' ? /AI and can contain errors.*original PDF.*not current water-safety status/ : /IA y pueden contener errores.*PDF original.*no indican el estado actual/)
})
