import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SupplierInformation } from '../src/SupplierProfile'
import type { Place } from '../src/domain'
import { AnnualWaterReport } from '../src/AnnualWaterReport'
import { ANNUAL_REPORTS, type AnnualReport } from '../src/annual-reports'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const pdf = 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025'

it.each(['en', 'es'] as const)('shows the reviewed %s report before combined provider facts', async language => {
  const es = language === 'es'
  const user = userEvent.setup()
  render(<SupplierInformation place={place} language={language} sample={false} onView={() => {}} />)
  await user.click(screen.getByRole('button', { name: es ? /^Información del proveedor/ : /^Provider information/ }))
  expect(screen.getByRole('button', { name: es ? /2025: 4 problemas de cumplimiento/ : /2025: 4 compliance issues/ })).toBeVisible()
  // The historical caveat is no longer a visible card paragraph; it rides on the heading for screen readers.
  expect(screen.queryByText(/Historical report \(2025\)|Informe histórico \(2025\)/)).toBeNull()
  expect(screen.getByText(es ? /2025: 4 problemas de cumplimiento reportados; no es una evaluación actual de la seguridad del agua/ : /2025: 4 compliance issues reported; not a current water-safety assessment/)).toHaveClass('sr-only')
  const categories = Array.from(document.querySelectorAll('.report-category-list li'), node => [node.querySelector('.report-category-count')!.textContent, node.textContent])
  expect(categories).toEqual(es
    ? [['2', '2 Monitoreo/informes'], ['1', '1 Licencia'], ['1', '1 Aviso público']]
    : [['2', '2 Monitoring/reporting'], ['1', '1 Licensing'], ['1', '1 Public notice']])
  const toggle = screen.getByRole('button', { name: es ? 'Ver 4 problemas' : 'View 4 issues' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(toggle.parentElement).toHaveClass('report-toggle-row')
   // Report card with findings: visible heading is just "Annual report / PDF"; the dated count lives in
  // the Provider information chip, and the year/status stay in the heading for screen readers.
  const panel = toggle.closest('.report-summary-issues')!
  expect(panel).toHaveClass('provider-card')
  const heading = panel.querySelector('.provider-card-heading')!
  const title = within(heading as HTMLElement).getByRole('heading', { name: es ? /^Informe anual 2025: 4 problemas de cumplimiento reportados; no es una evaluación actual/ : /^Annual report 2025: 4 compliance issues reported; not a current water-safety assessment/ })
  expect(title).toBeVisible()
  expect(within(title).getByText(es ? 'Informe anual' : 'Annual report', { ignore: '.sr-only' })).toBeVisible()
  expect(heading.querySelector('.report-year')).toBeNull()
  expect(heading.querySelector('.status-pill')).toBeNull()
   expect(heading.querySelector('.profile-leader')).toBeNull()
  expect(panel.querySelector('.provider-caveat')).toBeNull()
  expect(heading).toContainElement(screen.getByRole('link', { name: es ? /Ver informe original/ : /View original report/ }))
   expect(Array.from(panel.querySelectorAll('.provider-card-facts dt'), node => node.textContent)).toEqual(es ? ['En curso al imprimirse', 'Tipos de problemas'] : ['Ongoing when printed', 'Issue types'])
   expect(panel.querySelector('.report-reviewed')).toHaveTextContent(es ? /Revisado.*19.*oct.*2026/i : 'Reviewed Oct 19, 2026')
   expect(heading).toContainElement(panel.querySelector('.report-reviewed') as HTMLElement)
   expect(panel.querySelector('.provider-card-facts')).not.toHaveClass('report-facts-three')
  // The one finding printed as "Current", dated as printed; scoped to the document, never present-day status.
  const ongoing = panel.querySelector('.report-ongoing-list li')!
  expect(ongoing.querySelector('.report-ongoing-label')).toHaveTextContent(es ? 'Aviso público' : 'Public notice')
  expect(ongoing.querySelector('.report-ongoing-since')).toHaveTextContent(es ? /desde 1 .*oct.*2025/i : 'since Oct 1, 2025')
  expect(ongoing.querySelector('.sr-only')).toHaveTextContent(es ? /imprime “Current”; no es el estado actual/ : /prints “Current”; this is not current status/)
  expect(within(panel as HTMLElement).getByText(es ? /19.*oct.*2026/i : 'Oct 19, 2026')).toBeVisible()
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.queryByText(es ? '4 problemas de cumplimiento reportados' : '4 compliance issues reported', { ignore: '.sr-only' })).toBeNull()
  // No full-width status bar: that stays unique to Advisory history.
  expect(document.querySelector('.provider-information .alert-status')).toBeNull()
  // Water-system card: six two-column directory facts, no More details toggle.
  const system = document.querySelector('.provider-system-card') as HTMLElement
  expect(Array.from(system.querySelectorAll('.provider-card-facts dt'), node => node.textContent)).toEqual(es
    ? ['Fuente de agua', 'Nombre de la fuente', 'ID del sistema', 'Tipo de sistema', 'Personas atendidas', 'Última inspección de ADH']
    : ['Water source', 'Source name', 'System ID', 'System type', 'People served', 'Last ADH inspection'])
  expect(within(system).getByText('Roubidoux Formation Aquifer')).toBeVisible()
  expect(within(system).getByText('WELL #1')).toBeVisible()
  expect(within(system).getByText('113')).toBeVisible()
  expect(screen.queryByRole('button', { name: /More details|Más detalles/ })).toBeNull()
  expect(screen.queryByText('07/11/2025')).not.toBeVisible()
  expect(screen.getByRole('link', { name: es ? /Ver informe original/ : /View original report/ })).toHaveAttribute('href', pdf)
  await user.click(toggle)
  const issues = document.getElementById(toggle.getAttribute('aria-controls')!)!
  expect(panel).toContainElement(issues)
  expect(within(issues).queryByText(/Dates are shown as printed|Las fechas se muestran como en el informe/)).toBeNull()
  expect(issues.firstElementChild?.tagName).toBe('OL')
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
  // Each label carries one decorative icon: calendar for the two dates, document, wrench.
  const iconPaths = Array.from(first.querySelectorAll('dt'), node => node.querySelector('svg[aria-hidden="true"] path')?.getAttribute('d'))
  expect(iconPaths.every(Boolean)).toBe(true)
  expect(iconPaths[0]).toBe(iconPaths[1])
  expect(new Set(iconPaths).size).toBe(3)
  expect(first.querySelector('.report-issue-header a')).toHaveAttribute('href', `${pdf}#page=2`)
  expect(first.querySelectorAll('dd')).toHaveLength(4)
  expect(within(first).getByText(es ? /No se monitorearon/ : /Failed to monitor/)).toBeVisible()
  const links = within(issues).getAllByRole('link', { name: es ? /Informe, página 2/ : /Report, page 2/ })
  expect(links).toHaveLength(4)
  for (const link of links) expect(link).toHaveAttribute('href', `${pdf}#page=2`)
  expect(screen.queryByText(es ? /Directorio de ADH ·/ : /ADH directory ·/)).toBeNull()
  expect(screen.getByRole('link', { name: /ADH profile|Perfil de ADH/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
  expect(screen.getByRole('link', { name: es ? /Informe de 2025, página 1/ : /2025 report, page 1/ })).toHaveAttribute('href', `${pdf}#page=1`)
  expect(screen.getByText(es ? /^Directorio de ADH, revisado el .*2026\.$/ : 'ADH directory, checked Oct 14, 2026.')).toBeVisible()
  expect(screen.queryByText(/not readings or inspection findings|No son lecturas ni hallazgos/)).toBeNull()
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
  expect(screen.getByText(es ? 'No se reportaron infracciones' : 'No violations reported', { ignore: '.sr-only' })).toBeVisible()
  // A clean reviewed report is heading-only: no visible Reviewed date or caveat; the date is in the PDF link name.
  expect(screen.getByRole('heading', { name: es ? 'Informe anual' : 'Annual report' })).toBeVisible()
  expect(document.querySelector('.annual-report')).toHaveClass('annual-report-header-only')
  expect(document.querySelector('.annual-report .provider-card-facts')).toBeNull()
  expect(screen.queryByText(/Historical report|Informe histórico/)).toBeNull()
  expect(screen.queryByText(/^(Reviewed|Revisado)$/)).toBeNull()
  expect(screen.getByRole('link', { name: es ? /Ver informe original \(PDF\), revisado el 19.*oct.*2026/i : /View original report \(PDF\), reviewed Oct 19, 2026/ })).toHaveAttribute('href', 'https://example.org/2025.pdf')
  expect(screen.getByText(es ? /en el informe de 2025; no es una evaluación actual/ : /in the 2025 report; not a current water-safety assessment/)).toHaveClass('sr-only')
  expect(screen.queryByText(es ? /Revisión manual de ADH/ : /ADH report manually reviewed/)).toBeNull()
  expect(screen.queryByRole('button', { name: /^(View|Ver) / })).toBeNull()
  await user.selectOptions(select, '2024')
  expect(screen.getByText(es ? /en el informe de 2024; no es una evaluación actual/ : /in the 2024 report; not a current water-safety assessment/)).toHaveClass('sr-only')
  expect(screen.getByText(es ? 'Aún no revisado' : 'Not yet reviewed', { ignore: '.sr-only' })).toBeVisible()
  expect(screen.getByRole('link', { name: /Ver informe original|View original report/ })).not.toHaveAccessibleName(/reviewed|revisado/)
  expect(screen.queryByText(es ? 'No se reportaron infracciones' : 'No violations reported')).toBeNull()
  expect(screen.getByRole('link', { name: /Ver informe original|View original report/ })).toHaveAttribute('href', 'https://example.org/2024.pdf')
  await user.selectOptions(select, '2023')
  // A missing report has no document caveat; the pill names the missing year.
  expect(screen.queryByText(/in the 2023 report|en el informe de 2023/)).toBeNull()
  expect(screen.getByText(es ? 'No se encontró informe de 2023' : 'No 2023 report found')).toBeVisible()
  expect(screen.queryByRole('link', { name: /Ver informe original|View original report/ })).toBeNull()
  // The heading links to the agency search instead of a PDF; the title drops the year.
  expect(screen.getByRole('heading', { name: es ? 'Informe anual' : 'Annual report' })).toBeVisible()
  expect(screen.queryByText(es ? /No hay un informe disponible aquí/ : /No report is available here/)).toBeNull()
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
  await user.click(screen.getByRole('button', { name: /^Provider information/ }))
  expect(screen.getByText('Not yet reviewed', { ignore: '.sr-only' })).toHaveClass('status-pill')
  expect(screen.getByText('Not yet verified')).toHaveClass('status-pill')
  // The pills carry the status; the cards do not repeat them as sentences.
  expect(document.querySelectorAll('.provider-system-card .provider-card-facts')).toHaveLength(0)
  const card = document.querySelector('.provider-card.annual-report') as HTMLElement
  expect(card).toHaveClass('annual-report-header-only')
  expect(within(card).getByRole('link', { name: /ADH reports/ })).toHaveAttribute('href', 'https://health.arkansas.gov/eng/CCRSearch.aspx')
  expect(screen.queryAllByText(/not yet (been )?verified/i).filter(el => el.tagName === 'P')).toHaveLength(0)
  expect(screen.queryByText(/detailed profile has not been verified/)).toBeNull()
  expect(screen.queryByText('4 compliance issues reported')).toBeNull()
  expect(screen.queryByText('No violations reported')).toBeNull()
  expect(screen.queryByText('Roubidoux Formation Aquifer')).toBeNull()
  view.rerender(<SupplierInformation place={place} language="en" sample onView={() => {}} />)
  expect(screen.queryByText('4 compliance issues reported')).toBeNull()
  expect(screen.queryByRole('link', { name: /View original report/ })).toBeNull()
})

it.each(['en', 'es'] as const)('shows a dated violations chip in the collapsed %s header only when the report lists findings', async language => {
  const es = language === 'es'
  const view = render(<SupplierInformation place={place} language={language} sample={false} onView={() => {}} />)
  const header = screen.getByRole('button', { name: es ? /^Información del proveedor/ : /^Provider information/ })
  expect(header).toHaveAttribute('aria-expanded', 'false')
  expect(within(header).getByText(es ? '2025: 4 problemas de cumplimiento' : '2025: 4 compliance issues')).toHaveClass('status-pill')
  // Issue details stay collapsed after opening the section.
  await userEvent.setup().click(header)
  expect(screen.getByRole('button', { name: es ? 'Ver 4 problemas' : 'View 4 issues' })).toHaveAttribute('aria-expanded', 'false')
  // A clean report has no chip and a heading-only Annual report card.
  const clean = Object.keys(ANNUAL_REPORTS).find(id => ANNUAL_REPORTS[id][0]?.state === 'reviewed' && ANNUAL_REPORTS[id].every(r => r.state !== 'reviewed' || r.issues.length === 0))!
  view.rerender(<SupplierInformation place={{ ...place, id: clean }} language={language} sample={false} onView={() => {}} />)
  expect(document.querySelector('.provider-info-chip')).toBeNull()
  const card = document.querySelector('.provider-card.annual-report') as HTMLElement
  expect(card).toHaveClass('annual-report-header-only')
  expect(card.querySelector('.provider-card-heading .status-pill')).toHaveTextContent(es ? 'No se reportaron infracciones' : 'No violations reported')
  expect(card.querySelector('.provider-card-facts, .report-toggle')).toBeNull()
  expect(card.compareDocumentPosition(document.querySelector('.provider-system-card')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // Samples never show a chip.
  view.rerender(<SupplierInformation place={place} language={language} sample onView={() => {}} />)
  expect(document.querySelector('.provider-info-chip')).toBeNull()
})
