import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { StatusCard } from '../src/components'
import { SOURCES } from '../src/domain'
import { en, es } from '../src/strings'

const place = { id: 'ADH:test', name: 'Test supplier', county: 'Benton', kind: 'system' as const }
const at = '2026-10-19T12:00:00Z'
const notice = { id: 'notice-one', placeId: place.id, name: place.name, county: place.county, agency: 'ADH' as const, kind: 'boil' as const, area: 'Entire System', reason: 'Power outage', issued: '10/14/2026 3:12:14 PM', lifted: null, url: SOURCES.ADH }
const source = { agency: 'ADH' as const, records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }

it.each(['en', 'es'] as const)('reveals actionable notice information and manual progress without changing status (%s)', async language => {
  const user = userEvent.setup()
  const help = vi.fn()
  const t = language === 'en' ? en : es
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={t} language={language} onView={() => {}} onHelp={help} />)
  await user.click(screen.getByRole('button', { name: t.supplierAbout }))
  const popup = within(screen.getByRole('dialog'))
  expect(popup.getByRole('heading', { name: language === 'en' ? 'Your checklist' : 'Su lista de pasos' })).toBeVisible()
  expect(popup.getByText('Power outage')).toBeVisible()
  const boxes = popup.getAllByRole('checkbox')
  expect(boxes).toHaveLength(3)
  await user.click(boxes[0])
  expect(popup.getByRole('status')).toHaveTextContent(language === 'en' ? '1 of 3 complete' : '1 de 3 completados')
  expect(popup.getByText(t.activeBoil)).toBeVisible()
  await user.click(popup.getByRole('button', { name: language === 'en' ? 'View area' : 'Ver área' }))
  expect(popup.getByText(language === 'en' ? 'Published affected area: Entire System' : 'Área afectada publicada: Entire System')).toBeVisible()
  expect(boxes[1]).not.toBeChecked()
  await user.click(popup.getByRole('button', { name: language === 'en' ? 'Get help' : 'Obtener ayuda' }))
  expect(help).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('does not present saved notices as active steps after a failed check', async () => {
  render(<StatusCard place={place} source={{ ...source, error: 'Timeout' }} now={Date.parse(at)} t={en} onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: en.supplierAbout }))
  const popup = within(screen.getByRole('dialog'))
  expect(popup.queryByRole('checkbox')).toBeNull()
  expect(popup.getByText(en.supplierUnavailable)).toBeVisible()
})

it('keeps the popup focused on actions and a leader-aligned successful check', async () => {
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={en} onView={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: en.supplierAbout }))
  const dialog = screen.getByRole('dialog')
  const popup = within(dialog)
  expect(dialog.querySelector('.boil-guidance')).toBeNull()
  expect(dialog.querySelector('.supplier-original')).toBeNull()
  expect(popup.queryByText(en.coverage)).toBeNull()
  expect(popup.queryByText(en.supplierSafety)).toBeNull()
  expect(popup.queryByRole('link', { name: /Read official notice/ })).toBeNull()
  expect(popup.queryByRole('button', { name: en.noticeDetails })).toBeNull()
  expect(popup.queryByRole('button', { name: en.supplierActivity })).toBeNull()
  expect(dialog.querySelector('.freshness-row .freshness-leader')).not.toBeNull()
  expect(popup.getByRole('checkbox', { name: /Read the official notice/ })).toBeVisible()
})
