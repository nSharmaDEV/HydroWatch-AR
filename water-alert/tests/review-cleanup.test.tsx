import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ReviewEmail } from '../src/ReviewEmail'
import { blankRequest } from '../src/help-requests'

afterEach(cleanup)
test('Review keeps citations without removed records, downloads or an answers table', () => {
  const draft = { ...blankRequest({ id: 'review-test', name: 'Test supplier', county: 'Benton', kind: 'system' }), facts: [{ id: 'source', kind: 'saved' as const, included: true, text: 'Source wording', sources: [{ recordId: 'source', url: 'https://example.test/source', label: 'Test source' }] }] }
  render(<ReviewEmail draft={draft} language="en" extras={<button>Add a photo or document</button>} edit={() => {}} changeFacts={() => {}} go={() => {}} regenerate={() => {}} />)
  expect(screen.queryByText('View source details')).not.toBeInTheDocument()
  expect(screen.queryByText('Files (0)')).not.toBeInTheDocument()
  expect(screen.queryByText('None added')).not.toBeInTheDocument()
  expect(screen.queryByText('Add', { exact: true })).not.toBeInTheDocument()
  // The per-answer "What you provided" table and its Edit/Add links were removed.
  expect(document.querySelector('.request-answer-missing')).toBeNull()
  expect(screen.queryByRole('row', { name: /First noticed/ })).not.toBeInTheDocument()
  // Name and reply contact are asked on "What should they do?"; Review opens on the email itself.
  expect(document.querySelector('.request-review-card')?.firstElementChild).toHaveClass('request-composer')
  expect(document.querySelector('.request-signature')).toBeNull()
  expect(screen.queryByLabelText(/Your name|Resident name/)).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/How can they reach you|Preferred reply contact/)).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Your email' })).toContainElement(screen.getByLabelText('Message'))
  // Review no longer exposes records or download/tool sections.
  expect(screen.queryByRole('dialog', { name: 'Records' })).not.toBeInTheDocument()
  expect(document.querySelector('.request-review-update')).toBeNull()
  for (const name of ['Records (1 of 1 included)', 'Download email', 'Download report']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Cited sources' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cited sources' }))
  expect(screen.getByRole('dialog', { name: 'Cited sources' })).toBeVisible()
  expect(within(screen.getByRole('dialog', { name: 'Cited sources' })).getByRole('link', { name: /Test source/ })).toHaveAttribute('href', 'https://example.test/source')
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Cited sources' }), { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Cited sources' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cited sources' })).toHaveFocus()
})
