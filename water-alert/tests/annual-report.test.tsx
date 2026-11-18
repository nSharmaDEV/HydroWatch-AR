import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SupplierInformation } from '../src/SupplierProfile'
import type { Place } from '../src/domain'
import { AnnualWaterReport } from '../src/AnnualWaterReport'
import { ANNUAL_REPORTS, type AnnualReport } from '../src/annual-reports'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const pdf = 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025'

it.each(['en', 'es'] as const)('shows %s findings, then records, then the water-system facts', async language => {
  const es = language === 'es'
  const user = userEvent.setup()
  render(<SupplierInformation place={place} language={language} sample={false} onView={() => {}} />)
  await user.click(screen.getByRole('button', { name: es ? /^Información del proveedor/ : /^Provider information/ }))
  // The badge counts distinct historical issues, and says so to a screen reader.
  expect(screen.getByRole('button', { name: es ? /4 hallazgos históricos/ : /4 historical findings/ })).toBeVisible()
  expect(screen.getByText(es ? /hallazgos históricos en registros con fecha, no es el estado actual/ : /historical findings in dated records, not the current status/)).toHaveClass('sr-only')
  const cards = Array.from(document.querySelectorAll('.provider-cards>.provider-card'), node => node.className)
  expect(cards[0]).toContain('evidence-findings')
  expect(cards[0]).toContain('evidence-records')
  expect(cards[1]).toContain('provider-system-card')

  // Full inline issues retain dates, source links, reported facts and actions.
  const findings = document.querySelector('.evidence-findings') as HTMLElement
  expect(within(findings).queryByText(es ? /no indican si el agua es segura hoy/ : /not today’s water safety/)).toBeNull()
  await user.click(screen.getByRole('button', { name: es ? /Todos los problemas registrados/ : /All recorded problems/ }))
  for (const summary of document.querySelectorAll('.evidence-type-group>summary')) await user.click(summary)
  const all = document.querySelectorAll('.evidence-inline-issue')
  expect(all).toHaveLength(4)
   expect(within(all[0] as HTMLElement).getByText(es ? /No se presentaron muestras bacteriológicas/ : /Failed to submit valid bacteriological samples/, { selector: 'dd' })).toBeVisible()
   expect(all[0].querySelector('.evidence-inline-dates')).toHaveTextContent('10/01/2025')
    expect(screen.getByText(es ? /“Current”.*según el informe/ : /“Current”.*as printed in the report/)).toBeVisible()
   expect(within(all[0] as HTMLElement).queryByText(es ? 'Resolución no confirmada' : 'Resolution not confirmed')).toBeNull()
  expect(within(all[0] as HTMLElement).getByRole('link', { name: /Report|Informe/ })).toHaveAttribute('href', `${pdf}#page=2`)
  expect(document.querySelector('dialog')).toBeNull()

  // Reports and records: the source states, the document and its review method.
  const records = document.querySelector('.evidence-records') as HTMLElement
  expect(within(records).getByRole('heading', { name: es ? 'Informe anual' : 'Annual report' })).toBeVisible()
  expect(within(records).getByRole('heading', { name: es ? 'Registros de EPA' : 'EPA records' })).toBeVisible()
  // Source details moved to Settings; each source row keeps its link and review method.
  expect(within(records).queryByRole('button', { name: es ? 'Detalles de las fuentes' : 'Source details' })).toBeNull()
  const rows = records.querySelector('.evidence-source-headers') as HTMLElement
  expect(within(rows).getByRole('link', { name: es ? 'Abrir PDF' : 'Open PDF' })).toHaveAttribute('href', pdf)
  expect(within(rows).getByText(es ? /Revisado por una persona/ : /Reviewed by a person/)).toBeVisible()
  // Per-problem notes (source quotes, conflicts, record limits) stay internal for emails, not on the card.
  expect(screen.queryByText(es ? 'Notas sobre cada problema' : 'Notes about individual problems')).toBeNull()
  expect(document.querySelector('.evidence-quote')).toBeNull()

  // Water-system facts keep their directory provenance and gain the federal PWS ID.
  const system = document.querySelector('.provider-system-card') as HTMLElement
  expect(Array.from(system.querySelectorAll('.provider-card-facts dt'), node => node.textContent)).toEqual(es
    ? ['Fuente de agua', 'Nombre de la fuente', 'ID del sistema', 'ID federal PWS (verificado)', 'Tipo de sistema', 'Personas atendidas', 'Última inspección de ADH']
    : ['Water source', 'Source name', 'System ID', 'Federal PWS ID (verified)', 'System type', 'People served', 'Last ADH inspection'])
  expect(within(system).getByText('Roubidoux Formation Aquifer')).toBeVisible()
  expect(within(system).getByText('WELL #1')).toBeVisible()
  expect(within(system).getByText('113')).toBeVisible()
  expect(within(system).getByText('AR0000747')).toBeVisible()
  expect(screen.getByRole('link', { name: /ADH profile|Perfil de ADH/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
  expect(screen.getByRole('link', { name: es ? /Referencia de la fuente de agua/ : /Water source reference/ })).toHaveAttribute('href', `${pdf}#page=1`)
  expect(screen.getByText(es ? /^Directorio de ADH, revisado el .*2026\.$/ : 'ADH directory, checked Oct 14, 2026.')).toBeVisible()
  expect(screen.queryByRole('button', { name: /More details|Más detalles/ })).toBeNull()
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
  // Nothing has been retrieved, so there is no badge and no reassuring zero.
  expect(document.querySelector('.provider-info-chip')).toBeNull()
  expect(screen.getByText('Not yet verified')).toHaveClass('status-pill')
  expect(document.querySelectorAll('.provider-system-card .provider-card-facts')).toHaveLength(0)
  expect(document.querySelectorAll('.evidence-record-list>li')).toHaveLength(0)
  expect(within(document.querySelector('.evidence-source-headers') as HTMLElement).getByText('Not checked yet')).toBeVisible()
  // No verified federal id for an unknown supplier, so that lookup is not offered.
  expect(within(document.querySelector('.evidence-source-headers') as HTMLElement).getByText('Not available here')).toBeVisible()
  // No problems and no Source details; the general coverage note lives in Settings → Sources.
  expect(screen.queryByRole('button', { name: 'Source details' })).toBeNull()
  expect(screen.queryByText('Notes about individual problems')).toBeNull()
  expect(screen.queryByText(/Failed to submit valid bacteriological samples/)).toBeNull()
  expect(screen.queryByText('Roubidoux Formation Aquifer')).toBeNull()
  view.rerender(<SupplierInformation place={place} language="en" sample onView={() => {}} />)
  expect(document.querySelector('.provider-info-chip')).toBeNull()
  expect(document.querySelector('.evidence-findings')).toBeNull()
  expect(screen.queryByText(/Failed to submit valid bacteriological samples/)).toBeNull()
})

it.each(['en', 'es'] as const)('counts distinct issues in the collapsed %s header and never reports a clean zero without records', async language => {
  const es = language === 'es'
  const view = render(<SupplierInformation place={place} language={language} sample={false} onView={() => {}} />)
  const header = screen.getByRole('button', { name: es ? /^Información del proveedor/ : /^Provider information/ })
  expect(header).toHaveAttribute('aria-expanded', 'false')
  expect(within(header).getByText(es ? '4 hallazgos históricos' : '4 historical findings')).toHaveClass('status-pill')
  await userEvent.setup().click(header)
  expect(screen.getByRole('button', { name: es ? /Todos los problemas registrados/ : /All recorded problems/ })).toHaveAttribute('aria-expanded', 'false')
  // Records read and reviewed with nothing identified: a neutral, qualified chip.
  const clean = Object.keys(ANNUAL_REPORTS).find(id => ANNUAL_REPORTS[id][0]?.state === 'reviewed' && ANNUAL_REPORTS[id].every(r => r.state !== 'reviewed' || r.issues.length === 0))!
  view.rerender(<SupplierInformation place={{ ...place, id: clean }} language={language} sample={false} onView={() => {}} />)
  const chip = document.querySelector('.provider-info-chip') as HTMLElement
  expect(chip).toHaveClass('status-pill-clear')
  expect(chip).toHaveTextContent(es ? 'No se encontraron problemas' : 'No problems found')
  expect(chip).toHaveTextContent(es ? 'no es el estado actual' : 'not the current status')
  expect(document.querySelector('.evidence-findings')!.compareDocumentPosition(document.querySelector('.provider-system-card')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // Samples never show a chip.
  view.rerender(<SupplierInformation place={place} language={language} sample onView={() => {}} />)
  expect(document.querySelector('.provider-info-chip')).toBeNull()
})
