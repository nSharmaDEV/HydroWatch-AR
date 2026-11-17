import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SupplierInformation } from '../src/SupplierProfile'
import { REPORT_CHECK_KEY } from '../src/report-check'
import type { Place } from '../src/domain'

// In the EPA directory, with no reviewed annual report: the gap the button fills.
const cave: Place = { id: 'ADH:76a865f0e02e2f8186f51f0623cc6ddc0dab83d8577f0f3a08de19c838d19183', name: 'CAVE SPRINGS WATERWORKS', county: 'Benton', kind: 'system' }
const bentonville: Place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', county: 'Benton', kind: 'system' }
const pdfUrl = 'https://health.arkansas.gov/eng/d.aspx?P=043&YEAR=2025'

const answer = (body: unknown) => vi.fn(async () => Response.json(body))
beforeEach(() => localStorage.clear())
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

async function openProviderInfo(place: Place, language: 'en' | 'es' = 'en', sample = false) {
  const user = userEvent.setup()
  render(<SupplierInformation place={place} language={language} sample={sample} />)
  await user.click(screen.getByRole('button', { name: language === 'es' ? /^Información del proveedor/ : /^Provider information/ }))
  return user
}

it('finds and links the report on demand, then keeps it on this device', async () => {
  const fetcher = answer({ state: 'unreviewed', year: 2025, url: pdfUrl, checkedAt: '2026-11-16' })
  vi.stubGlobal('fetch', fetcher)
  const user = await openProviderInfo(cave)
  await user.click(screen.getByRole('button', { name: /Check for the annual report/ }))
  expect(await screen.findByRole('link', { name: /View original report/ })).toHaveAttribute('href', pdfUrl)
  expect(screen.getByText(/ADH’s 2025 report search returned this document on Nov 16, 2026/)).toBeVisible()
  // Still unreviewed: a linked document is never a summary or a safety result.
  expect(screen.getByText('Not yet reviewed', { ignore: '.sr-only' })).toBeVisible()
  expect(screen.getByText(/WAVE has not read it/)).toBeVisible()
  expect(JSON.parse(localStorage.getItem(REPORT_CHECK_KEY)!)[cave.id]).toEqual({ state: 'unreviewed', year: 2025, url: pdfUrl, checkedAt: '2026-11-16' })
  expect(new URL((fetcher.mock.calls[0] as unknown as [string])[0], 'http://localhost').pathname).toBe('/api/annual-report/check')
})

it('reports a completed search that found nothing without implying safety', async () => {
  vi.stubGlobal('fetch', answer({ state: 'unavailable', year: 2025, checkedAt: '2026-11-16' }))
  const user = await openProviderInfo(cave)
  await user.click(screen.getByRole('button', { name: /Check for the annual report/ }))
  expect(await screen.findByText('No 2025 report found', { ignore: '.sr-only' })).toBeVisible()
  expect(screen.getByText(/This is not proof the system has no report, and not a finding about its water/)).toBeVisible()
  expect(screen.queryByText(/No violations reported/)).toBeNull()
})

it.each([
  ['ambiguous', /More than one ADH system matched this name/],
  ['incomplete', /The check couldn’t be completed just now\. Nothing changed/],
] as const)('stores nothing and changes nothing when the check is %s', async (state, message) => {
  vi.stubGlobal('fetch', answer({ state }))
  const user = await openProviderInfo(cave)
  await user.click(screen.getByRole('button', { name: /Check for the annual report/ }))
  expect(await screen.findByText(message)).toBeVisible()
  expect(localStorage.getItem(REPORT_CHECK_KEY)).toBeNull()
  expect(screen.getByText('Not yet reviewed', { ignore: '.sr-only' })).toBeVisible()
  expect(screen.queryByRole('link', { name: /View original report/ })).toBeNull()
})

it('treats a failed request as unchecked, never as no report', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 503 })))
  const user = await openProviderInfo(cave)
  await user.click(screen.getByRole('button', { name: /Check for the annual report/ }))
  expect(await screen.findByText(/The check couldn’t be completed just now/)).toBeVisible()
  expect(localStorage.getItem(REPORT_CHECK_KEY)).toBeNull()
  expect(screen.queryByText(/No 2025 report found/)).toBeNull()
})

it('allows rechecking a reviewed report without replacing its hand-reviewed findings', async () => {
  const fetcher = answer({ state: 'autoRead', year: 2025, url: pdfUrl, readOn: '2026-11-16', issues: [], checkedAt: '2026-11-16' })
  vi.stubGlobal('fetch', fetcher)
  const user = await openProviderInfo(bentonville)
  expect(screen.getByText('No violations reported', { ignore: '.sr-only' })).toBeVisible()
  const retry = screen.getByRole('button', { name: /Check again for the annual report/ })
  expect(retry).toBeVisible()
  await user.click(retry)
  expect(fetcher).toHaveBeenCalledOnce()
  // The source check is device-local and must not replace the shipped human review.
  expect(screen.getByText('No violations reported', { ignore: '.sr-only' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Annual report check complete.')
})

it('shows the dated no-violations result in the provider information bar after a PDF read', async () => {
  vi.stubGlobal('fetch', answer({ state: 'autoRead', year: 2025, url: pdfUrl, readOn: '2026-11-16', issues: [], checkedAt: '2026-11-16' }))
  const user = await openProviderInfo(cave)
  await user.click(screen.getByRole('button', { name: /Check for the annual report/ }))
  expect(await screen.findByRole('button', { name: /Provider information.*2025: No violations reported.*read from PDF/i })).toBeVisible()
})

it('never offers the check on fictional sample records', async () => {
  render(<SupplierInformation place={cave} language="en" sample />)
  expect(screen.queryByRole('button', { name: /Check for the annual report/ })).toBeNull()
})

it('offers the check in Spanish and keeps a stored result after a reload', async () => {
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify({ [cave.id]: { state: 'unreviewed', year: 2025, url: pdfUrl, checkedAt: '2026-11-16' } }))
  await openProviderInfo(cave, 'es')
  expect(screen.getByRole('link', { name: /Ver informe original/ })).toHaveAttribute('href', pdfUrl)
  expect(screen.getByText(/La búsqueda de informes de 2025 de ADH devolvió este documento el 16 de noviembre de 2026/)).toBeVisible()
  expect(screen.getByRole('button', { name: /Volver a buscar el informe anual/ })).toBeVisible()
})

it('shows an automatic read’s issues labelled as read from the PDF, never as reviewed or AI', async () => {
  const issue = { category: 'publicNotice', heading: { en: 'Public notice', es: 'Aviso público' }, title: { en: 'Failed to conduct a public notice regarding a total coliform monitoring violation', es: 'Failed to conduct a public notice regarding a total coliform monitoring violation' }, action: { en: 'No corrective action taken', es: 'No corrective action taken' }, reportedFrom: '5/1/2025', reportedThrough: '12/31/2025', page: 2 }
  vi.stubGlobal('fetch', answer({ state: 'autoRead', year: 2025, url: pdfUrl, readOn: '2026-11-16', issues: [issue], checkedAt: '2026-11-16' }))
  const user = await openProviderInfo(cave)
  await user.click(screen.getByRole('button', { name: /Check for the annual report/ }))
  expect(await screen.findByText('Read from PDF', { selector: '.report-ai-tag' })).toBeVisible()
  expect(screen.queryByText('AI summary')).toBeNull()
  expect(screen.queryByText('Reviewed')).toBeNull()
  expect(screen.getByRole('button', { name: /View 1 issue/ })).toBeVisible()
  expect(screen.getByText(/Read from PDF/, { selector: '.report-reviewed span' })).toBeVisible()
  // Never offered as a quotable, hand-checked finding.
  await user.click(screen.getByRole('button', { name: /View 1 issue/ }))
  expect(screen.queryByRole('button', { name: /Ask about this/ })).toBeNull()
  const stored = JSON.parse(localStorage.getItem(REPORT_CHECK_KEY)!)[cave.id]
  expect(stored).toMatchObject({ state: 'autoRead', readOn: '2026-11-16', issues: [expect.objectContaining({ page: 2 })] })
})
