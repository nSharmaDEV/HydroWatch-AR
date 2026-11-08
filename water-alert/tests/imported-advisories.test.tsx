import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SupplierAlertHistory } from '../src/SupplierAlertHistory'
import { PLACE_CATALOG } from '../src/place-catalog'
import { SOURCES, statusFor, type Notice, type SourceSnapshot } from '../src/domain'
import { en, es } from '../src/strings'
import { IMPORTED_ADVISORIES, supplierHistory } from '../src/imported-advisories'

const rogers = PLACE_CATALOG.find(p => p.place.name === 'ROGERS WATER UTILITIES')!.place
const at = '2026-11-05T19:26:56.674Z'
const source: SourceSnapshot = { agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, historyStartedAt: at, error: null }
async function open(language: 'en' | 'es' = 'en', archive: Notice[] = [], snapshot = source, place = rogers) {
  render(<SupplierAlertHistory place={place} archive={archive} source={snapshot} now={Date.parse(at)} language={language} t={language === 'es' ? es : en} />)
  await userEvent.setup().click(screen.getByRole('button', { name: language === 'es' ? 'Historial de avisos' : 'Advisory history' }))
  return within(screen.getByRole('region', { name: language === 'es' ? 'Historial de avisos' : 'Advisory history' }))
}

it('shows reviewed Rogers history with original document links, wording and a visible source discrepancy', async () => {
  const panel = await open()
  expect(panel.getByText('Historical record imported')).toBeVisible()
  expect(panel.getByText('September 7, 2018')).toBeVisible()
  expect(panel.getByText('September 10, 2018')).toBeVisible()
  expect(panel.getByText(/FROM THE PRAIRIE CREEK AREA TO EAST OF THE HIGHWAY 12 BRIDGE/)).toHaveAttribute('lang', 'en')
  expect(panel.getByText(/IF YOU EXPERIENCED A COMPLETE LOSS OF WATER FLOW YOU ARE IN THE AFFECTED AREA/)).toBeVisible()
  expect(panel.getByText(/Source discrepancy:.*2016/)).toBeVisible()
  expect(panel.getByRole('link', { name: /Original notice/ })).toHaveAttribute('href', 'https://www.rogersar.gov/CivicSend/ViewMessage/message/67337')
  expect(panel.getByRole('link', { name: /Official lift notice/ })).toHaveAttribute('href', 'https://www.rogersar.gov/CivicSend/ViewMessage/message/67530')
  expect(panel.queryByRole('link', { name: /Open ADH notice list/ })).not.toBeInTheDocument()
  expect(panel.getByText('Status: Explicitly lifted')).toBeVisible()
  expect(panel.getByText(/History begins Nov 5, 2026/)).toBeVisible()
  expect(panel.getByText(/Separately sourced historical records may predate collection/)).toBeVisible()
  expect(panel.queryByText(/No advisory notices saved/)).not.toBeInTheDocument()
})

it('does not make an imported record current when the live source is unavailable', async () => {
  const unavailable = { ...source, error: 'Timeout' }
  const before = structuredClone(unavailable)
  const panel = await open('en', [], unavailable)
  expect(panel.getByText('Status: Explicitly lifted')).toBeVisible()
  expect(panel.queryByText('Status: Active advisory')).not.toBeInTheDocument()
  expect(statusFor(rogers.id, unavailable, Date.parse(at)).state).toBe('unavailable')
  expect(unavailable).toEqual(before)
})

it('keeps unresolved Fayetteville and unrelated supplier candidates out of history', async () => {
  const fayetteville = PLACE_CATALOG.find(p => p.place.name === 'FAYETTEVILLE WATERWORKS')!.place
  const panel = await open('en', [], source, fayetteville)
  expect(panel.getByText(en.supplierAlertEmpty)).toBeVisible()
  expect(panel.queryByText('Historical record imported')).not.toBeInTheDocument()
})

it('translates imported labels and limits without translating original official wording', async () => {
  const panel = await open('es')
  expect(panel.getByText('Registro histórico importado')).toBeVisible()
  expect(panel.getByText('Estado: Levantado explícitamente')).toBeVisible()
  expect(panel.getByText(/Discrepancia en la fuente:.*2016/)).toBeVisible()
  expect(panel.getByRole('link', { name: /Aviso original/ })).toHaveAttribute('rel', 'noopener noreferrer')
  expect(panel.getByText('September 7, 2018')).toHaveAttribute('lang', 'en')
})

it('keeps newest-first pagination when an older imported record extends observed history', async () => {
  const archive: Notice[] = Array.from({ length: 5 }, (_, i) => ({ id: `ADH:recent-${i}`, placeId: rogers.id, name: rogers.name, agency: 'ADH', kind: 'boil', county: rogers.county, area: `Published area ${i}`, reason: 'main break', issued: `11/${i + 1}/2026`, lifted: null, url: SOURCES.ADH, firstObservedAt: at }))
  const before = structuredClone(archive)
  const panel = await open('en', archive)
  expect(panel.getAllByRole('article')).toHaveLength(5)
  expect(panel.queryByText('Historical record imported')).not.toBeInTheDocument()
  await userEvent.setup().click(panel.getByRole('button', { name: 'Show more advisories' }))
  expect(panel.getAllByRole('article')).toHaveLength(6)
  expect(within(panel.getAllByRole('article')[5]).getByText('Historical record imported')).toBeVisible()
  expect(archive).toEqual(before)
})

it('reconciles only reviewed exact event IDs, preserving same-day distinct notices and saved evidence', () => {
  const historical = { ...IMPORTED_ADVISORIES[0], observedNoticeIds: ['ADH:reviewed-event'] }
  const notice: Notice = { id: 'ADH:reviewed-event', placeId: rogers.id, name: rogers.name, agency: 'ADH', kind: 'boil', county: rogers.county, area: historical.area, reason: historical.reason, issued: historical.issued, lifted: historical.lifted, url: SOURCES.ADH, firstObservedAt: at }
  const separate = { ...notice, id: 'ADH:distinct-event' }
  const saved = [notice, separate]
  const before = structuredClone(saved)
  const entries = supplierHistory(rogers.id, saved, [historical])
  expect(entries).toHaveLength(2)
  expect(entries.find(n => n.imported)?.record.id).toBe(historical.id)
  expect(entries.find(n => n.observed)?.record.id).toBe(separate.id)
  expect(saved).toEqual(before)
  expect(supplierHistory('ADH:other', [], [historical])).toEqual([])
})

it('does not invent a collection start from a historical publication date', async () => {
  const panel = await open('en', [], { ...source, historyStartedAt: undefined })
  expect(panel.getByText('September 7, 2018')).toBeVisible()
  expect(panel.getByText(new RegExp(en.supplierAlertUnknownStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible()
  expect(panel.queryByText(/History begins/)).not.toBeInTheDocument()
})
