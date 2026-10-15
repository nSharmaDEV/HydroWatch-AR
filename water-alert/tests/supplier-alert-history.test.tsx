import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'
import { en, es } from '../src/strings'

const place = { id: 'ADH:one', name: 'One supplier', county: 'Benton', kind: 'system' as const }
const at = '2026-10-14T12:00:00Z'
const notice: Notice = { id: 'ADH:one-notice', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: 'Published customers on Creek Road', reason: 'Published main break', issued: '10/13/2026', lifted: null, url: SOURCES.ADH, firstObservedAt: at, lastObservedAt: at }
const source: SourceSnapshot = { agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }
async function history(archive: Notice[], s = source, language: 'en' | 'es' = 'en') {
  render(<StatusCard place={place} source={s} archive={archive} now={Date.parse(at) + 60000} t={language === 'en' ? en : es} language={language} onView={() => {}} />)
  const toggle = screen.getByRole('button', { name: language === 'en' ? 'Alert history' : 'Historial de avisos' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.setup().click(toggle)
  return within(document.querySelector('.supplier-alert-history') as HTMLElement)
}

it('shows retained official content and sourced guidance, not repeated checks or other suppliers/sources', async () => {
  const retained = { ...notice, guidance: { quote: 'Synthetic official instructions', url: SOURCES.ADH, verifiedAt: at } }
  const panel = await history([retained, { ...notice, id: 'other', placeId: 'ADH:other' }, { ...notice, id: 'wrong-source', agency: 'ADEQ', url: SOURCES.ADEQ }, { ...notice, id: 'wrong-url', url: 'https://example.com' }], { ...source, checks: [{ at, outcome: 'success', records: [notice] }, { at: '2026-10-14T12:01:00Z', outcome: 'success', records: [notice] }] })
  expect(panel.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  expect(panel.getByText('Active advisory')).toBeVisible()
  for (const text of [notice.area, notice.reason, notice.issued!, retained.guidance.quote]) expect(panel.getByText(text)).toBeVisible()
  expect(panel.getByRole('link', { name: /Read official notice/ })).toHaveAttribute('href', SOURCES.ADH)
  expect(panel.queryByText('Check failed')).not.toBeInTheDocument()
})

it('shows explicit agency lifts and missing fields without substituting app observation times', async () => {
  const panel = await history([{ ...notice, area: '', reason: '', issued: null, lifted: '10/14/2026' }], { ...source, records: [] })
  expect(panel.getByText('Agency explicitly lifted')).toBeVisible()
  expect(panel.getByText('10/14/2026')).toBeVisible()
  expect(panel.getAllByText('Not provided in the source.')).toHaveLength(4)
  expect(panel.queryByText('Active advisory')).not.toBeInTheDocument()
  expect(panel.getByText(/App first observed/)).toBeVisible()
})

it.each([false, true])('never infers a lift from disappearance or failed retrieval (failure=%s)', async failure => {
  const panel = await history([notice], { ...source, records: [], error: failure ? 'Timeout' : null })
  expect(panel.getByText('Previously observed · current status unconfirmed')).toBeVisible()
  expect(panel.queryByText('Agency explicitly lifted')).not.toBeInTheDocument()
  expect(panel.queryByText('Active advisory')).not.toBeInTheDocument()
  expect(panel.getAllByText('Not provided in the source.')).toHaveLength(2)
  if (failure) expect(screen.getByText('Current advisory status unavailable.')).toBeVisible()
})

it('does not create history or a start date from complete check logs or legacy retrieval times', async () => {
  const panel = await history([], { ...source, checks: [{ at, outcome: 'success', records: [notice] }] })
  expect(panel.getByText('No advisory notices saved for this supplier.')).toBeVisible()
  expect(panel.queryByText(notice.area)).not.toBeInTheDocument()
  expect(panel.queryByText(/History begins/)).not.toBeInTheDocument()
})

it('shows a saved source-specific history date even when no notices were retained', async () => {
  const panel = await history([], { ...source, records: [], historyStartedAt: at })
  expect(panel.getByText(/History begins Oct 14, 2026 and may not include earlier advisories\./)).toBeVisible()
})

it('offers Spanish alert history while keeping official text verbatim', async () => {
  const panel = await history([notice], source, 'es')
  expect(panel.getByText(notice.reason)).toBeVisible()
  expect(panel.getAllByText('No proporcionado en la fuente.')).toHaveLength(2)
})
