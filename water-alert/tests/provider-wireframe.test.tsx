import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ProviderEvidenceSections } from '../src/ProviderEvidence'
import { providerEvidence } from '../src/provider-evidence'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
afterEach(cleanup)

test.each(['en', 'es'] as const)('reuses the original compact report card and disclosure controls (%s)', language => {
  const es = language === 'es'
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false })} language={language} />)
  expect(document.querySelectorAll('.provider-cards>.provider-card')).toHaveLength(1)
  expect(document.querySelector('.provider-card')).toHaveClass('annual-report')
  expect(screen.queryByRole('heading', { name: /Past issues|Problemas anteriores|Documents and sources|Documentos y fuentes/ })).toBeNull()
  expect(screen.getByRole('heading', { name: es ? 'Informe anual' : 'Annual report' })).toBeVisible()
  expect(screen.getByRole('heading', { name: es ? 'Registros de EPA' : 'EPA records' })).toBeVisible()
  const toggle = screen.getByRole('button', { name: es ? /Todos los problemas registrados/ : /All recorded problems/ })
  expect(toggle).toHaveClass('report-toggle')
   expect(toggle.querySelector('svg.evidence-chevron')).not.toBeNull()
  expect(screen.queryByRole('button', { name: es ? 'Detalles de las fuentes' : 'Source details' })).toBeNull()
   fireEvent.click(toggle)
   expect(document.querySelectorAll('.evidence-type-group[open]')).toHaveLength(0)
  expect(screen.getAllByText(es ? 'Qué se reportó' : 'What was reported')[0]).toBeVisible()
})

test('empty reviewed records do not create a second empty-state card or an issue control', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false, reports: [{ year: 2025, state: 'reviewed', url: 'https://health.arkansas.gov/report', reviewedOn: '2026-11-17', issues: [] }] })} language="en" />)
  expect(document.querySelectorAll('.provider-cards>.provider-card')).toHaveLength(1)
  expect(screen.queryByText('No issues identified in the records checked.')).toBeNull()
   expect(screen.queryByRole('button', { name: /All recorded problems/ })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Source details' })).toBeNull()
})

test('unread or absent records cannot produce a no-problems result', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place: { ...place, id: 'ADH:unknown' }, sample: false, reports: [] })} language="en" />)
   expect(screen.queryByRole('button', { name: /All recorded problems/ })).toBeNull()
  expect(screen.queryByText(/No problems identified in the records read/)).toBeNull()
   expect(screen.queryByText('No read records available.')).toBeNull()
  expect(screen.queryByText(/Fields copied from the published record|Automatic copy/)).toBeNull()
})
