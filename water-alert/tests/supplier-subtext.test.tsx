import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { StatusCard } from '../src/components'
import { SOURCES, type Notice, type Place } from '../src/domain'
import { en, es } from '../src/strings'

const at = '2026-10-19T12:00:00Z'
const place: Place = { id: 'ADH:test', name: 'TEST WATER SYSTEM', county: 'Benton', kind: 'system' }
const notice: Notice = { id: 'notice', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: `${place.name} for the Entire System`, reason: 'power outage', issued: at, lifted: null, url: SOURCES.ADH }
function card(records: Notice[], language: 'en' | 'es' = 'en', error: string | null = null) {
  return render(<StatusCard place={place} source={{ agency: 'ADH', records, retrievedAt: at, lastSuccessAt: at, error }} now={Date.parse(at)} language={language} t={language === 'en' ? en : es} onView={() => {}} />)
}
it.each(['en', 'es'] as const)('shows source-backed area and reason beneath the active headline (%s)', language => {
  const { container } = card([notice], language)
  const text = container.querySelector('.supplier-finding .status-explanation')!
  expect(text).toHaveTextContent(language === 'en' ? 'Affected area: Entire system' : 'Área afectada: Todo el sistema')
  expect(text).toHaveTextContent(language === 'en' ? 'Reason: power outage' : 'Motivo: power outage')
  expect(screen.getByRole('link', { name: language === 'en' ? en.activeBoil : es.activeBoil })).toBeVisible()
})
it('preserves specific affected-area wording without expanding it to the whole system', () => {
  const { container } = card([{ ...notice, area: 'Apple Drive except number 20', reason: 'water line break' }])
  const text = container.querySelector('.supplier-finding .status-explanation')!
  expect(text).toHaveTextContent('Affected area: Apple Drive except number 20')
  expect(text).toHaveTextContent('Reason: water line break')
  expect(text).not.toHaveTextContent('Entire system')
})
it('omits missing fields rather than inventing an affected area or reason', () => {
  const { container, unmount } = card([{ ...notice, area: '', reason: 'power outage' }])
  expect(container.querySelector('.supplier-finding .status-explanation')).toHaveTextContent('Reason: power outage')
  expect(container.querySelector('.supplier-finding .status-explanation')).not.toHaveTextContent('Affected area')
  unmount()
  const missing = card([{ ...notice, area: ' ', reason: '' }])
  expect(missing.container.querySelector('.supplier-finding .status-explanation')).toBeNull()
})
it('keeps multiple active notices separate and excludes lifted notices', () => {
  const { container } = card([notice, { ...notice, id: 'second', area: 'North customers', reason: 'main break' }, { ...notice, id: 'lifted', area: 'Old area', lifted: at }])
  const rows = container.querySelectorAll('.supplier-finding .status-explanation')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('power outage')
  expect(rows[1]).toHaveTextContent('North customers')
  expect(container.querySelector('.supplier-finding')).not.toHaveTextContent('Old area')
})
it('does not present retained notice details as current when retrieval fails', () => {
  const { container } = card([notice], 'en', 'Timeout')
  expect(container.querySelector('.supplier-finding')).not.toHaveTextContent('power outage')
  expect(container.querySelector('.supplier-finding')).toHaveTextContent(en.supplierUnavailable)
})
