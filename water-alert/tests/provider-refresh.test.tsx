import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useWaterSystemCheck } from '../src/water-system-check'
import { REPORT_CHECK_KEY, useReportCheck } from '../src/report-check'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })
test('directory refresh rejects duplicate in-flight requests and ignores a late supplier response', async () => {
  let resolve!: (r: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  vi.stubGlobal('fetch', fetch)
  const { result, rerender } = renderHook(({ id }) => useWaterSystemCheck(id, true), { initialProps: { id: 'one' } })
  act(() => { result.current.check(); result.current.check() })
  expect(fetch).toHaveBeenCalledTimes(1)
  rerender({ id: 'two' })
  await act(async () => { resolve(new Response(JSON.stringify({ state: 'verified', facts: { systemId: 'one', sourceNames: [] }, sourceUrl: 'https://health.arkansas.gov/', checkedAt: '2026-11-17' }))) })
  expect(result.current.record).toBeUndefined()
})
test('an unavailable report refresh keeps earlier read evidence', async () => {
  const record = { state: 'autoRead', year: 2025, url: 'https://health.arkansas.gov/report', checkedAt: '2026-11-16', readOn: '2026-11-16', issues: [] }
  localStorage.setItem(REPORT_CHECK_KEY, JSON.stringify({ one: record }))
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ state: 'unavailable', year: 2025, checkedAt: '2026-11-17' })))
  const { result } = renderHook(() => useReportCheck('one', true))
  act(() => { result.current.check() })
  await waitFor(() => expect(result.current.status).toBe('incomplete'))
  expect(result.current.report?.state).toBe('autoRead')
  expect(JSON.parse(localStorage.getItem(REPORT_CHECK_KEY)!).one).toEqual(record)
})
