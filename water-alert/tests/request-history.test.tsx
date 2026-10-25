import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { RequestHistory } from '../src/RequestHistory'
import { blankRequest, type HelpRequest } from '../src/help-requests'
import { SAMPLE_HELP_KEY } from '../src/help-client'
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
test('saved draft is shown as an aligned row with one supplier and a clear resume action', async () => {
  const place = { id: `ADH:${'a'.repeat(64)}`, name: 'Leisure Hills Mobile Home Park', county: 'Benton', kind: 'system' as const }
  const draft = { ...blankRequest(place), subject: 'Intermittent water service — update requested', issue: 'service' as const, stage: 5 }
  const record: HelpRequest = { id: draft.id, owner: 'sample', draft, revision: 1, status: 'open', updatedAt: Date.parse('2026-10-24T21:09:00'), messages: [], events: [], replyToken: '' }
  localStorage.setItem(SAMPLE_HELP_KEY, JSON.stringify([record]))
  const resume = vi.fn()
  render(<RequestHistory language="en" sample onResume={resume} />)

  const row = await screen.findByRole('listitem')
  expect(row).toHaveClass('request-draft-card')
  expect(row).toHaveTextContent('Intermittent water service — update requested')
  expect(row).toHaveTextContent('Leisure Hills Mobile Home Park')
  expect(within(row).getAllByText('Leisure Hills Mobile Home Park')).toHaveLength(1)
  expect(row).toHaveTextContent('Service or outage')
  expect(row).toHaveTextContent('Draft')
  expect(within(row).getByRole('button', { name: 'Resume draft' })).toBeVisible()
  expect(row.querySelector('time')).toHaveAttribute('datetime', new Date(record.updatedAt).toISOString())
  const pageHeading = screen.getByRole('heading', { name: 'History', level: 1 }).closest('.request-history-header') as HTMLElement
  expect(within(pageHeading).getByRole('button', { name: 'Refresh History' })).toBeVisible()
  expect(screen.getByRole('heading', { name: /Saved drafts · 1/ })).toBeVisible()
  await userEvent.setup().click(within(row).getByRole('button', { name: 'Resume draft' }))
  expect(resume).toHaveBeenCalledWith(record)
})
test('a conversation keeps sent copies and replies while resident status and same-request follow-ups change', async () => {
  const draft = { ...blankRequest({ id: `ADH:${'a'.repeat(64)}`, name: 'Synthetic provider', county: 'Benton', kind: 'system' }), description: 'Original resident facts', subject: 'Original subject', body: 'Original sent words', stage: 3 }
  let record: HelpRequest = { id: draft.id, owner: 'alice', draft, original: structuredClone(draft), revision: 1, status: 'open', updatedAt: Date.now(), replyToken: 'synthetic', events: [], messages: [
    { id: 'outgoing', at: Date.now() - 1000, subject: draft.subject, body: draft.body, sources: [{ recordId: 'notice', url: 'https://example.test/notice', label: 'ADH' }], attachments: [{ id: 'attachment', name: 'original.txt', type: 'text/plain', data: 'YQ==' }], destination: 'provider@example.test', delivery: 'delivered', direction: 'outgoing', draftRevision: 1 },
    { id: 'incoming', at: Date.now(), subject: 'Reply', body: 'We received your request, not a resolution.', attachments: [], destination: 'provider@example.test', delivery: 'delivered', direction: 'incoming', draftRevision: 0, unsupportedAttachments: 1 },
  ] }
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/session')) return Response.json({ enabled: true, user: { id: 'alice', email: 'resident@example.test' }, delivery: false, accountUrl: null })
    if (url.endsWith('/status')) { record.status = JSON.parse(String(init?.body)).status; return Response.json(record) }
    if (url.endsWith('/requests') && init?.method === 'POST') { const { draft, revision } = JSON.parse(String(init.body)); record = { ...record, draft, revision: revision + 1 }; return Response.json(record) }
    if (url.endsWith('/requests') && init?.method === 'GET') return Response.json([record])
    throw new Error(`Unexpected synthetic API: ${url}`)
  })
  const resume = vi.fn()
  render(<RequestHistory language="en" sample={false} requestId={draft.id} onResume={resume} />)
  expect(await screen.findByText('Original sent words')).toBeVisible()
  fireEvent.click(screen.getByText('Sources saved with message — Original subject'))
  expect(screen.getByRole('link', { name: 'View official source — ADH' })).toHaveAttribute('href', 'https://example.test/notice')
  expect(screen.getByText('We received your request, not a resolution.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Download: original.txt' })).toBeVisible()
  expect(screen.getByText(/attachments that WAVE cannot import/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Close request' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Close request' }))
  expect(await screen.findByRole('button', { name: 'Reopen request' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Write a follow-up' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Reopen request' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Write a follow-up' }))
  await waitFor(() => expect(resume).toHaveBeenCalledTimes(1))
  expect(resume.mock.calls[0][0].id).toBe(draft.id)
  expect(record.messages[0].body).toBe('Original sent words')
  expect(record.messages[0].attachments[0].name).toBe('original.txt')
  expect(record.draft.body).toBe('')
  expect(record.original?.description).toBe('Original resident facts')
})
