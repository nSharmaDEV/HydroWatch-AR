import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useEchoRecords } from '../src/echo-check'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { ECHO_RECORD_KEY } from '../src/echo-records'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })
test('disabled sample lookup cannot make a request', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useEchoRecords(LEISURE_HILLS_ID, false))
  await act(async () => { result.current.check() })
  expect(fetch).not.toHaveBeenCalled()
})
test('late lookup results cannot update another selected place', async () => {
  let resolve!: (response: Response) => void
  vi.stubGlobal('fetch', () => new Promise<Response>(done => { resolve = done }))
  const { result, rerender } = renderHook(({ id }) => useEchoRecords(id, true), { initialProps: { id: LEISURE_HILLS_ID } })
  act(() => { result.current.check() })
  rerender({ id: 'another-place' })
  await act(async () => { resolve(new Response(JSON.stringify({ state: 'none', pwsid: 'AR0000747', retrievedOn: '2026-11-17' }))) })
  expect(result.current.status).toBe('idle')
  expect(result.current.checkedOn).toBeUndefined()
})
test('a no-rows lookup retains earlier historical records on this device', async () => {
  const records = { pwsid: 'AR0000747', retrievedOn: '2026-11-16', rejected: 0, truncated: false, violations: [], surveys: [], notices: [], formalActions: [] }
  localStorage.setItem(ECHO_RECORD_KEY, JSON.stringify({ [LEISURE_HILLS_ID]: { records } }))
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ state: 'none', pwsid: 'AR0000747', retrievedOn: '2026-11-17' })))
  const { result } = renderHook(() => useEchoRecords(LEISURE_HILLS_ID, true))
  act(() => { result.current.check() })
  await waitFor(() => expect(result.current.status).toBe('none'))
  expect(result.current.records).toEqual(records)
  expect(result.current.checkedOn).toBe('2026-11-17')
  expect(JSON.parse(localStorage.getItem(ECHO_RECORD_KEY)!)[LEISURE_HILLS_ID].records).toEqual(records)
})
