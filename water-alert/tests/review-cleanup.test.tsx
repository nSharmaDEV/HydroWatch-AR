import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ReviewEmail } from '../src/ReviewEmail'
import { blankRequest } from '../src/help-requests'

afterEach(cleanup)
test('Review uses compact actions, a citations popup and highlighted missing answers', () => {
  const draft = { ...blankRequest({ id: 'review-test', name: 'Test supplier', county: 'Benton', kind: 'system' }), facts: [{ id: 'source', kind: 'saved' as const, included: true, text: 'Source wording', sources: [{ recordId: 'source', url: 'https://example.test/source', label: 'Test source' }] }] }
  render(<ReviewEmail draft={draft} language="en" extras={<button>Add a photo or document</button>} edit={() => {}} changeFacts={() => {}} go={() => {}} regenerate={() => {}} />)
  expect(screen.getByRole('heading', { name: 'Problems' })).toBeVisible()
  expect(screen.queryByText('View source details')).not.toBeInTheDocument()
  expect(screen.queryByText('Files (0)')).not.toBeInTheDocument()
  expect(screen.queryByText('None added')).not.toBeInTheDocument()
  expect(screen.queryByText('Add', { exact: true })).not.toBeInTheDocument()
  expect(document.querySelector('.request-answer-missing')).not.toBeNull()
  expect(document.querySelector('.request-review-information')?.firstElementChild).toHaveClass('request-signature')
  expect(screen.getByRole('heading', { name: 'Name / reply contact (optional)' })).toBeInTheDocument()
  expect(screen.getByLabelText('Resident name (optional)')).toBeVisible()
  expect(screen.getByLabelText('Preferred reply contact (optional)')).toBeVisible()
  fireEvent.click(screen.getByRole('heading', { name: 'Name / reply contact (optional)' }))
  expect(screen.getByLabelText('Resident name (optional)')).toBeVisible()
  expect(document.querySelector('.request-signature summary')).toBeNull()
  const missingRow = screen.getByRole('row', { name: /First noticed/ })
  expect(within(missingRow).getByRole('button', { name: 'Edit reported start date' })).toHaveClass('request-answer-info')
  const sourceTable = screen.getByRole('table', { name: /Problems:/ })
  expect(within(sourceTable).getByRole('row', { name: /Source View source 1/ })).toBeInTheDocument()
  expect(within(sourceTable).getByRole('row', { name: /Include in email/ })).toContainElement(screen.getByRole('checkbox', { name: 'Include in email' }))
  for (const name of ['Update draft from answers', 'Download email', 'Download report']) {
    expect(screen.getByRole('button', { name }).querySelector('svg')).not.toBeNull()
  }
  expect(screen.queryByRole('dialog', { name: 'Cited sources' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cited sources' }))
  expect(screen.getByRole('dialog', { name: 'Cited sources' })).toBeVisible()
  expect(within(screen.getByRole('dialog', { name: 'Cited sources' })).getByRole('link', { name: /Test source/ })).toHaveAttribute('href', 'https://example.test/source')
  fireEvent.click(screen.getByRole('button', { name: 'Close citations' }))
  expect(screen.queryByRole('dialog', { name: 'Cited sources' })).not.toBeInTheDocument()
})
