import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { en, es } from '../src/strings'
import { SOURCES, type Notice, type SourceCheck, type SourceSnapshot } from '../src/domain'
import { sampleSources } from '../src/sample'
import { groupChecks } from '../src/source-checks'

const place = { id: 'ADH:bentonville water utilities', name: 'BENTONVILLE WATER UTILITIES', county: 'Benton', kind: 'system' as const }
const now = Date.parse('2026-10-14T12:10:00Z')
const at = '2026-10-14T12:00:00Z'
const notice: Notice = { id: 'ADH:notice', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: 'Benton', area: 'Creek Road customers', reason: 'Published main break', issued: '10/13/2026', lifted: null, url: SOURCES.ADH }
const success: SourceCheck & { outcome: 'success' } = { at, outcome: 'success', records: [{ ...notice, placeId: 'ADH:other', name: 'OTHER SUPPLIER' }] }
const failure: SourceCheck = { at: '2026-10-14T12:05:00Z', outcome: 'failure', error: 'Timeout' }
const source: SourceSnapshot = { agency: 'ADH', records: success.records, retrievedAt: failure.at, lastSuccessAt: at, error: 'Timeout', checks: [success, failure], lastSuccessfulCheck: success }
function card(s: SourceSnapshot = source, language: 'en' | 'es' = 'en') { return render(<StatusCard place={place} source={s} now={now} t={language === 'en' ? en : es} language={language} onView={() => {}} />) }
async function openInfo(language: 'en' | 'es' = 'en') { await userEvent.setup().click(screen.getByRole('button', { name: language === 'en' ? en.supplierAbout : es.supplierAbout })) }

it('keeps unavailable primary, links to ADH advisory list, and shows genuine historical supplier no-match with actual attempt', async () => {
  card()
  expect(screen.getByText('Current advisory status unavailable.')).toBeVisible()
  await openInfo()
  expect(screen.getByRole('link', { name: /Read official notice/ })).toHaveAttribute('href', SOURCES.ADH)
  expect(screen.queryByText('Last successful check')).not.toBeInTheDocument()
  const toggle = screen.getByRole('button', { name: 'Data-source activity' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.setup().click(toggle)
  expect(screen.getByText('Last successful check')).toBeVisible()
  expect(within(screen.getByRole('region', { name: 'Last successful check' })).getByText('No matching active advisory was found for this supplier during that check.')).toBeVisible()
  expect(screen.getByText('Historical result. Current advisory status is unconfirmed.')).toBeVisible()
  expect(screen.queryByText('Latest attempt')).not.toBeInTheDocument()
  expect(document.querySelector(`time[datetime="${failure.at}"]`)).toBeVisible()
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const timeline = screen.getByRole('list', { name: 'Source checks' })
  expect(within(timeline).getByText('Check failed')).toBeVisible()
  expect(within(timeline).getByText('No matching active advisory was found for this supplier during that check.')).toBeVisible()
   expect(screen.getByText('App checks of ADH’s published list—not water tests or a complete advisory archive.')).toBeVisible()
})

it('never infers successful evidence from legacy record absence', async () => {
  card({ ...source, checks: [], lastSuccessfulCheck: null, records: [], lastSuccessAt: at })
  await openInfo()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Data-source activity' }))
  expect(screen.getByText('No successful check recorded yet for this supplier.')).toBeVisible()
  expect(screen.queryByText('No matching active advisory was found for this supplier during that check.')).not.toBeInTheDocument()
})

it('labels historical active notices and preserves published details without confirming them current', async () => {
  const historical = { ...success, records: [notice] }
  card({ ...source, records: [notice], checks: [historical, failure], lastSuccessfulCheck: historical })
  await openInfo()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Data-source activity' }))
  const panel = document.querySelector('.last-check') as HTMLElement
  expect(within(panel).getByText('Matching active advisory found during that check.')).toBeVisible()
  expect(within(panel).queryByText('Creek Road customers')).not.toBeInTheDocument()
  const timeline = screen.getByRole('list', { name: 'Source checks' })
  expect(within(timeline).getByText('Creek Road customers')).toBeVisible()
  expect(within(timeline).getByText('10/13/2026')).toBeVisible()
  expect(within(timeline).getByText('Published main break')).toBeVisible()
  expect(within(panel).getByText('Historical result. Current advisory status is unconfirmed.')).toBeVisible()
})

it.each([
  [{ ...source, error: null, lastSuccessAt: '2026-10-13T12:00:00Z' }, 'The saved feed is more than 15 minutes old. Current status is unconfirmed.'],
  [{ ...source, error: 'Local API unavailable' }, 'The app cannot reach its backend. This is not a failed agency-feed check.'],
  [{ agency: 'ADH', records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }, 'This source has not been checked yet.'],
] as [SourceSnapshot, string][])('distinguishes stale, offline and never checked explanations', async (s, text) => {
  card(s)
  expect(screen.getByText('Current advisory status unavailable.')).toBeVisible()
  await openInfo()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Data-source activity' }))
  expect(within(screen.getByRole('dialog')).getByText(text)).toBeVisible()
})

it('shows a compact successful supplier finding with check evidence and coverage in the popup', async () => {
  card({ ...source, retrievedAt: at, error: null, checks: [success], lastSuccessfulCheck: success })
  expect(screen.getByText('No active advisory found')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Data-source activity' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Alert history' })).toHaveAttribute('aria-expanded', 'false')
  await openInfo()
  expect(screen.getByText('This does not establish water safety.')).toBeVisible()
  expect(document.querySelectorAll(`time[datetime="${at}"]`)).toHaveLength(1)
  expect(screen.queryByText('Last successful check')).not.toBeInTheDocument()
  expect(screen.queryByText('Latest attempt')).not.toBeInTheDocument()
  expect(screen.queryByText('No matching active advisory was found for this supplier during that check.')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Alert history' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Data-source activity' })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByText(en.coverage)).toBeVisible()
  expect(screen.getByRole('dialog', { name: 'Supplier details' })).toBeVisible()
})

it('keeps an active supplier advisory distinct without repeating historical findings', async () => {
  const active = { ...success, records: [notice] }
  card({ ...source, records: [notice], retrievedAt: at, error: null, checks: [active], lastSuccessfulCheck: active })
  expect(screen.getByText('Boil-water notice')).toBeVisible()
  expect(screen.queryByText('Last successful check')).not.toBeInTheDocument()
  expect(screen.queryByText('No active advisory found')).not.toBeInTheDocument()
  await openInfo()
  expect(screen.getByRole('link', { name: /Read official notice/ })).toBeVisible()
})

it.each(['stale', 'unknown'] as const)('keeps a successful but %s result unavailable without duplicate timestamps', async (state) => {
  const check = { ...success, records: state === 'unknown' ? [{ ...notice, liftStatus: 'unknown' as const }] : [] }
  render(<StatusCard place={place} source={{ ...source, records: check.records, retrievedAt: at, lastSuccessAt: at, error: null, checks: [check], lastSuccessfulCheck: check }} now={state === 'stale' ? now + 900000 : now} t={en} onView={() => {}} />)
  expect(screen.getByText('Current advisory status unavailable.')).toBeVisible()
  expect(screen.queryByText('No active advisory found')).not.toBeInTheDocument()
  await openInfo()
  expect(document.querySelectorAll(`time[datetime="${at}"]`)).toHaveLength(1)
})

it('groups only consecutive identical place results, preserving failures and edits, with progressive reveal', async () => {
  const checks: SourceCheck[] = [success, { ...success, at: '2026-10-14T12:01:00Z' }, failure, { ...success, at: '2026-10-14T12:06:00Z' }, { ...success, at: '2026-10-14T12:07:00Z', records: [notice] }, { ...success, at: '2026-10-14T12:08:00Z', records: [{ ...notice, reason: 'Changed reason' }] }, ...Array.from({ length: 5 }, (_, i) => ({ ...failure, at: `2026-10-14T12:${10 + i}:00Z`, error: `HTTP ${500 + i}` }))]
  card({ ...source, checks })
  const user = userEvent.setup()
  await openInfo()
  await user.click(screen.getByRole('button', { name: 'Data-source activity' }))
  expect(screen.getByRole('button', { name: 'Show more checks' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Show more checks' }))
   const repeated = screen.getByText(/2 checks with the same result/)
   expect(repeated).toBeVisible()
   expect(repeated.closest('summary')?.querySelector('[aria-hidden="true"]')).toHaveTextContent('▾')
   expect(screen.queryByText(/3 checks with the same result/)).not.toBeInTheDocument()
   await user.click(repeated)
  expect(screen.getByText('Changed reason')).toBeVisible()
})

it('never groups identical failures or successes across a failure, changed fact or local date', async () => {
  const checks: SourceCheck[] = [
    { ...success, at: '2026-10-14T04:58:00Z' }, { ...success, at: '2026-10-14T04:59:00Z' },
    { ...success, at: '2026-10-14T05:01:00Z' }, { ...success, at: '2026-10-14T05:02:00Z' },
    failure, { ...failure, at: '2026-10-14T12:06:00Z' },
    { ...success, at: '2026-10-14T12:07:00Z' },
    { ...success, at: '2026-10-14T12:08:00Z', records: [notice] },
  ]
  expect(groupChecks(place.id, checks).map(group => group.length)).toEqual([4, 1, 1, 1, 1])
  card({ ...source, checks })
  await openInfo()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Data-source activity' }))
  const history = document.querySelector('.check-history') as HTMLElement
  expect(history.textContent).not.toContain('America/Chicago')
  expect(history.textContent).not.toContain('Feed retrieved successfully')
  expect(history.textContent).not.toContain('Source:')
  expect(history.textContent).toContain(en.checkRetention)
  expect(within(history).getAllByText('Check failed')).toHaveLength(2)
  expect(history.querySelectorAll('.repeated-checks')).toHaveLength(2)
  expect(history.querySelectorAll('.check-date')).toHaveLength(2)
  expect(within(history).getByText(/11:58–11:59 PM CDT/)).toBeVisible()
  expect(within(history).getByText(/12:01–12:02 AM CDT/)).toBeVisible()
})

it('renders Spanish historical and failure copy', async () => {
  card(source, 'es')
  await openInfo('es')
  const toggle = screen.getByRole('button', { name: es.supplierActivity })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.setup().click(toggle)
  expect(screen.getByText('Última consulta exitosa')).toBeVisible()
  expect(screen.getByText('Resultado histórico. El estado actual de los avisos no está confirmado.')).toBeVisible()
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

it('provides explicitly fictional sample check evidence separately from live history', () => {
  const failed = sampleSources()[1]
  expect(failed.checks?.map(c => c.outcome)).toEqual(['success', 'failure'])
  expect(failed.lastSuccessfulCheck?.at).toBe(failed.lastSuccessAt)
  expect(failed.lastSuccessfulCheck?.records.every(n => n.id.startsWith('sample-'))).toBe(true)
  expect(sampleSources(true)[1].checks?.at(-1)?.outcome).toBe('success')
})
