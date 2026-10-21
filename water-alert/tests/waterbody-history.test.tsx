import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'
import { en, es } from '../src/strings'
import { lakeCardStrings } from '../src/lake-card-strings'

const at = '2026-10-20T12:00:00Z'
const place = { id: 'ADEQ:layout-lake', name: 'Synthetic Lake', county: 'Benton', kind: 'lake' as const }
const notice: Notice = { id: 'hab-one', placeId: place.id, name: place.name, agency: 'ADEQ', kind: 'hab', county: place.county, area: 'Published north cove', issued: 'June 3, 2020', sourceUpdatedAt: 'September 28, 2026', lifted: null, liftStatus: 'unknown', reason: '', url: SOURCES.ADEQ, firstObservedAt: at }

it.each(['en', 'es'] as const)('separates feed-wide updates from lake conditions and notice issue dates (%s)', language => {
  const t = language === 'en' ? en : es
  const source: SourceSnapshot = { agency: 'ADEQ', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
  const summary = within(document.querySelector('.supplier-finding') as HTMLElement)
  expect(summary.getByText(language === 'en' ? 'Harmful algal bloom notice' : 'Aviso de algas nocivas')).toBeVisible()
  expect(summary.getByText(language === 'en' ? 'Active/lifted status unconfirmed' : 'Estado activo o levantado sin confirmar')).toBeVisible()
  expect(summary.getByText(language === 'en' ? 'ADEQ feed updated' : 'Actualización del feed de ADEQ')).toBeVisible()
  expect(summary.getByText(notice.sourceUpdatedAt!)).toBeVisible()
  expect(summary.getByText(language === 'en' ? 'This feed-wide date does not establish a change in this lake’s conditions.' : 'Esta fecha del feed no confirma un cambio en las condiciones de este lago.')).toBeVisible()
  expect(screen.queryByText(t.waterbodyHelp)).not.toBeInTheDocument()
})

it.each(['en', 'es'] as const)('uses supplier-style advisory facts for waterbodies without inventing missing data (%s)', async language => {
  const t = language === 'en' ? en : es
  const source: SourceSnapshot = { agency: 'ADEQ', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null, checks: [{ at, outcome: 'success', records: [notice] }], lastSuccessfulCheck: { at, outcome: 'success', records: [notice] } }
  render(<StatusCard place={place} archive={[notice, { ...notice, id: 'other-lake', placeId: 'ADEQ:other' }, { ...notice, id: 'wrong-agency', agency: 'ADH', kind: 'boil' }]} source={source} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: lakeCardStrings[language].record }))
  const panel = within(screen.getByRole('region', { name: lakeCardStrings[language].record }))
  expect(panel.getAllByRole('article')).toHaveLength(1)
  for (const value of [notice.area, notice.issued!, notice.sourceUpdatedAt!]) expect(panel.getByText(value)).toBeVisible()
  expect(panel.getByText(language === 'en' ? 'Status: Unconfirmed' : 'Estado: Sin confirmar')).toBeVisible()
  expect(panel.getByText(lakeCardStrings[language].unknown)).toBeVisible()
  expect(panel.queryByText(t.supplierAlertReason)).not.toBeInTheDocument()
  expect(panel.getByText(lakeCardStrings[language].location)).toBeVisible()
  expect(panel.getByRole('link', { name: /ADEQ/ })).toHaveAttribute('href', SOURCES.ADEQ)
  expect(panel.queryByText('ADH')).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: lakeCardStrings[language].activity }))
  expect(within(screen.getByRole('region', { name: t.checkLastSuccess })).getByText(t.checkUnknown)).toBeVisible()
  expect(panel.queryByText(t.supplierCheckMeaning)).not.toBeInTheDocument()
  expect(document.querySelector('.supplier-source-activity')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: t.checkLatest })).toBeVisible()
  expect(screen.getByText(t.checkSucceeded)).toBeVisible()
})

it.each(['active', 'lifted'] as const)('retains explicit HAB state and dates (%s)', async state => {
  const record = { ...notice, liftStatus: undefined, lifted: state === 'lifted' ? 'October 19, 2026' : null }
  const source: SourceSnapshot = { agency: 'ADEQ', records: [record], retrievedAt: at, lastSuccessAt: at, error: null }
  render(<StatusCard place={place} archive={[]} source={source} now={Date.parse(at)} t={en} language="en" onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: lakeCardStrings.en.record }))
  const panel = within(screen.getByRole('region', { name: lakeCardStrings.en.record }))
  expect(panel.getByText(state === 'lifted' ? 'Status: Agency explicitly lifted' : 'Status: Active advisory')).toBeVisible()
  if (state === 'lifted') expect(panel.getByText(record.lifted!)).toBeVisible()
})

it.each([false, true])('does not infer an active HAB notice or a lift from disappearance (failed=%s)', async failed => {
  const source: SourceSnapshot = { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: failed ? 'Synthetic failure' : null }
  render(<StatusCard place={place} archive={[{ ...notice, liftStatus: undefined }]} source={source} now={Date.parse(at)} t={en} language="en" onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: lakeCardStrings.en.record }))
  expect(within(screen.getByRole('region', { name: lakeCardStrings.en.record })).getByText('Status: Unconfirmed')).toBeVisible()
})
