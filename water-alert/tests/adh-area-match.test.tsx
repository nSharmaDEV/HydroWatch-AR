import { expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { parseADH } from '../server/parsers'
import { SOURCES, statusFor, type SourceSnapshot } from '../src/domain'
import { noticeMatchesPlace } from '../src/place-catalog'

const leisure = 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf'
const html = `<table id="GridView1"><tr><th>Date Issued</th><th>Date Lifted</th><th>System</th><th>Area Impacted</th><th>Reason</th><th>County</th></tr>
<tr><td>10/14/2026 3:12:14 PM</td><td></td><td>VILLAGE WATER LLC</td><td>LEISURE HILLS MOBILE HOME PARK for the Entire System</td><td>power outage</td><td>BENTON</td></tr></table>`
const notice = parseADH(html)[0]
const at = '2026-10-22T20:00:00Z'
const snapshot: SourceSnapshot = { agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }

it('matches the ADH row explicitly naming Leisure Hills without rewriting source identity or wording', () => {
  const status = statusFor(leisure, snapshot, Date.parse(at))
  expect(status.state).toBe('active')
  expect(status.records).toEqual([notice])
  expect(notice.placeId).not.toBe(leisure)
  expect(notice.name).toBe('VILLAGE WATER LLC')
  expect(notice.area).toBe('LEISURE HILLS MOBILE HOME PARK for the Entire System')
  expect(notice.url).toBe(SOURCES.ADH)
})

it('does not generalize the association to other Village Water areas or inferred supplier boundaries', () => {
  for (const changed of [
    { area: 'Another mobile home park for the Entire System' },
    { area: 'LEISURE HILLS MOBILE HOME PARK ESTATES for the Entire System' },
    { area: 'LEISURE HILLS MOBILE HOME PARK for customers on an unverified road' },
    { name: 'ANOTHER WATER LLC' }, { county: 'WASHINGTON' }, { url: 'https://example.org/not-adh' },
    { agency: 'ADEQ' as const, kind: 'hab' as const },
  ]) expect(noticeMatchesPlace(leisure, { ...notice, ...changed })).toBe(false)
  expect(noticeMatchesPlace('ADH:unrelated', notice)).toBe(false)
})

it('preserves explicit lifts and unavailable/stale states for the associated row', () => {
  expect(statusFor(leisure, { ...snapshot, records: [{ ...notice, lifted: '10/22/2026 1:00:00 PM' }] }, Date.parse(at)).state).toBe('none')
  expect(statusFor(leisure, { ...snapshot, error: 'Offline' }, Date.parse(at)).state).toBe('unavailable')
  expect(statusFor(leisure, snapshot, Date.parse(at) + 900_000).state).toBe('unavailable')
})

it('shows the associated notice on Home and in the supplier advisory history', async () => {
  const current = new Date().toISOString()
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [leisure], liftWatches: [], language: 'en', checkOnOpen: false }))
  render(<App liveData={{ sources: [{ ...snapshot, retrievedAt: current, lastSuccessAt: current }], places: [{ id: leisure, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }], archive: [notice], coverageStart: current }} />)
  expect(screen.getByText('Active boil-water notice')).toBeVisible()
  expect(screen.queryByText('No active boil-water notice found')).toBeNull()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Advisory history' }))
  const history = screen.getByRole('region', { name: 'Advisory history' })
  expect(within(history).getByText(notice.area)).toBeVisible()
  expect(within(history).getByText('power outage')).toBeVisible()
})
