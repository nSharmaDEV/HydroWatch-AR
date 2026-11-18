import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ReviewEmail } from '../src/ReviewEmail'
import { initialFacts } from '../src/help-flow'
import { blankRequest } from '../src/help-requests'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { ECHO_RECORD_KEY } from '../src/echo-records'

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

test('updated evidence needs confirmation and never replaces the email during review', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
  const draft = { ...blankRequest(place), issue: 'report' as const, body: 'My own email', facts: initialFacts(place, [], false, false, 'en') }
  localStorage.setItem(ECHO_RECORD_KEY, JSON.stringify({ [place.id]: { records: {
    pwsid: 'AR0000747', retrievedOn: '2026-11-17', rejected: 0, truncated: false,
    violations: [{ id: 'new', rule: 'Public Notice', from: '01/01/2020', category: 'Other', actions: [] }], surveys: [], notices: [], formalActions: [],
  } } }))
  const changeFacts = vi.fn(), edit = vi.fn(), confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<ReviewEmail draft={draft} language="en" extras={null} edit={edit} changeFacts={changeFacts} go={vi.fn()} regenerate={vi.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent('1 historical finding changed or added')
  fireEvent.click(screen.getByRole('button', { name: 'Use updated evidence' }))
  expect(changeFacts).not.toHaveBeenCalled()
  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Use updated evidence' }))
  expect(changeFacts).toHaveBeenCalledOnce()
  expect(edit).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Message')).toHaveValue('My own email')
})

test('answer review preserves dated resolution and conflicting accounts', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
  const facts = initialFacts(place, [], false, false, 'en')
  facts[0].record!.evidence = { period: '2025', action: 'Follow-up on 01/13/2026', resolution: 'Documented resolution: 01/13/2026', conflicts: 'The annual report prints Current.', federal: true }
  render(<ReviewEmail draft={{ ...blankRequest(place), issue: 'report', facts }} language="en" extras={null} edit={vi.fn()} changeFacts={vi.fn()} go={vi.fn()} regenerate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
  const summary = screen.getByRole('region', { name: 'Summary of form answers' })
  expect(summary).toHaveTextContent('Documented resolution: 01/13/2026')
  expect(summary).toHaveTextContent('The annual report prints Current.')
})
