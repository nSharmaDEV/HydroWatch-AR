import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { SupplierInformation } from '../src/SupplierProfile'
import { ProviderEvidenceSections } from '../src/ProviderEvidence'
import { providerEvidence } from '../src/provider-evidence'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { REPORT_CHECK_KEY } from '../src/report-check'
import { helpReports } from '../src/help-report-facts'

const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })

test('a newly retrieved report year joins reviewed history in both Provider information and Help', () => {
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify({ [place.id]: { state: 'autoRead', year: 2026, url: 'https://health.arkansas.gov/new-report', checkedAt: '2026-11-17', readOn: '2026-11-17', issues: [] } }))
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
  render(<SupplierInformation place={place} sample={false} language="en" />)
  fireEvent.click(screen.getByRole('button', { name: /Provider information/ }))
  // The newest year leads the annual-report row; the reviewed 2025 problems stay listed.
  const rows = document.querySelector('.evidence-source-headers') as HTMLElement
  expect(rows.querySelector('.report-year')).toHaveTextContent('2026')
  expect(within(rows).getByRole('link', { name: 'Open PDF' })).toHaveAttribute('href', 'https://health.arkansas.gov/new-report')
  expect(screen.getByRole('button', { name: 'All recorded problems · 4' })).toBeInTheDocument()
  expect(helpReports(place, false).map(report => report.year)).toEqual([2026, 2025])
})

test('past issues expand inline with reported facts and actions, not another view', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false })} language="en" onAsk={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Annual report' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: /All recorded problems/ }))
  expect(screen.getAllByText('What was reported').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Reported corrective action').length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: 'Ask about this' }).length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: /Back to provider/ })).toBeNull()
  expect(screen.queryByText('Past records—not today’s water safety.')).toBeNull()
  expect(screen.queryByText('Sources disagree on dates or status. See source details.')).toBeNull()
})

test('opening provider information refreshes documents and directory without duplicate requests on rapid reopen', async () => {
  const pending: ((r: Response) => void)[] = []
  const fetch = vi.fn((_input: RequestInfo | URL) => new Promise<Response>(resolve => pending.push(resolve)))
  vi.stubGlobal('fetch', fetch)
  render(<SupplierInformation place={place} sample={false} language="en" />)
  expect(fetch).not.toHaveBeenCalled()
  const toggle = screen.getByRole('button', { name: /Provider information/ })
  fireEvent.click(toggle)
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
  expect(fetch.mock.calls.map(call => String(call[0]))).toEqual(expect.arrayContaining(['/api/annual-report/check', '/api/echo-records', '/api/water-system/check']))
  expect(screen.getAllByText('Checking for updates…').length).toBeGreaterThan(0)
  fireEvent.click(toggle); fireEvent.click(toggle)
  expect(fetch).toHaveBeenCalledTimes(3)
  await act(async () => { pending.forEach(resolve => resolve(new Response('{}', { status: 503 }))) })
  expect(screen.getAllByText(/Update failed/).length).toBeGreaterThan(0)
  expect(screen.getByRole('heading', { name: 'Annual report' })).toBeVisible()
  fireEvent.click(toggle); fireEvent.click(toggle)
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6))
  await act(async () => { pending.slice(3).forEach(resolve => resolve(new Response('{}', { status: 503 }))) })
})
