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
  // The badge counts distinct historical issues across every record, not documents.
  const chip = within(disclosure).getByText(spanish ? '4 hallazgos históricos' : '4 historical findings')
  expect(chip.firstElementChild?.tagName.toLowerCase()).toBe('svg')
  expect(chip.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  fireEvent.click(chip)
  expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('heading', { name: spanish ? 'Informe anual' : 'Annual report' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: spanish ? /Todos los problemas registrados/ : /All recorded problems/ }))
  for (const summary of document.querySelectorAll('.evidence-type-group>summary')) fireEvent.click(summary)
  const rows = document.querySelectorAll('.evidence-inline-issue')
  expect(rows).toHaveLength(4)
  const licensing = Array.from(rows).find(row => /Operator licensing|Licencia del operador/.test(row.textContent!)) as HTMLElement
  fireEvent.click(within(licensing).getByRole('button', { name: spanish ? 'Preguntar sobre esto' : 'Ask about this' }))
  // The oldest of the four findings is the licensing row, keyed as the draft has always keyed it.
  expect(onAsk).toHaveBeenCalledWith('2025:2')
})

test('sample mode and suppliers without findings show no report line', () => {
  render(<StatusCard place={place} source={source} now={Date.parse(at)} t={es} language="es" sample onView={() => {}} onAsk={() => {}} />)
  expect(screen.queryByRole('note', { name: 'Hallazgos del informe del agua' })).not.toBeInTheDocument()
})
