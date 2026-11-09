import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RequestHistory } from '../src/RequestHistory'
import { blankRequest, type HelpRequest } from '../src/help-requests'
import { saveRequest } from '../src/help-client'
import { samplePlaces } from '../src/sample'
afterEach(() => { cleanup(); localStorage.clear() })

const draft = () => ({ ...blankRequest(samplePlaces[0]), issue: 'billing' as const, flowStep: 'details' as const, description: 'Charged twice in October.', locations: ['1908 SW Huntwick Ave'], wording: { report: { second: 'A charge appears more than once' }, response: {} } })

test('a saved draft opens as one summary card that continues at the saved step', async () => {
  await saveRequest(true, draft(), 0)
  const onResume = vi.fn<(r: HelpRequest) => void>()
  render(<RequestHistory language="en" sample onResume={onResume} />)
  const row = await screen.findByRole('button', { name: /Question about my water bill|Water issue/ })
  expect(screen.getAllByText('Not sent yet').length).toBeGreaterThan(0)
  fireEvent.click(row)
  const card = screen.getByRole('region', { name: 'Draft summary' })
  expect(within(card).getByText('Bill or charge')).toBeVisible()
  expect(within(card).getByText(/A charge appears more than once/)).toBeVisible()
  expect(within(card).getByText(/Charged twice in October\./)).toBeVisible()
  expect(within(card).getByText('1908 SW Huntwick Ave')).toBeVisible()
  expect(within(card).getByText('Step 2 of 4 · When and where')).toBeVisible()
  // No empty disclosure for drafts that have nothing extra saved.
  expect(screen.queryByText('Original issue')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Delete draft' })).toHaveClass('text-button')
  fireEvent.click(within(card).getByRole('button', { name: 'Continue draft' }))
  expect(onResume).toHaveBeenCalledOnce()
  expect(onResume.mock.calls[0][0].draft.flowStep).toBe('details')
})

test('statuses describe where the resident stands, in both languages', async () => {
  await saveRequest(true, { ...draft(), outcomes: [{ id: 'o', kind: 'emailed', route: 'provider', name: 'Supplier', on: '2026-11-02' }], followUpOn: '2099-01-01' }, 0)
  render(<RequestHistory language="es" sample onResume={() => {}} />)
  expect(await screen.findByText('Enviado – esperando respuesta')).toBeVisible()
  expect(screen.queryByText('Abierto')).not.toBeInTheDocument()
})
