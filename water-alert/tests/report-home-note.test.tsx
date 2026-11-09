import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { StatusCard } from '../src/components'
import { en, es } from '../src/strings'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import type { SourceSnapshot } from '../src/domain'

const at = '2026-11-09T12:00:00Z'
const source: SourceSnapshot = { agency: 'ADH', records: [], lastSuccessAt: at, retrievedAt: at, error: null }
const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', kind: 'system' as const, county: 'Benton' }
afterEach(() => { cleanup(); localStorage.clear() })

test.each(['en', 'es'] as const)('supplier card uses only the dated document chip and still opens findings (%s)', language => {
  const spanish = language === 'es'
  const onAsk = vi.fn()
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={spanish ? es : en} language={language} onView={() => {}} onAsk={onAsk} />)
  expect(screen.queryByRole('note', { name: spanish ? 'Hallazgos del informe del agua' : 'Water report findings' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: spanish ? 'Ver los problemas' : 'See the issues' })).not.toBeInTheDocument()
  const disclosure = screen.getByRole('button', { name: spanish ? /^Información del proveedor/ : /^Provider information/ })
  const chip = within(disclosure).getByText(spanish ? '2025: 4 problemas de cumplimiento' : '2025: 4 compliance issues')
  expect(chip.firstElementChild?.tagName.toLowerCase()).toBe('svg')
  expect(chip.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  fireEvent.click(chip)
  expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('heading', { name: spanish ? /Informe anual 2025:.*no es una evaluación actual/ : /Annual report 2025:.*not a current water-safety assessment/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: spanish ? 'Ver 4 problemas' : 'View 4 issues' }))
  const ask = screen.getAllByRole('button', { name: spanish ? /^Preguntar sobre/ : /^Ask about this/ })
  expect(ask).toHaveLength(4)
  fireEvent.click(ask[3])
  expect(onAsk).toHaveBeenCalledWith('2025:3')
})

test('sample mode and suppliers without findings show no report line', () => {
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={es} language="es" sample onView={() => {}} onAsk={() => {}} />)
  expect(screen.queryByRole('note', { name: 'Hallazgos del informe del agua' })).not.toBeInTheDocument()
})
