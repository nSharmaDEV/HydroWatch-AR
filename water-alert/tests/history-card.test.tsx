import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RequestHistory } from '../src/RequestHistory'
import { blankRequest, type HelpRequest } from '../src/help-requests'
import { saveRequest } from '../src/help-client'
import { samplePlaces } from '../src/sample'
afterEach(() => { cleanup(); localStorage.clear() })

const draft = () => ({ ...blankRequest(samplePlaces[0]), issue: 'billing' as const, flowStep: 'details' as const, description: 'Charged twice in October.', locations: ['1908 SW Huntwick Ave'], wording: { report: { second: 'A charge appears more than once' }, response: {} } })

test('an unfinished draft opens as the request and continues at the saved step', async () => {
  await saveRequest(true, draft(), 0)
  const onResume = vi.fn<(r: HelpRequest) => void>()
  render(<RequestHistory language="en" sample onResume={onResume} />)
  const strip = await screen.findByRole('region', { name: 'Finish your message' })
  expect(document.querySelector('.history-meta')).toHaveTextContent('Bill or charge')
  expect(screen.getByRole('region', { name: 'Your message' })).toHaveTextContent('No message written yet.')
  fireEvent.click(screen.getByRole('button', { name: 'Full record' }))
  const facts = document.querySelector('.history-facts') as HTMLElement
  expect(within(facts).getByText(/A charge appears more than once/)).toBeVisible()
  expect(within(facts).getByText(/Charged twice in October\./)).toBeVisible()
  expect(within(facts).getByText('1908 SW Huntwick Ave')).toBeVisible()
  expect(within(facts).getByText(/^Step \d of \d · Where and when$/)).toBeVisible()
  expect(screen.queryByText('Original issue')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('button', { name: 'Delete draft' })).toHaveClass('history-quiet')
  fireEvent.click(within(strip).getByRole('button', { name: 'Continue draft' }))
  expect(onResume).toHaveBeenCalledOnce()
  expect(onResume.mock.calls[0][0].draft.flowStep).toBe('details')
})

test('statuses describe where the resident stands, in both languages', async () => {
  await saveRequest(true, { ...draft(), outcomes: [{ id: 'o', kind: 'emailed', route: 'provider', name: 'Supplier', on: '2026-11-02' }], followUpOn: '2099-01-01' }, 0)
  render(<RequestHistory language="es" sample onResume={() => {}} />)
  expect(await screen.findByRole('region', { name: 'Esperando respuesta' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Registrar una novedad' })).toBeVisible()
  expect(screen.queryByText('Abierto')).not.toBeInTheDocument()
})
