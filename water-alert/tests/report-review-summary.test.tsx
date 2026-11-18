import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ReviewEmail } from '../src/ReviewEmail'
import { initialFacts } from '../src/help-flow'
import { blankRequest } from '../src/help-requests'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

afterEach(cleanup)
test('review distinguishes form answers from the editable email and shows cited historical context', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS', county: 'Benton', kind: 'system' as const }
  const draft = { ...blankRequest(place), issue: 'service' as const, description: 'Low pressure', body: 'My edited email', facts: initialFacts(place, [], false, false, 'en'), wording: { report: {}, response: { reportNext: 'Explain what I should do next' } } }
  render(<ReviewEmail draft={draft} language="en" extras={null} edit={vi.fn()} changeFacts={vi.fn()} go={vi.fn()} regenerate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
  expect(screen.getByRole('region', { name: 'Summary of form answers' })).toHaveTextContent('Low pressure')
  expect(screen.getByRole('region', { name: 'Summary of form answers' })).toHaveTextContent('Explain what I should do next')
  expect(screen.getByRole('region', { name: 'Summary of form answers' })).toHaveTextContent('Historical findings do not establish current conditions or the cause of your experience')
  expect(screen.getByRole('region', { name: 'Summary of form answers' }).querySelector('a')).toHaveAttribute('href', expect.stringContaining('#page='))
  fireEvent.click(screen.getByRole('button', { name: 'Back to email' }))
  expect(screen.getByLabelText('Message')).toHaveValue('My edited email')
})
