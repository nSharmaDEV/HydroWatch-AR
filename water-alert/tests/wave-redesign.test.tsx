import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { StatusCard } from '../src/components'
import { en, es } from '../src/strings'
import { PLACE_CATALOG } from '../src/place-catalog'
import { SOURCES, type Notice, type Place } from '../src/domain'

const place: Place = { id: 'ADH:test', name: 'TEST WATER SYSTEM', county: 'Benton', kind: 'system' }
const at = '2026-10-18T12:00:00Z'
const source = { agency: 'ADH' as const, records: [], retrievedAt: at, lastSuccessAt: at, error: null }

it('offers per-card checking through the supplied refresh handler without inventing a new result', async () => {
  const refresh = vi.fn()
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={en} onView={() => {}} onRefresh={refresh} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Check now' }))
  expect(refresh).toHaveBeenCalledOnce()
  expect(screen.getByText('No active boil-water notice found')).toBeVisible()
  expect(screen.getByRole('link', { name: /View official source/ })).toHaveAttribute('href', SOURCES.ADH)
})

it('uses existing loading state to disable per-card checks', () => {
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={en} onView={() => {}} onRefresh={() => {}} checking />)
  expect(screen.getByRole('button', { name: en.refreshing })).toBeDisabled()
})

it('uses the approved unchecked wording only for an unchecked source', () => {
  render(<StatusCard place={place} now={Date.parse(at)} t={en} onView={() => {}} />)
  expect(screen.getByText('Advisory status unavailable')).toBeVisible()
  expect(screen.getByText('The source hasn’t been checked yet.')).toBeVisible()
  expect(screen.getByText('No successful check yet')).toBeVisible()
})

it.each(['failed', 'stale'] as const)('retains actual %s explanations and prior successful timestamp', state => {
  render(<StatusCard place={place} source={{ ...source, error: state === 'failed' ? 'Timeout' : null }} now={Date.parse(at) + (state === 'stale' ? 900_000 : 0)} t={en} onView={() => {}} />)
  expect(screen.getByText(en.supplierUnavailable)).toBeVisible()
  expect(screen.getByText(state === 'failed' ? en.checkRetrievalFailed : en.checkStale)).toBeVisible()
  expect(screen.queryByText('The source hasn’t been checked yet.')).not.toBeInTheDocument()
  expect(document.querySelector('article>dl time')).toHaveAttribute('datetime', at)
})

it('keeps history and provider help closed initially and keyboard-operable', async () => {
  const view = vi.fn()
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={en} onView={view} />)
  const history = screen.getByRole('button', { name: 'Advisory history' })
  expect(history).toHaveAttribute('aria-expanded', 'false')
  history.focus()
  await userEvent.setup().keyboard(' ')
  expect(history).toHaveAttribute('aria-expanded', 'true')
  expect(document.getElementById(history.getAttribute('aria-controls')!)).toBeVisible()
  const help = screen.getByRole('button', { name: 'Provider information' })
  expect(help).toHaveAttribute('aria-expanded', 'false')
  help.focus()
  await userEvent.setup().keyboard('{Enter}')
  expect(screen.queryByRole('button', { name: 'Supplier details & tools' })).toBeNull()
  expect(view).not.toHaveBeenCalled()
  expect(screen.queryByText(en.cardQualification)).toBeNull()
})

it.each(['active', 'none', 'failed', 'stale', 'unchecked'] as const)('uses reference card presentation without weakening %s evidence', state => {
  const notice: Notice = { id: 'synthetic', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic test area', reason: 'Synthetic test', issued: at, lifted: null, url: SOURCES.ADH }
  const snapshot = state === 'unchecked' ? undefined : { ...source, records: state === 'none' ? [] : [notice], error: state === 'failed' ? 'Timeout' : null }
  const { container } = render(<StatusCard place={place} source={snapshot} now={Date.parse(at) + (state === 'stale' ? 900_000 : 0)} t={en} onView={() => {}} onRefresh={() => {}} />)
  const check = screen.getByRole('button', { name: en.checkNow })
  const official = screen.getByRole('link', { name: /View official source/ })
  expect(check).toHaveClass(state === 'active' ? 'secondary' : 'primary')
  expect(official).toHaveClass('official-source-action')
  expect(official).not.toHaveClass('primary', 'secondary')
  expect(container.querySelectorAll('.supplier-finding .warning-icon')).toHaveLength(state === 'active' ? 1 : 0)
  if (state === 'none') {
    expect(screen.getByText('No active boil-water notice found')).toBeVisible()
    expect(screen.getByText('No active notice was listed at the last successful check.')).toBeVisible()
    expect(container.querySelector('.supplier-finding svg, .supplier-finding .status-symbol')).toBeNull()
  } else if (state === 'active') {
    expect(container.querySelector('.supplier-finding .status-explanation')).toHaveTextContent('Affected area: Synthetic test area Reason: Synthetic test')
    expect(screen.getByRole('link', { name: en.activeBoil })).toHaveAttribute('href', `${SOURCES.ADH}#:~:text=${encodeURIComponent(notice.name)}`)
  } else {
    expect(screen.queryByText('No active boil-water notice found')).toBeNull()
    if (state !== 'unchecked') expect(screen.getByText(en.unverified)).toBeInTheDocument()
  }
  expect(screen.queryByText(en.cardQualification)).toBeNull()
  expect(container.querySelectorAll('.provider-contact-actions svg')).toHaveLength(0)
  expect(screen.getByText(/Contact details have not been verified/)).not.toBeVisible()
  expect(container.querySelector('.freshness-leader')).toHaveAttribute('aria-hidden', 'true')
})

it.each(['en', 'es'] as const)('shows visible missing email text instead of a disabled action (%s)', language => {
  const supplier = PLACE_CATALOG.find(entry => entry.place.name === 'FAYETTEVILLE WATERWORKS')!.place
  render(<StatusCard place={supplier} now={Date.parse(at)} t={language === 'en' ? en : es} language={language} onView={() => {}} />)
  const region = within(screen.getByRole('region', { name: language === 'en' ? 'Contact water provider' : 'Contactar al proveedor de agua' }))
  expect(region.getByText(language === 'en' ? 'No verified email address is available for this supplier.' : 'No hay un correo electrónico verificado para este proveedor.')).not.toBeVisible()
  expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
})
