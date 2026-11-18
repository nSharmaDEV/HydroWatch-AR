import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SupplierInformation } from '../src/SupplierProfile'
import { REPORT_CHECK_KEY } from '../src/report-check'
import type { Place } from '../src/domain'

// In the EPA directory, with no reviewed annual report.
const cave: Place = { id: 'ADH:76a865f0e02e2f8186f51f0623cc6ddc0dab83d8577f0f3a08de19c838d19183', name: 'CAVE SPRINGS WATERWORKS', county: 'Benton', kind: 'system' }
const bentonville: Place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', county: 'Benton', kind: 'system' }
const pdfUrl = 'https://health.arkansas.gov/eng/d.aspx?P=043&YEAR=2025'

const answer = (body: unknown) => vi.fn(async () => Response.json(body))
beforeEach(() => localStorage.clear())
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

const records = () => document.querySelector('.evidence-records') as HTMLElement
// Checks run automatically on opening; each source row carries its own state.
const sourceRows = () => document.querySelector('.evidence-source-headers') as HTMLElement

async function openProviderInfo(place: Place, language: 'en' | 'es' = 'en', sample = false) {
  const user = userEvent.setup()
  render(<SupplierInformation place={place} language={language} sample={sample} />)
  await user.click(screen.getByRole('button', { name: language === 'es' ? /^Información del proveedor/ : /^Provider information/ }))
  return user
}

it('automatically finds and links the report on opening, then keeps it on this device', async () => {
  const fetcher = answer({ state: 'unreviewed', year: 2025, url: pdfUrl, checkedAt: '2026-11-16' })
  vi.stubGlobal('fetch', fetcher)
  await openProviderInfo(cave)
  expect(await within(sourceRows()).findByRole('link', { name: 'Open PDF' })).toHaveAttribute('href', pdfUrl)
  // Still unread: a linked document is never a summary or a safety result.
  expect(within(sourceRows()).getByText(/^Not read · Checked Nov 16, 2026$/)).toBeVisible()
  expect(document.querySelectorAll('.evidence-inline-issue')).toHaveLength(0)
  expect(JSON.parse(localStorage.getItem(REPORT_CHECK_KEY)!)[cave.id]).toEqual({ state: 'unreviewed', year: 2025, url: pdfUrl, checkedAt: '2026-11-16' })
  expect(fetcher.mock.calls.some(call => String((call as unknown as [string])[0]) === '/api/annual-report/check')).toBe(true)
})

it('reports a completed search that found nothing without implying safety', async () => {
  vi.stubGlobal('fetch', answer({ state: 'unavailable', year: 2025, checkedAt: '2026-11-16' }))
  await openProviderInfo(cave)
  // How to obtain an unretrieved report is explained once, in Settings → Sources.
  expect(await within(sourceRows()).findByText(/^Not retrieved · Checked Nov 16, 2026$/)).toBeVisible()
  expect(screen.queryByText(/No violations reported/)).toBeNull()
  expect(document.querySelector('.provider-info-chip')).toBeNull()
})

it.each(['ambiguous', 'incomplete'] as const)('stores nothing and keeps evidence when the check is %s', async (state) => {
  vi.stubGlobal('fetch', answer({ state }))
  await openProviderInfo(cave)
  expect((await screen.findAllByText('Update failed')).length).toBeGreaterThan(0)
  expect(localStorage.getItem(REPORT_CHECK_KEY)).toBeNull()
  expect(within(document.querySelector('.evidence-source-headers') as HTMLElement).getAllByText('Update failed')).toHaveLength(2)
  expect(within(records()).queryByRole('link', { name: 'Open' })).toBeNull()
})

it('treats a failed request as unchecked, never as no report', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 503 })))
  await openProviderInfo(cave)
  expect((await screen.findAllByText('Update failed')).length).toBeGreaterThan(0)
  expect(localStorage.getItem(REPORT_CHECK_KEY)).toBeNull()
  expect(screen.queryByText(/No 2025 report found/)).toBeNull()
})

it('allows rechecking a reviewed report without replacing its hand-reviewed findings', async () => {
  const fetcher = answer({ state: 'autoRead', year: 2025, url: pdfUrl, readOn: '2026-11-16', issues: [], checkedAt: '2026-11-16' })
  vi.stubGlobal('fetch', fetcher)
  await openProviderInfo(bentonville)
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
  // The source check is device-local and must not replace the shipped human review.
  expect(await within(sourceRows()).findByText(/^Reviewed by a person · Checked Nov 16, 2026$/)).toBeVisible()
  // Reviewed records with nothing identified show the neutral chip.
  expect(document.querySelector('.provider-info-chip')).toHaveTextContent('No problems found')
})

it('keeps source review information and a neutral chip after a PDF read with nothing identified', async () => {
  vi.stubGlobal('fetch', answer({ state: 'autoRead', year: 2025, url: pdfUrl, readOn: '2026-11-16', issues: [], checkedAt: '2026-11-16' }))
  await openProviderInfo(cave)
  expect(await within(sourceRows()).findByText(/^Read from the document’s tables/)).toBeVisible()
  expect(document.querySelector('.provider-info-chip')).toHaveTextContent('No problems found')
})

it('never offers the check on fictional sample records', async () => {
  render(<SupplierInformation place={cave} language="en" sample />)
  expect(screen.queryByRole('button', { name: /^Check for:/ })).toBeNull()
  expect(document.querySelector('.evidence-records')).toBeNull()
})

it('offers the check in Spanish and keeps a stored result after a reload', async () => {
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify({ [cave.id]: { state: 'unreviewed', year: 2025, url: pdfUrl, checkedAt: '2026-11-16' } }))
  vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 503 })))
  await openProviderInfo(cave, 'es')
  expect(await within(sourceRows()).findByRole('link', { name: 'Abrir PDF' })).toHaveAttribute('href', pdfUrl)
  expect(within(sourceRows()).getByText(/Sin leer/)).toBeVisible()
})

it('shows an automatic read’s findings labelled as read from the PDF, never as reviewed or AI', async () => {
  const issue = { category: 'publicNotice', heading: { en: 'Public notice', es: 'Aviso público' }, title: { en: 'Failed to conduct a public notice regarding a total coliform monitoring violation', es: 'Failed to conduct a public notice regarding a total coliform monitoring violation' }, action: { en: 'No corrective action taken', es: 'No corrective action taken' }, reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2 }
  vi.stubGlobal('fetch', answer({ state: 'autoRead', year: 2025, url: pdfUrl, readOn: '2026-11-16', issues: [issue], checkedAt: '2026-11-16' }))
  const user = await openProviderInfo(cave)
  expect(await screen.findByRole('button', { name: /Provider information.*1 historical finding/ })).toBeVisible()
  await user.click(screen.getByRole('button', { name: /All recorded problems/ }))
  const rows = document.querySelectorAll('.evidence-inline-issue')
  expect(rows).toHaveLength(1)
  // Labelled as an automatic read, and never offered as the agency's exact words.
  expect(screen.queryByText('Not reviewed by a person.')).toBeNull()
  expect(within(sourceRows()).getByText(/^Read from the document’s tables/)).toBeVisible()
  expect(screen.queryByText(/AI summary/)).toBeNull()
  expect(screen.queryByText('Reviewed by a person')).toBeNull()
  expect(document.querySelector('.evidence-quote')).toBeNull()
  await waitFor(() => expect(localStorage.getItem(REPORT_CHECK_KEY)).not.toBeNull())
  const stored = JSON.parse(localStorage.getItem(REPORT_CHECK_KEY)!)[cave.id]
  expect(stored).toMatchObject({ state: 'autoRead', readOn: '2026-11-16', issues: [expect.objectContaining({ page: 2 })] })
})
