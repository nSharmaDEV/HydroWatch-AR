import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../src/App'
import { StatusCard } from '../src/components'
import { ConfirmPlace, SearchPlace } from '../src/Journey'
import { ObservedHistory } from '../src/ObservedHistory'
import { NoticeDetail } from '../src/NoticeDetail'
import { PushPanel } from '../src/PushPanel'
import { en, es } from '../src/strings'
import { defaults, savePreferences } from '../src/storage'
import { SOURCES, type Notice, type Place } from '../src/domain'
import { PLACE_CATALOG } from '../src/place-catalog'

const at = '2026-10-18T12:00:00Z'
const place: Place = { id: 'ADH:test', name: 'TEST WATER SYSTEM', county: 'Benton', kind: 'system' }
const notice: Notice = { id: 'n', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'North customers', issued: 'October 18', lifted: null, reason: 'Pressure', url: SOURCES.ADH, firstObservedAt: at, lastObservedAt: at }
const source = { agency: 'ADH' as const, records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it.each([['en', en, 'Active boil-water notice'], ['es', es, 'Aviso activo de hervir el agua']] as const)('uses one active headline without a second badge (%s)', (language, t, headline) => {
  const { container } = render(<StatusCard place={place} source={source} now={Date.parse(at)} language={language} t={t} onView={() => {}} />)
  expect(screen.getByText(headline)).toBeVisible()
  expect(container.querySelector('.supplier-status-badge')).toBeNull()
})
it.each([['en', en], ['es', es]] as const)('links the active supplier headline to its agency-listed name without an instruction claim (%s)', (language, t) => {
  const agencyName = 'LEISURE HILLS MOBILE HOME PARK'
  const { container } = render(<StatusCard place={{ ...place, name: 'Leisure Hills Mobile Home Park' }} source={{ ...source, records: [{ ...notice, name: agencyName }] }} now={Date.parse(at)} language={language} t={t} onView={() => {}} />)
  const link = screen.getByRole('link', { name: t.activeBoil })
  expect(link).toHaveAttribute('href', `${SOURCES.ADH}#:~:text=${encodeURIComponent(agencyName)}`)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(container.querySelector('.supplier-finding .status-explanation')).toHaveTextContent(notice.reason)
  expect(screen.queryByText(t.supplierInstructions)).toBeNull()
})
it('does not target a fictional supplier on the live ADH page in sample mode', () => {
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={en} sample onView={() => {}} />)
  expect(screen.getByText(en.activeBoil)).toBeVisible()
  expect(screen.queryByRole('link', { name: en.activeBoil })).toBeNull()
})
it('removes the supplier footer while retaining the no-notice explanation and safety details', () => {
  const { container } = render(<StatusCard place={place} source={{ ...source, records: [] }} now={Date.parse(at)} t={en} onView={() => {}} />)
  expect(screen.queryByText(en.cardQualification)).toBeNull()
  expect(container.querySelectorAll('.card-qualification')).toHaveLength(0)
  expect(screen.getByText(en.noNoticeExplanation)).toBeVisible()
  expect(container.querySelector('.supplier-info')).toHaveTextContent(en.supplierSafety)
})
it('uses one meaningful empty check field and never labels a failed check unattempted', () => {
  const { container } = render(<StatusCard place={place} source={{ ...source, lastSuccessAt: null, error: 'Timeout', records: [] }} now={Date.parse(at)} t={en} onView={() => {}} />)
  expect(screen.queryByText(en.uncheckedExplanation)).not.toBeInTheDocument()
  expect(container.querySelector('article > dl')).toHaveTextContent('Last successful checkNo successful check yet')
})
it('keeps coverage details collapsed in supplier confirmation and search', () => {
  const { unmount } = render(<ConfirmPlace place={place} t={en} onConfirm={() => {}} onBack={() => {}} />)
  expect(screen.getByText('Does this match your water bill?')).toBeVisible()
  expect(screen.getByText('Coverage details', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
  unmount()
  render(<SearchPlace kind="system" places={[place]} query="" t={en} onQuery={() => {}} onSelect={() => {}} onBack={() => {}} />)
  expect(screen.getByText('Search for the supplier named on your water bill.')).toBeVisible()
  expect(screen.getByText('Coverage details', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
})
it('keeps history issue, area and uncertainty visible but observations collapsed', () => {
  render(<ObservedHistory archive={[notice, { ...notice, id: 'n2' }]} watches={[place.id]} coverageStart={at} t={en} language="en" />)
  expect(screen.getByText('Notices saved by WAVE—not a complete agency archive. A missing notice does not mean it was lifted.')).toBeVisible()
  expect(screen.getAllByText(notice.area)).toHaveLength(2)
  screen.getAllByText(en.historyPrevious).forEach(el => expect(el).toBeVisible())
  const summaries = screen.getAllByText('Observation details', { selector: 'summary' })
  expect(summaries).toHaveLength(2)
  summaries.forEach(el => { expect(el.closest('details')).not.toHaveAttribute('open'); expect(within(el.closest('details')!).getByText(en.firstObserved)).toBeInTheDocument() })
})
it('keeps an unknown issue date visible in history', () => {
  render(<ObservedHistory archive={[{ ...notice, issued: null }]} watches={[place.id]} coverageStart={at} t={en} language="en" />)
  expect(screen.getByText(en.issued).closest('div')).toHaveTextContent(en.unknown)
})
it('keeps the official-source escape visible when supplier search has no match', () => {
  render(<SearchPlace kind="system" places={[place]} query="No match" t={en} onQuery={() => {}} onSelect={() => {}} onBack={() => {}} />)
  expect(screen.getByRole('link', { name: en.checkADH })).toBeVisible()
})
it('shows one ready notification status, collapses evidence, and omits irrelevant iPhone instructions', async () => {
  vi.stubGlobal('isSecureContext', true); vi.stubGlobal('PushManager', class {}); vi.stubGlobal('Notification', { permission: 'default' })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: true, publicKey: 'key' }))))
  const { container } = render(<PushPanel mode="live" prefs={{ ...defaults(), watches: [place.id] }} t={en} onChange={() => {}} />)
  expect(await screen.findByText('Device notifications are off.')).toBeVisible()
  expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
  expect(screen.queryByText(en.iOS)).not.toBeInTheDocument()
  expect(screen.getByText('Notification details', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
  expect(screen.getByText('Email alerts unavailable. Not an emergency service.')).toBeVisible()
})
it('removes generic Home/Places/Settings paragraphs and requires deletion confirmation', async () => {
  savePreferences('live', { ...defaults(), watches: [place.id] })
  render(<App liveData={{ sources: [source], places: [place], archive: [notice], coverageStart: at }} />)
  const user = userEvent.setup()
  expect(screen.queryByText(en.subtitle)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Places' }))
  expect(screen.queryByText(en.placesIntro)).not.toBeInTheDocument()
  expect(screen.queryByText(en.coverage)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Settings' }))
  expect(screen.queryByText(en.settingsIntro)).not.toBeInTheDocument()
  expect(screen.queryByText(en.deletionText)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: en.delete }))
  expect(screen.getByText(en.deletionText)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirm removal' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('button', { name: 'Confirm removal' })).not.toBeInTheDocument()
  expect(localStorage.getItem('water-alert:live:v1')).toContain(place.id)
})
it.each([['en', en], ['es', es]] as const)('organizes Sources, Privacy and platform installation without duplicate pitches (%s)', async (language, t) => {
  savePreferences('live', { ...defaults(), language, watches: [place.id] })
  render(<App liveData={{ sources: [source], places: [place], archive: [], coverageStart: at }} />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: t.settings }))
  await user.click(screen.getByRole('button', { name: new RegExp(t.sources) }))
  for (const name of [t.advisorySources, t.coverageHeading, t.cannotTell]) expect(screen.getByRole('heading', { name })).toBeVisible()
  expect(screen.getByText(t.limits)).toBeVisible()
  expect(screen.queryByText(t.verificationLimit)).not.toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: new RegExp(t.settings) }).at(-1)!)
  await user.click(screen.getByRole('button', { name: new RegExp(t.privacy) }))
  for (const name of [t.storedDevice, t.storedPush, t.retentionDeletion]) expect(screen.getByRole('heading', { name })).toBeVisible()
  expect(screen.getByText(t.privacyRetention)).toHaveTextContent('90')
  await user.click(screen.getAllByRole('button', { name: new RegExp(t.settings) }).at(-1)!)
  await user.click(screen.getByRole('button', { name: new RegExp(t.installation) }))
  expect(screen.queryByText(t.iOS)).not.toBeInTheDocument()
  expect(screen.queryByText(t.pushUnsupported)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: t.setupNotifications })).toBeVisible()
})
it('keeps notice dates visible and moves technical observations into a closed disclosure', () => {
  render(<NoticeDetail place={place} source={source} now={Date.parse(at)} t={en} language="en" onBack={() => {}} onShare={() => {}} onAlerts={() => {}} />)
  expect(screen.getByText(en.activeBoil)).toBeVisible()
  expect(screen.getByText(notice.issued!)).toBeVisible()
  const details = screen.getByText(en.observationDetails, { selector: 'summary' }).closest('details')!
  expect(details).not.toHaveAttribute('open')
  expect(within(details).getByText(en.firstObserved)).not.toBeVisible()
})
it('does not repeat catalog coverage inside a lake notice detail', () => {
  const lake = PLACE_CATALOG.find(entry => entry.place.kind === 'lake')!.place
  render(<NoticeDetail place={lake} now={Date.parse(at)} t={en} language="en" onBack={() => {}} onShare={() => {}} onAlerts={() => {}} />)
  expect(screen.getAllByText(en.catalogWaterbody)).toHaveLength(1)
})
it('keeps the notification footer without repeating the advisory safety paragraph', async () => {
  savePreferences('live', { ...defaults(), watches: [place.id] })
  render(<App liveData={{ sources: [source], places: [place], archive: [], coverageStart: at }} />)
  await userEvent.setup().click(screen.getByRole('button', { name: en.manageAlerts }))
  expect(screen.queryByText(en.noSafety)).not.toBeInTheDocument()
  expect(screen.getByText(en.notificationFooter)).toBeVisible()
})
