import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SupplierInformation } from '../src/SupplierProfile'
import type { Place } from '../src/domain'
import { AnnualWaterReport } from '../src/AnnualWaterReport'
import { ANNUAL_REPORTS, type AnnualReport } from '../src/annual-reports'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const pdf = 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025'

it.each(['en', 'es'] as const)('shows the reviewed %s report before independently collapsed provider facts', async language => {
  const es = language === 'es'
  const user = userEvent.setup()
  render(<SupplierInformation place={place} language={language} sample={false} onView={() => {}} />)
  await user.click(screen.getByRole('button', { name: es ? 'Información del proveedor' : 'Provider information' }))
  expect(screen.getByText(es ? '4 problemas de cumplimiento reportados' : '4 compliance issues reported')).toBeVisible()
  expect(screen.getByText(es ? '2 monitoreo/informes · 1 licencia · 1 aviso público' : '2 monitoring/reporting · 1 licensing · 1 public notice')).toBeVisible()
  const toggle = screen.getByRole('button', { name: es ? 'Ver 4 problemas' : 'View 4 issues' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const panel = toggle.closest('.report-summary-issues')!
  expect(panel.querySelector('.report-summary-header')).toContainElement(toggle)
  expect(panel.querySelector('.report-summary-header')).toContainElement(screen.getByText(es ? '4 problemas de cumplimiento reportados' : '4 compliance issues reported'))
  expect(screen.queryByText('07/11/2025')).not.toBeVisible()
  expect(screen.getByText('WELL #1')).not.toBeVisible()
  expect(screen.getByText('Roubidoux Formation Aquifer')).toBeVisible()
  expect(screen.getByRole('link', { name: es ? /Ver informe original/ : /View original report/ })).toHaveAttribute('href', pdf)
  expect(document.querySelector('.provider-more>summary .disclosure-icon')).not.toBeNull()
  await user.click(toggle)
  const issues = document.getElementById(toggle.getAttribute('aria-controls')!)!
  expect(panel).toContainElement(issues)
  expect(issues.querySelectorAll('li')).toHaveLength(4)
  expect(issues.querySelector('ol')).not.toBeNull()
  expect(within(issues).getByText('07/11/2025')).toBeVisible()
  expect(within(issues).getByText('07/31/2025')).toBeVisible()
  expect(within(issues).getByText('10/31/2025')).toBeVisible()
  expect(within(issues).getByText('12/31/2025')).toBeVisible()
  expect(within(issues).getByText(es ? '“Current” (según el informe)' : '“Current” (as printed in the report)')).toBeVisible()
  const first = issues.querySelector('li')!
  expect(within(first).getByRole('heading', { name: es ? 'Monitoreo bacteriológico' : 'Bacteriological monitoring' })).toBeVisible()
  expect(Array.from(first.querySelectorAll('dt'), node => node.textContent)).toEqual(es
    ? ['Desde (según el informe)', 'Hasta (según el informe)', 'Qué se reportó', 'Acción correctiva reportada']
    : ['Reported from', 'Reported through', 'What was reported', 'Reported corrective action'])
  expect(first.querySelector('.report-issue-header a')).toHaveAttribute('href', `${pdf}#page=2`)
  expect(first.querySelectorAll('dd')).toHaveLength(4)
  expect(within(first).getByText(es ? /No se monitorearon/ : /Failed to monitor/)).toBeVisible()
  const links = within(issues).getAllByRole('link', { name: es ? /Informe, página 2/ : /Report, page 2/ })
  expect(links).toHaveLength(4)
  for (const link of links) expect(link).toHaveAttribute('href', `${pdf}#page=2`)
  await user.click(screen.getByText(es ? 'Más detalles del proveedor' : 'More provider details'))
  expect(screen.getByText('WELL #1')).toBeVisible()
  expect(screen.getByText(es ? /Directorio de ADH ·/ : /ADH directory ·/)).toBeVisible()
  expect(screen.getByRole('link', { name: /ADH profile|Perfil de ADH/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
})

it.each(['en', 'es'] as const)('keeps reviewed-empty, unreviewed and unavailable %s years distinct', async language => {
  // Synthetic report states exercise the reusable component, never the shipped catalog.
  const es = language === 'es'
  const reports: AnnualReport[] = [
    { year: 2025, state: 'reviewed', reviewedOn: '2026-10-19', url: 'https://example.org/2025.pdf', issues: [] },
    { year: 2024, state: 'unreviewed', url: 'https://example.org/2024.pdf' },
    { year: 2023, state: 'unavailable' },
  ]
  render(<AnnualWaterReport reports={reports} language={language} />)
  const user = userEvent.setup()
  const select = screen.getByRole('combobox', { name: es ? 'Año' : 'Year' })
  expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['2025', '2024', '2023'])
  expect(screen.getByText(es ? 'No se reportaron infracciones' : 'No violations reported')).toBeVisible()
  expect(screen.getByText(es ? /Informe histórico/ : /Historical report/)).toBeVisible()
  expect(screen.queryByRole('button')).toBeNull()
  await user.selectOptions(select, '2024')
  expect(screen.getByText(es ? 'Informe aún no revisado' : 'Report not yet reviewed')).toBeVisible()
  expect(screen.queryByText(es ? 'No se reportaron infracciones' : 'No violations reported')).toBeNull()
  expect(screen.getByRole('link', { name: /Ver informe original|View original report/ })).toHaveAttribute('href', 'https://example.org/2024.pdf')
  await user.selectOptions(select, '2023')
  expect(screen.getByText(es ? 'Informe no disponible' : 'Report unavailable')).toBeVisible()
  expect(screen.queryByRole('link', { name: /Ver informe original|View original report/ })).toBeNull()
  expect(screen.getByRole('link', { name: /ADH/ })).toHaveAttribute('href', 'https://health.arkansas.gov/eng/CCRSearch.aspx')
})

it('resets issue expansion when changing years and preserves the verified Leisure Hills year', async () => {
  const reviewed = ANNUAL_REPORTS[place.id]
  expect(reviewed.map(r => r.year)).toEqual([2025])
  render(<AnnualWaterReport reports={[...reviewed, { year: 2024, state: 'unreviewed', url: 'https://example.org/2024.pdf' }]} language="en" />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'View 4 issues' }))
  await user.selectOptions(screen.getByRole('combobox'), '2024')
  expect(screen.queryByText('07/11/2025')).toBeNull()
  await user.selectOptions(screen.getByRole('combobox'), '2025')
  expect(screen.getByRole('button', { name: 'View 4 issues' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByText('07/11/2025')).not.toBeVisible()
})

it('does not copy reviewed findings to an unknown supplier or sample supplier', async () => {
  const user = userEvent.setup()
  const view = render(<SupplierInformation place={{ ...place, id: 'ADH:unknown' }} language="en" sample={false} onView={() => {}} />)
  await user.click(screen.getByRole('button', { name: 'Provider information' }))
  expect(screen.getByText('Report not yet reviewed')).toBeVisible()
  expect(screen.queryByText('4 compliance issues reported')).toBeNull()
  expect(screen.queryByText('No violations reported')).toBeNull()
  expect(screen.queryByText('Roubidoux Formation Aquifer')).toBeNull()
  view.rerender(<SupplierInformation place={place} language="en" sample onView={() => {}} />)
  expect(screen.queryByText('4 compliance issues reported')).toBeNull()
  expect(screen.queryByRole('link', { name: /View original report/ })).toBeNull()
})
