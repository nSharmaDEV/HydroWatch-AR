import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { NoticeDetail } from '../src/NoticeDetail'
import { StatusCard } from '../src/components'
import { SupplierAlertHistory } from '../src/SupplierAlertHistory'
import { en, es } from '../src/strings'
import { SOURCES, type Notice, type Place, type SourceSnapshot } from '../src/domain'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const now = Date.parse('2026-10-14T22:00:00Z')
const notice: Notice = { id: 'incident-one', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', area: 'Entire System', county: 'Benton', issued: '10/14/2026 3:12:14 PM', lifted: null, reason: 'power outage', url: SOURCES.ADH }
const source: SourceSnapshot = { agency: 'ADH', records: [notice], retrievedAt: new Date(now).toISOString(), lastSuccessAt: new Date(now).toISOString(), error: null }
function detail(props: Partial<React.ComponentProps<typeof NoticeDetail>> = {}) {
  const result = render(<NoticeDetail place={place} source={source} now={now} t={en} language="en" onBack={() => {}} onShare={() => {}} onAlerts={() => {}} {...props} />)
  const chooser = screen.queryByRole('combobox', { name: props.language === 'es' ? '¿Con qué necesita ayuda?' : 'What do you need help with?' })
  if (chooser) fireEvent.change(chooser, { target: { value: 'request' } })
  return result
}

it('puts selected recovery tools before supplier profile and incident details', () => {
  detail()
  const tools = screen.getByRole('region', { name: 'Drafts, forms & help' })
  expect((within(tools).getByRole('textbox', { name: 'Draft body' }) as HTMLTextAreaElement).value).toContain('not stating that compensation is automatically owed')
  expect(screen.getByRole('heading', { name: 'About this water system' })).toBeVisible()
  expect(screen.getByText('113')).toBeVisible()
  expect(screen.getByText('Groundwater')).toBeVisible()
  expect(screen.getByText('Community system')).toBeVisible()
  expect(tools.compareDocumentPosition(screen.getByRole('heading', { name: 'About this water system' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('link', { name: /Annual water-quality reports/ })).toHaveAttribute('href', 'https://health.arkansas.gov/eng/CCRSearch.aspx')
  expect(screen.getByText(/Not live readings, inspection results/)).toBeVisible()
  expect(screen.getByText(/No agency lift date is published/)).toBeVisible()
})

it('preserves edits per template, creates encoded email only to the verified provider, and copies reviewed text', async () => {
  const user = userEvent.setup()
  detail()
  const body = screen.getByRole('textbox', { name: 'Draft body' })
  await user.clear(body)
  await user.type(body, 'My reviewed request & costs £12')
  await user.selectOptions(screen.getByRole('combobox', { name: 'What do you need help with?' }), 'followup')
  await user.selectOptions(screen.getByRole('combobox', { name: 'What do you need help with?' }), 'request')
  expect(body).toHaveValue('My reviewed request & costs £12')
  const href = screen.getByRole('link', { name: 'Open email draft' }).getAttribute('href')!
  expect(href).toMatch(/^mailto:LEISUREHILLSWATERCO@GMAIL.COM\?subject=/)
  expect(new URLSearchParams(href.split('?')[1]).get('body')).toBe('My reviewed request & costs £12')
  await user.click(screen.getByRole('button', { name: 'Copy draft' }))
  expect(await navigator.clipboard.readText()).toContain('My reviewed request & costs £12')
  expect(screen.getByText(/Copied. Nothing was sent/)).toBeVisible()
})

it('selects text without claiming success when clipboard permission fails', async () => {
  const user = userEvent.setup()
  detail()
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
  await user.click(screen.getByRole('button', { name: 'Copy draft' }))
  expect(screen.getByText(/Copy unavailable/)).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Draft body' })).toHaveFocus()
})

it('does not invent supplier facts or an incident when neither is verified', () => {
  detail({ place: { ...place, id: 'ADH:unknown' }, source: undefined })
  expect(screen.queryByText('113')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument()
  expect((screen.getByRole('textbox', { name: 'Draft body' }) as HTMLTextAreaElement).value).toContain('No incident record supplied')
  expect((screen.getByRole('textbox', { name: 'Draft body' }) as HTMLTextAreaElement).value).not.toContain(notice.issued!)
})

it('keeps sample drafts labelled and does not expose real supplier contacts or profile', () => {
  detail({ sample: true })
  expect((screen.getByRole('textbox', { name: 'Draft body' }) as HTMLTextAreaElement).value).toContain('SAMPLE — NOT A REAL CLAIM')
  expect(document.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull()
  expect(screen.queryByText('113')).not.toBeInTheDocument()
})

it('does not put recovery tools or boil guidance on HAB details', () => {
  detail({ place: { ...place, kind: 'lake' }, source: undefined })
  expect(screen.queryByRole('region', { name: 'Drafts, forms & help' })).not.toBeInTheDocument()
  expect(screen.queryByText('General CDC boil-water guidance')).not.toBeInTheDocument()
})

it.each(['failed', 'stale', 'historical', 'none'] as const)('collapses general guidance in the %s state without claiming an active incident', state => {
  detail({ source: state === 'failed' ? { ...source, error: 'offline' } : state === 'stale' ? { ...source, lastSuccessAt: new Date(now - 900_000).toISOString() } : state === 'none' ? { ...source, records: [] } : source, linkedNotice: state === 'historical' ? { ...notice, lifted: '10/15/2026' } : undefined })
  expect(screen.getByText('General CDC boil-water guidance', { selector: 'summary' }).closest('details')).not.toHaveAttribute('open')
})

it('labels general CDC text separately from absent incident-specific instructions', () => {
  detail()
  expect(screen.getByText('General CDC boil-water guidance', { selector: 'summary' }).closest('details')).toHaveAttribute('open')
  expect(screen.getByText(/bring water to a full rolling boil for 1 minute/i)).toHaveAttribute('lang', 'en')
  expect(screen.getByText(/not incident-specific ADH instructions/)).toBeVisible()
})

it('provides Spanish controls without silently translating verified English excerpts or templates', () => {
  detail({ language: 'es', t: es })
  expect(screen.getByRole('region', { name: 'Borradores, formularios y ayuda' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Texto del borrador' })).toHaveAttribute('lang', 'en')
  expect(screen.getByRole('link', { name: /Formulario de queja en español/ })).toHaveAttribute('href', 'https://media.ark.org/ag/Spanish-Consumer-Complaint-Form-3.pdf')
})

it('removes the redundant supplier tools action from provider information', async () => {
  const user = userEvent.setup()
  const onView = vi.fn()
  render(<StatusCard place={place} source={source} now={now} t={en} onView={onView} />)
  await user.click(screen.getByRole('button', { name: en.providerHelp }))
  expect(screen.queryByRole('button', { name: 'Supplier details & tools' })).toBeNull()
  expect(onView).not.toHaveBeenCalled()
})

it('opens the official list rather than implying an individual historical URL', async () => {
  const user = userEvent.setup()
  const onViewNotice = vi.fn()
  render(<SupplierAlertHistory place={place} archive={[notice]} source={source} now={now} t={en} language="en" onViewNotice={onViewNotice} />)
  await user.click(screen.getByRole('button', { name: en.supplierAlertHistory }))
  expect(screen.getByRole('link', { name: /Open ADH notice list/ })).toHaveAttribute('href', SOURCES.ADH)
  expect(screen.queryByRole('button', { name: 'Open in WAVE' })).not.toBeInTheDocument()
  expect(onViewNotice).not.toHaveBeenCalled()
})
