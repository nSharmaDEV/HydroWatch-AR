import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import manifest from '../docs/research/adh-ccr-2025/manifest.json'
import { ANNUAL_REPORTS } from '../src/annual-reports'
import { AnnualWaterReport } from '../src/AnnualWaterReport'
import { SupplierInformation } from '../src/SupplierProfile'
import { PLACE_CATALOG } from '../src/place-catalog'

const byPws = (pws: string) => {
  const source = manifest.find(r => r.pwsId === pws)!
  return ANNUAL_REPORTS[source.id]
}

it('covers the reviewed scope with exact identities, source URLs and honest exceptions', () => {
  for (const entry of PLACE_CATALOG.filter(e => e.place.kind === 'system')) {
    expect(manifest.some(r => r.id === entry.place.id)).toBe(true)
  }
  for (const source of manifest) {
    const reports = ANNUAL_REPORTS[source.id]
    expect(reports, source.name).toHaveLength(1)
    const report = reports[0]
    expect(report.year).toBe(2025)
    if (source.sourceUrl) {
      expect(report).toHaveProperty('url', source.sourceUrl)
      expect(report.state).toBe(source.pwsId === '575' ? 'unreviewed' : 'reviewed')
      if (report.state === 'reviewed') for (const issue of report.issues) {
        expect(issue.page).toBeLessThanOrEqual(source.physicalPages!)
        expect(issue.title.en).not.toBe('')
        expect(issue.title.es).not.toBe('')
      }
    } else expect(report.state).toBe('unavailable')
  }
})

it.each(['en', 'es'] as const)('formats Gurdon deficiencies as inspection findings, not dated violations (%s)', async language => {
  const es = language === 'es'
  const user = userEvent.setup()
  render(<AnnualWaterReport reports={byPws('087') ?? []} language={language} />)
  expect(screen.getByText(es ? '1 hallazgo reportado' : '1 finding reported')).toBeVisible()
  const toggle = screen.getByRole('button', { name: es ? 'Ver 1 hallazgo' : 'View 1 finding' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await user.click(toggle)
  expect(screen.getByText(es ? 'Deficiencia significativa' : 'Significant deficiency', { exact: true })).toBeVisible()
  expect(screen.getByText(es ? 'Identificado el' : 'Identified on')).toBeVisible()
  expect(screen.getByText('04/22/2025')).toBeVisible()
  expect(screen.queryByText(es ? 'Desde (según el informe)' : 'Reported from')).toBeNull()
  expect(screen.getByText(es ? /lubricante del pozo Airport/ : /Airport Well lubricant/)).toBeVisible()
  expect(screen.getByRole('link', { name: /página 2|page 2/ })).toHaveAttribute('href', 'https://health.arkansas.gov/eng/d.aspx?P=087&YEAR=2025#page=2')
})

it.each(['042', '063', '492'])('preserves separate violation intervals without duplicating the finding (%s)', async pws => {
  render(<AnnualWaterReport reports={byPws(pws) ?? []} language="en" />)
  await userEvent.setup().click(screen.getByRole('button', { name: /View/ }))
  const periods = screen.getByText('Reported periods').nextElementSibling!
  expect(within(periods as HTMLElement).getAllByRole('listitem')).toHaveLength(2)
  expect(document.querySelector('.report-issues>ol')!.children).toHaveLength(pws === '492' ? 1 : 2)
})

it('attributes Leslie turbidity to its upstream supplier and leaves missing dates unprovided', async () => {
  render(<AnnualWaterReport reports={byPws('500') ?? []} language="en" />)
  await userEvent.setup().click(screen.getByRole('button', { name: /View/ }))
  const row = screen.getByRole('heading', { name: 'Upstream supplier turbidity' }).closest('li')!
  expect(within(row).getByText('Upstream supplier finding')).toBeVisible()
  expect(within(row).getByText(/Community Water.*2.49 NTU/)).toBeVisible()
  expect(within(row).getAllByText('Not provided in the report')).toHaveLength(3)
})

it.each(['en', 'es'] as const)('shows contradictory and missing reports without reassuring findings (%s)', async language => {
  const view = render(<AnnualWaterReport reports={byPws('845') ?? []} language={language} />)
  expect(screen.getByText(/contradicción|Document conflict/i, { selector: '.report-review-note' })).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: /View|Ver/ }))
  expect(screen.getByText(/58 ppb/)).toBeVisible()
  expect(screen.getByText(/01\/04\/2024/)).toBeVisible()
  expect(screen.queryByText(/No violations reported|No se reportaron infracciones/)).toBeNull()
  const missing = manifest.find(r => !r.sourceUrl)!
  view.rerender(<AnnualWaterReport reports={ANNUAL_REPORTS[missing.id] ?? []} language={language} />)
  expect(screen.getByText(language === 'es' ? 'Informe no disponible' : 'Report unavailable')).toBeVisible()
  expect(screen.getByText(/2025.*ADH/)).toBeVisible()
  expect(screen.queryByRole('link', { name: /original/ })).toBeNull()
})

it('wires observed suppliers through Provider information without leaking reports to samples', async () => {
  const source = manifest.find(r => r.pwsId === '087')!
  const place = { id: source.id, name: source.name, kind: 'system' as const, county: source.county ?? '' }
  const view = render(<SupplierInformation place={place} sample={false} language="en" onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Provider information' }))
  expect(screen.getByText('1 finding reported')).toBeVisible()
  view.rerender(<SupplierInformation place={place} sample language="en" onView={() => {}} />)
  expect(screen.queryByText('1 finding reported')).toBeNull()
})
