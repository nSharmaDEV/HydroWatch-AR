import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { StatusCard } from '../src/components'
import { SupplierInformation, SupplierProfile } from '../src/SupplierProfile'
import { PLACE_CATALOG } from '../src/place-catalog'
import { en, es } from '../src/strings'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'

const suppliers = PLACE_CATALOG.filter(entry => entry.place.kind === 'system')
const at = '2026-10-19T12:00:00Z'
const expected = [
  ['569', '116398', 'Nov 30, 2022'],
  ['575', '100795', 'Jan 24, 2023'],
  ['055', '81443', 'Aug 28, 2025'],
  ['041', '51250', 'Feb 29, 2024'],
]

it.each(suppliers.map((entry, i) => [entry.place.name, entry.place, expected[i]] as const))('shows exact reviewed facts for %s, not Leisure Hills facts', (_name, place, facts) => {
  render(<SupplierProfile place={place} language="en" sample={false} />)
  for (const fact of facts) expect(screen.getByText(fact)).toBeVisible()
  expect(screen.getByText('Purchased surface water')).toBeVisible()
  expect(screen.getByText('Community system')).toBeVisible()
  expect(screen.queryByText('WELL #1')).toBeNull()
  expect(screen.queryByText('113')).toBeNull()
  expect(screen.getByRole('link', { name: /ADH profile/ })).toHaveAttribute('href', suppliers.find(entry => entry.place.id === place.id)!.url)
})

for (const language of ['en', 'es'] as const) {
  const t = language === 'en' ? en : es
  it.each(suppliers.map(entry => [entry.place.name, entry.place] as const))(`has the shared source-water section for %s (${language})`, async (_name, place) => {
    render(<SupplierInformation place={place} language={language} sample={false} onView={() => {}} />)
    await userEvent.setup().click(screen.getByRole('button', { name: t.providerHelp }))
    expect(screen.getByRole('heading', { name: language === 'en' ? 'Where your water comes from' : 'De dónde viene tu agua' })).toBeVisible()
    expect(document.querySelector('.provider-water-source')).toHaveTextContent('Beaver Water District')
    expect(document.querySelector('.provider-water-source a')).toHaveAttribute('href', suppliers.find(entry => entry.place.id === place.id)!.url)
    expect(screen.queryByText('Roubidoux Formation Aquifer')).toBeNull()
    const report = within(screen.getByRole('region', { name: language === 'en' ? 'Annual water-quality report' : 'Informe anual de calidad del agua' }))
    if (place.name.startsWith('SPRINGDALE')) {
      expect(report.getByText(language === 'en' ? 'Report not yet reviewed' : 'Informe aún no revisado')).toBeVisible()
      expect(report.getByText(/2024.*2025/)).toBeVisible()
      expect(report.queryByText(language === 'en' ? 'No violations reported' : 'No se reportaron infracciones')).toBeNull()
    } else {
      expect(report.getByText(language === 'en' ? 'No violations reported' : 'No se reportaron infracciones')).toBeVisible()
    }
    expect(report.getByRole('link', { name: /View original report|Ver informe original/ })).toHaveAttribute('href', `https://health.arkansas.gov/eng/d.aspx?P=${expected[suppliers.findIndex(entry => entry.place.id === place.id)][0]}&YEAR=2025`)
  })

  for (const state of ['active', 'none', 'unavailable'] as const) {
    it.each(suppliers.map(entry => [entry.place.name, entry.place] as const))(`keeps all supplier tools available for %s (${language}, ${state})`, async (_name, place) => {
      const user = userEvent.setup()
      const help = vi.fn()
      const notice: Notice = { id: 'parity-synthetic', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: 'Synthetic area', reason: 'Synthetic reason', issued: '10/19/2026', lifted: null, url: SOURCES.ADH }
      const source: SourceSnapshot = { agency: 'ADH', records: state === 'active' ? [notice] : [], retrievedAt: at, lastSuccessAt: at, error: state === 'unavailable' ? 'Synthetic failure' : null }
      render(<StatusCard place={place} source={source} now={Date.parse(at)} t={t} language={language} onHelp={help} onView={() => {}} />)
      expect(document.querySelector('.supplier-contact-section summary')).toBeVisible()
      expect(screen.getByRole('button', { name: t.supplierAlertHistory })).toBeVisible()
      await user.click(screen.getByRole('button', { name: t.providerHelp }))
      expect(screen.getByRole('heading', { name: language === 'en' ? 'Where your water comes from' : 'De dónde viene tu agua' })).toBeVisible()
      await user.click(document.querySelector('.provider-more>summary')!)
      expect(screen.getByText(expected[suppliers.findIndex(entry => entry.place.id === place.id)][0])).toBeVisible()
      await user.click(screen.getByRole('button', { name: language === 'en' ? 'Get help with a water issue' : 'Obtener ayuda con un problema de agua' }))
      expect(help).toHaveBeenCalledOnce()
      await user.click(screen.getByRole('button', { name: t.supplierAbout }))
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.queryAllByRole('checkbox')).toHaveLength(state === 'active' ? 3 : 0)
      if (state !== 'active') expect(dialog.getByText(state === 'none' ? t.noneBoil : t.supplierUnavailable)).toBeVisible()
    })
  }
}
