import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ReviewEmail } from '../src/ReviewEmail'
import { blankRequest } from '../src/help-requests'

afterEach(cleanup)
test('Review uses compact actions, a records popup and a citations popup without an answers table', () => {
  const draft = { ...blankRequest({ id: 'review-test', name: 'Test supplier', county: 'Benton', kind: 'system' }), facts: [{ id: 'source', kind: 'saved' as const, included: true, text: 'Source wording', sources: [{ recordId: 'source', url: 'https://example.test/source', label: 'Test source' }] }] }
  render(<ReviewEmail draft={draft} language="en" extras={<button>Add a photo or document</button>} edit={() => {}} changeFacts={() => {}} go={() => {}} regenerate={() => {}} />)
  expect(screen.queryByText('View source details')).not.toBeInTheDocument()
  expect(screen.queryByText('Files (0)')).not.toBeInTheDocument()
  expect(screen.queryByText('None added')).not.toBeInTheDocument()
  expect(screen.queryByText('Add', { exact: true })).not.toBeInTheDocument()
  // The per-answer "What you provided" table and its Edit/Add links were removed.
  expect(document.querySelector('.request-answer-missing')).toBeNull()
  expect(screen.queryByRole('row', { name: /First noticed/ })).not.toBeInTheDocument()
  expect(document.querySelector('.request-review-card')?.firstElementChild).toHaveClass('request-signature')
  expect(screen.getByRole('region', { name: 'Name / reply contact (optional)' })).toBeInTheDocument()
  expect(screen.getByLabelText('Resident name (optional)')).toBeVisible()
  expect(screen.getByLabelText('Preferred reply contact (optional)')).toBeVisible()
  expect(document.querySelector('.request-signature summary')).toBeNull()
  // Records are behind one compact button and open in a dialog.
  expect(screen.queryByRole('dialog', { name: 'Records' })).not.toBeInTheDocument()
  const recordsButton = screen.getByRole('button', { name: 'Records (1 of 1 included)' })
  expect(recordsButton).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(recordsButton)
  expect(recordsButton).toHaveAttribute('aria-expanded', 'true')
  const records = screen.getByRole('dialog', { name: 'Records' })
  expect(records).toHaveAttribute('id', 'request-records')
  expect(within(records).getByRole('heading', { name: 'Problems' })).toBeVisible()
  const sourceTable = within(records).getByRole('table', { name: /Problems:/ })
  expect(within(sourceTable).getByRole('row', { name: /Source View source 1/ })).toBeInTheDocument()
  expect(within(sourceTable).getByRole('row', { name: /Include in email/ })).toContainElement(screen.getByRole('checkbox', { name: 'Include in email' }))
  fireEvent.click(within(records).getByRole('button', { name: 'Close records' }))
  expect(screen.queryByRole('dialog', { name: 'Records' })).not.toBeInTheDocument()
  expect(recordsButton).toHaveFocus()
  for (const name of ['Update draft from answers', 'Download email', 'Download report']) {
    expect(screen.getByRole('button', { name }).querySelector('svg')).not.toBeNull()
  }
  expect(screen.getByRole('button', { name: 'Update draft from answers' })).toHaveAttribute('title', expect.stringContaining('including manual edits'))
  expect(screen.queryByText('Replaces your subject and message, including manual edits.')).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Cited sources' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cited sources' }))
  expect(screen.getByRole('dialog', { name: 'Cited sources' })).toBeVisible()
  expect(within(screen.getByRole('dialog', { name: 'Cited sources' })).getByRole('link', { name: /Test source/ })).toHaveAttribute('href', 'https://example.test/source')
  fireEvent.click(screen.getByRole('button', { name: 'Close citations' }))
  expect(screen.queryByRole('dialog', { name: 'Cited sources' })).not.toBeInTheDocument()
})
