import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { RequestHistory } from '../src/RequestHistory'
import { blankRequest, type HelpDraft, type HelpRequest } from '../src/help-requests'
import { SAMPLE_HELP_KEY } from '../src/help-client'
import { addBusinessDays, localDate, recordOutcome } from '../src/help-outcomes'
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })

const place = { id: `ADH:${'a'.repeat(64)}`, name: 'BENTONVILLE WATER UTILITIES', county: 'Benton', kind: 'system' as const }
const longBody = 'Hello,\n\nMy water has been going in and out since Monday.\n\nIt stops for an hour at a time.\n\nIt happens most mornings.\n\nCould you check what is causing it?\n\nThank you.'
const draft = (patch: Partial<HelpDraft> = {}): HelpDraft => ({ ...blankRequest(place), subject: 'Intermittent water service — 1914 Southwest Cypress', issue: 'service', flowStep: 'review', body: longBody, ...patch })
const record = (d: HelpDraft, updatedAt = Date.parse('2026-11-12T16:55:00'), patch: Partial<HelpRequest> = {}): HelpRequest => ({ id: d.id, owner: 'sample', draft: d, revision: 1, status: 'open', updatedAt, messages: [], events: [], replyToken: '', ...patch })
const contactedOn = (on: string, d = draft()) => ({ ...d, ...recordOutcome(d, 'emailed', 'provider', place.name, { on }) })
const seed = (...records: HelpRequest[]) => localStorage.setItem(SAMPLE_HELP_KEY, JSON.stringify(records))
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d) }

describe('History renders by count', () => {
  test('message and details share the responsive detail layout', async () => {
    seed(record(draft()))
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const message = await screen.findByRole('region', { name: 'Your message' })
    const details = screen.getByRole('region', { name: 'Details' })
    expect(message.closest('.history-content-grid')).not.toBeNull()
    expect(details.closest('.history-content-grid')).toBe(message.closest('.history-content-grid'))
  })
  test('no requests shows one line and a way into Help', async () => {
    const start = vi.fn(), user = userEvent.setup()
    render(<RequestHistory language="en" sample onResume={() => {}} onStart={start} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'History' })).toBeVisible()
    expect(screen.getByText('Sample requests you save appear here, on this device only.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Get help with a water issue' }))
    expect(start).toHaveBeenCalledOnce()
  })

  test('one request opens on the request itself, with no list or group headings', async () => {
    const one = record(draft())
    seed(one)
    const resume = vi.fn(), start = vi.fn(), user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<RequestHistory language="en" sample onResume={resume} onStart={start} />)
    expect(await screen.findByRole('heading', { level: 1, name: one.draft.subject })).toBeVisible()
    expect(screen.getByRole('heading', { level: 1, name: one.draft.subject }).closest('.history-card--status')).not.toBeNull()
    expect(screen.queryByText('Your request')).toBeNull()
    expect(document.querySelector('.history-meta')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Refresh$/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /Needs you|In progress/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'All requests' })).toBeNull()
    expect(document.querySelector('.history-row')).toBeNull()
    // Strip: ready to send, one primary action.
    const strip = screen.getByRole('region', { name: 'Ready to send' })
    expect(strip).toHaveClass('tone-teal')
    expect(strip).toHaveTextContent('You haven’t contacted them yet.')
    expect(document.querySelectorAll('.history-detail .primary')).toHaveLength(1)
    expect(within(strip).getByRole('button', { name: 'Start another request' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Continue draft' }))
    expect(resume).toHaveBeenCalledWith(one)
    // Stepper uses the four fixed labels.
    expect(within(screen.getByRole('list', { name: 'Your progress' })).getAllByRole('listitem').map(li => li.querySelector('b')!.firstChild!.textContent)).toEqual(['Prepared', 'Contacted', 'Follow up', 'Closed'])
    // Message shown inline with To and Subject.
    const message = screen.getByRole('region', { name: 'Your message' })
    expect(message).toHaveTextContent('Draft — not sent')
    expect(message).toHaveTextContent('Bentonville Water Utilities')
    await user.click(screen.getByRole('button', { name: 'Start another request' }))
    expect(start).toHaveBeenCalledOnce()
    // Deleting the only request shows the empty state.
    await user.click(screen.getByRole('button', { name: 'Delete draft' }))
    expect(await screen.findByText('Sample requests you save appear here, on this device only.')).toBeVisible()
  })

  test('two or more become a grouped list; rows open the same detail and buttons do not', async () => {
    const due = record(contactedOn(daysAgo(30), draft({ subject: 'Due request' })), Date.parse('2026-11-01T10:00:00'))
    const unsent = record(draft({ subject: 'Unsent request' }), Date.parse('2026-11-12T10:00:00'))
    const older = record(draft({ subject: 'Older unsent request' }), Date.parse('2026-11-02T10:00:00'))
    const resolvedDraft = contactedOn('2026-10-01', draft({ subject: 'Resolved request' }))
    const resolved = record({ ...resolvedDraft, ...recordOutcome(resolvedDraft, 'resolved', 'provider', place.name, { on: '2026-10-05', note: 'Main repaired' }) })
    seed(due, unsent, older, resolved)
    const resume = vi.fn(), user = userEvent.setup()
    render(<RequestHistory language="en" sample onResume={resume} />)
    const needs = await screen.findByRole('list', { name: /Needs you/ })
    expect(screen.getByRole('heading', { name: 'Needs you 1' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'In progress 2' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Closed 1' })).toBeVisible()
    const headings = [...document.querySelectorAll('.history-group-title')].map(h => h.firstChild!.textContent!.trim())
    expect(headings).toEqual(['Needs you', 'In progress', 'Closed'])
    const progress = screen.getByRole('list', { name: /In progress/ })
    expect(within(progress).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Unsent request', 'Older unsent request'])
    const [dueRow] = within(needs).getAllByRole('listitem')
    expect(dueRow).toHaveTextContent('Follow-up suggested')
    expect(dueRow).toHaveTextContent('You emailed Bentonville Water Utilities')
    expect(dueRow).not.toHaveTextContent('BENTONVILLE')
    // List rows carry no per-row CTA; the whole row opens the detail view.
    expect(dueRow.querySelector('.primary')).toBeNull()
    expect(within(dueRow).queryByRole('button', { name: /Log an update|Log a follow-up|View request|View draft/ })).toBeNull()
    // Closed rows drop the stepper.
    const closedRow = within(screen.getByRole('list', { name: /Closed/ })).getAllByRole('listitem')[0]
    expect(closedRow.querySelector('.history-stepper')).toBeNull()
    expect(closedRow.querySelector('.primary')).toBeNull()
    // Clicking the row body opens the detail view.
    const unsentRow = within(progress).getAllByRole('listitem')[0]
    fireEvent.click(unsentRow.querySelector('.history-row-meta')!)
    expect(screen.getByRole('heading', { level: 1, name: 'Unsent request' })).toBeVisible()
    // Continue draft lives in the detail view's strip.
    await user.click(screen.getByRole('button', { name: 'Continue draft' }))
    expect(resume).toHaveBeenCalledWith(unsent)
    await user.click(screen.getByRole('button', { name: 'All requests' }))
    await user.click(within(screen.getByRole('list', { name: /Needs you/ })).getByRole('button', { name: 'Due request' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Due request' })).toBeVisible()
  })

  test('more than three closed requests collapse behind a disclosure', async () => {
    const closed = [1, 2, 3, 4].map(n => { const d = contactedOn('2026-10-01', draft({ subject: `Closed ${n}` })); return record({ ...d, ...recordOutcome(d, 'closed', 'provider', place.name, { on: '2026-10-02' }) }) })
    seed(...closed, record(draft()))
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const group = await screen.findByRole('list', { name: /Closed/ })
    expect(group.closest('details')).not.toHaveAttribute('open')
  })
})

describe('Next-action strip', () => {
  test.each([
    ['due', () => contactedOn(daysAgo(20)), 'tone-amber', /^Follow-up suggested \d+ days ago$/, 'Log a follow-up'],
    ['today', () => ({ ...contactedOn(daysAgo(7)), followUpOn: localDate() }), 'tone-amber', /^Follow-up suggested today$/, 'Log a follow-up'],
    ['waiting', () => contactedOn(localDate()), 'tone-teal', /^Waiting for a reply$/, 'Log an update'],
    ['unsent', () => draft({ flowStep: 'details', body: '' }), 'tone-teal', /^Finish your message$/, 'Continue draft'],
  ])('%s', async (_name, make, tone, title, button) => {
    seed(record(make()))
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const strip = await screen.findByRole('region', { name: title })
    expect(strip).toHaveClass(tone)
    expect(within(strip).getByRole('button', { name: button })).toHaveClass('primary')
    expect(document.querySelectorAll('.history-detail .primary')).toHaveLength(1)
  })

  test('the follow-up date appears once, in the stepper', async () => {
    const d = contactedOn(localDate())
    seed(record(d))
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const stepper = await screen.findByRole('list', { name: 'Your progress' })
    const shown = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${addBusinessDays(localDate(), 5)}T12:00:00Z`))
    expect(within(stepper).getByText(shown)).toBeVisible()
    expect(screen.getByRole('region', { name: 'Waiting for a reply' })).not.toHaveTextContent(shown)
  })

  test('resolved shows the closing note with no primary action', async () => {
    const d = contactedOn('2026-11-02')
    seed(record({ ...d, ...recordOutcome(d, 'resolved', 'provider', place.name, { on: '2026-11-10', note: 'Crew replaced the valve.' }) }))
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const strip = await screen.findByRole('region', { name: 'Resolved Nov 10' })
    expect(strip).toHaveClass('tone-green')
    expect(strip).toHaveTextContent('Crew replaced the valve.')
    expect(document.querySelectorAll('.history-detail .primary')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Reopen' })).toHaveClass('secondary')
  })

  test('Show full message expands by keyboard', async () => {
    seed(record(draft()))
    const user = userEvent.setup()
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const toggle = await screen.findByRole('button', { name: 'Show full message' })
    const body = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(body).toHaveClass('is-clipped')
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
    expect(body).not.toHaveClass('is-clipped')
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Show full message' })).toHaveAttribute('aria-expanded', 'false')
  })

  test('Spanish strings and locale dates', async () => {
    const d = contactedOn('2026-11-02')
    seed(record({ ...d, followUpOn: '2099-01-01' }), record(draft({ subject: 'Segunda' })))
    const user = userEvent.setup()
    render(<RequestHistory language="es" sample onResume={() => {}} onStart={() => {}} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Historial' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'En curso 2' })).toBeVisible()
    expect(screen.getAllByText('Sin respuesta registrada').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Empezar otra solicitud' })).toBeVisible()
    const segundaRow = screen.getByRole('button', { name: 'Segunda' }).closest('li') as HTMLElement
    fireEvent.click(segundaRow.querySelector('.history-row-meta')!)
    expect(screen.getByRole('heading', { level: 1, name: 'Segunda' }).closest('.history-card--status')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Listo para enviar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mostrar el mensaje completo' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Tu mensaje' })).toBeVisible()
    expect(within(screen.getByRole('list', { name: 'Tu progreso' })).getAllByRole('listitem').map(li => li.querySelector('b')!.firstChild!.textContent)).toEqual(['Preparada', 'Contactado', 'Seguimiento', 'Cerrada'])
    await user.click(screen.getByRole('button', { name: 'Todas las solicitudes' }))
    await user.click(screen.getByRole('button', { name: 'Intermittent water service — 1914 Southwest Cypress' }))
    expect(screen.getByRole('region', { name: 'Esperando respuesta' })).toHaveTextContent('Les enviaste un correo el 2 nov')
    expect(screen.getByRole('heading', { name: 'Qué pasó' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Volver a contactarlos' })).toBeVisible()
  })
})

test('an account conversation keeps sent copies and replies while status and follow-ups change', async () => {
  const d = { ...blankRequest({ id: `ADH:${'a'.repeat(64)}`, name: 'Synthetic provider', county: 'Benton', kind: 'system' }), description: 'Original resident facts', subject: 'Original subject', body: 'Original sent words', stage: 3 }
  let current: HelpRequest = { id: d.id, owner: 'alice', draft: d, original: structuredClone(d), revision: 1, status: 'open', updatedAt: Date.now(), replyToken: 'synthetic', events: [], messages: [
    { id: 'outgoing', at: Date.now() - 1000, subject: d.subject, body: d.body, sources: [{ recordId: 'notice', url: 'https://example.test/notice', label: 'ADH' }], attachments: [{ id: 'attachment', name: 'original.txt', type: 'text/plain', data: 'YQ==' }], destination: 'provider@example.test', delivery: 'delivered', direction: 'outgoing', draftRevision: 1 },
    { id: 'incoming', at: Date.now(), subject: 'Reply', body: 'We received your request, not a resolution.', attachments: [], destination: 'provider@example.test', delivery: 'delivered', direction: 'incoming', draftRevision: 0, unsupportedAttachments: 1 },
  ] }
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/session')) return Response.json({ enabled: true, user: { id: 'alice', email: 'resident@example.test' }, delivery: false, accountUrl: null })
    if (url.endsWith('/status')) { current = { ...current, status: JSON.parse(String(init?.body)).status }; return Response.json(current) }
    if (url.endsWith('/requests') && init?.method === 'POST') { const { draft, revision } = JSON.parse(String(init.body)); current = { ...current, draft, revision: revision + 1 }; return Response.json(current) }
    if (url.endsWith('/requests') && init?.method === 'GET') return Response.json([current])
    throw new Error(`Unexpected synthetic API: ${url}`)
  })
  const resume = vi.fn()
  render(<RequestHistory language="en" sample={false} requestId={d.id} onResume={resume} />)
  expect(await screen.findByRole('region', { name: 'Reply recorded' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Your message' })).toHaveTextContent('Sent through WAVE')
  fireEvent.click(screen.getByRole('button', { name: 'Full record' }))
  fireEvent.click(screen.getByText('Sources saved with message — Original subject'))
  expect(screen.getByRole('link', { name: 'View official source — ADH' })).toHaveAttribute('href', 'https://example.test/notice')
  expect(screen.getByText('We received your request, not a resolution.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Download: original.txt' })).toBeVisible()
  expect(screen.getByText(/attachments that WAVE cannot import/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close request' }))
  expect(await screen.findByRole('button', { name: 'Reopen request' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Closed' })).toHaveClass('tone-slate')
  expect(screen.queryByRole('button', { name: /Write a follow-up/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Reopen request' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Write a follow-up to Synthetic provider' }))
  await waitFor(() => expect(resume).toHaveBeenCalledTimes(1))
  expect(current.messages[0].body).toBe('Original sent words')
  expect(current.original?.description).toBe('Original resident facts')
})

describe('Composition', () => {
  test('the detail page is three cards, one privacy line and a modal log form', async () => {
    seed(record(contactedOn(daysAgo(20))))
    const user = userEvent.setup()
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const opener = await screen.findByRole('button', { name: 'Log a follow-up' })
    expect(document.querySelectorAll('.history-detail .history-card')).toHaveLength(3)
    expect(document.querySelectorAll('.history-detail .history-stepper')).toHaveLength(1)
    // Said once, at the very bottom — not under every block.
    expect(screen.getAllByText(/only what you log here/)).toHaveLength(1)
    expect(document.querySelector('.history-footnote')).toHaveTextContent(/only what you log here/)
    expect(screen.queryByText(/Calling or emailing/)).toBeNull()
    expect(screen.queryByText(/WAVE can’t see calls, replies elsewhere/)).toBeNull()
    expect(screen.queryByText(/Full record and more options/)).toBeNull()
    // The form is a modal: focus starts inside, Escape closes it and focus returns.
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Log a follow-up' })
    expect(dialog).toHaveAttribute('open')
    expect(document.activeElement).toBe(within(dialog).getByRole('combobox', { name: 'What happened?' }))
    expect(within(dialog).getByText(/WAVE won’t notify anyone/)).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Log a follow-up' }))
    await user.click(screen.getByRole('button', { name: 'Log a follow-up' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('a completed stage shows its date, or says none was recorded', async () => {
    seed(record(contactedOn('2026-11-02')))
    render(<RequestHistory language="en" sample onResume={() => {}} />)
    const [prepared, contactedStage] = within(await screen.findByRole('list', { name: 'Your progress' })).getAllByRole('listitem')
    expect(prepared).toHaveTextContent('Prepared')
    expect(prepared).toHaveTextContent('Date not recorded')
    expect(prepared).not.toHaveTextContent('—')
    expect(contactedStage).toHaveTextContent('Nov 2 · email')
  })
})
