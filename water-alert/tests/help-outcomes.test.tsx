import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addBusinessDays, followUpState, localDate, recordOutcome } from '../src/help-outcomes'
import { requestStages } from '../src/history-view'
import { defaultRequests } from '../src/ConfirmedWording'
import { blankRequest, type HelpDraft, type HelpRequest } from '../src/help-requests'
import { followUpDraft } from '../src/send-options'
import { generateMessage } from '../src/help-requests'
import { SendOptions } from '../src/SendOptions'
import { RequestHistory } from '../src/RequestHistory'
import { LIVE_LOCAL_HELP_KEY } from '../src/help-client'
import { PLACE_CATALOG } from '../src/place-catalog'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })
const fayetteville = PLACE_CATALOG.find(entry => entry.place.name === 'FAYETTEVILLE WATERWORKS')!.place
const base = (patch: Partial<HelpDraft> = {}): HelpDraft => ({ ...blankRequest(fayetteville), description: 'Low pressure every morning', subject: 'Low water pressure', body: 'Hello team,\n\nPressure is low.', ...patch })

describe('outcome model', () => {
  it('counts five business days and skips weekends', () => {
    expect(addBusinessDays('2026-11-06', 5)).toBe('2026-11-13') // Friday → next Friday
    expect(addBusinessDays('2026-11-07', 1)).toBe('2026-11-09') // Saturday → Monday
  })

  it('starts a reminder on contact, clears it on a reply and on resolution', () => {
    const sent = { ...base(), ...recordOutcome(base(), 'emailed', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-11-02', reference: ' T-1 ' }) }
    expect(sent.followUpOn).toBe('2026-11-09')
    expect(sent.outcomes![0]).toMatchObject({ kind: 'emailed', reference: 'T-1', on: '2026-11-02' })
    expect(followUpState(sent, '2026-11-08')).toBe('waiting')
    expect(followUpState(sent, '2026-11-09')).toBe('due')
    const replied = { ...sent, ...recordOutcome(sent, 'reply', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-11-04' }) }
    expect(followUpState(replied, '2026-11-20')).toBe('none')
    const resolved = { ...sent, ...recordOutcome(sent, 'resolved', 'provider', 'FAYETTEVILLE WATERWORKS') }
    expect(resolved.followUpOn).toBeUndefined()
    expect(followUpState(resolved, '2026-11-20')).toBe('resolved')
    expect(followUpState(base(), '2026-11-20')).toBe('none')
  })

  it('builds an escalation draft that cites the earlier contact and clears its own outcomes', () => {
    const sent = { ...base(), ...recordOutcome(base(), 'called', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-11-02', reference: 'A7' }) }
    const next = followUpDraft(sent, 'adh', crypto.randomUUID())
    expect(next).toMatchObject({ route: 'adh', recipientRoutes: ['adh'], flowStep: 'review', subject: '', body: '', priorContact: { name: 'FAYETTEVILLE WATERWORKS', on: '2026-11-02', reference: 'A7' } })
    expect(next.outcomes).toBeUndefined()
    expect(next.followUpOn).toBeUndefined()
    expect(generateMessage(next, 'en').body).toContain('I contacted FAYETTEVILLE WATERWORKS about this on')
    expect(generateMessage(next, 'en').body).toContain('(reference A7).')
    expect(generateMessage(next, 'en').body).not.toContain('it has not been resolved')
    expect(generateMessage(next, 'es').body).toContain('Me comuniqué con FAYETTEVILLE WATERWORKS sobre esto el')
  })
})

describe('Did you send it?', () => {
  it.each(['en', 'es'] as const)('records only what the resident confirms (%s)', async language => {
    const record = vi.fn()
    render(<SendOptions draft={base()} language={language} sample={false} blocked={false} copy={async () => true} record={record} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: language === 'en' ? /Call \(479\)/ : /Llamar \(479\)/ }))
    const prompt = within(screen.getByRole('group', { name: language === 'en' ? 'Did you reach FAYETTEVILLE WATERWORKS?' : '¿Pudiste hablar con FAYETTEVILLE WATERWORKS?' }))
    await user.type(prompt.getByRole('textbox', { name: /Reference|Número/ }), 'REF-9')
    await user.type(prompt.getByRole('textbox', { name: /What did they tell you|Qué te dijeron/ }), 'A crew will investigate')
    await user.click(prompt.getByRole('button', { name: language === 'en' ? 'Yes, I talked to them' : 'Sí, hablé con ellos' }))
    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0][0].outcomes[0]).toMatchObject({ kind: 'called', route: 'provider', reference: 'REF-9', note: 'A crew will investigate' })
    expect(record.mock.calls[0][0].followUpOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.getByRole('status')).toHaveTextContent(language === 'en' ? /History will show a follow-up reminder/ : /Historial mostrará un recordatorio/)
  })

  it('records nothing for Not yet and never prompts in samples', async () => {
    const record = vi.fn(), user = userEvent.setup()
    const { unmount } = render(<SendOptions draft={base()} language="en" sample={false} blocked={false} copy={async () => true} record={record} />)
    await user.click(screen.getByRole('button', { name: 'Log a contact attempt' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(record).not.toHaveBeenCalled()
    unmount()
    render(<SendOptions draft={base()} language="en" sample blocked={false} copy={async () => true} record={record} />)
    expect(screen.queryByRole('button', { name: 'Log a contact attempt' })).toBeNull()
  })
})

describe('Log a contact attempt', () => {
  it.each(['en', 'es'] as const)('offers contact logging without the removed panel and opens it as a popup over unchanged actions (%s)', async language => {
    const user = userEvent.setup()
    render(<SendOptions draft={base({ issue: 'service' })} language={language} sample={false} blocked={false} copy={async () => true} record={() => {}} />)
    expect(screen.queryByRole('region', { name: language === 'en' ? 'After you contact them' : 'Después de contactarlos' })).toBeNull()
    const button = screen.getByRole('button', { name: language === 'en' ? 'Log a contact attempt' : 'Registrar un intento de contacto' })
    expect(button).toHaveClass('secondary')
    expect(document.querySelector('.send-option-script')).not.toHaveAttribute('open')
    expect(within(screen.getByRole('article', { name: 'Arkansas Department of Health' })).queryByText(/General utility contact|Contacto general de la empresa/)).toBeNull()
    await user.click(button)
    expect(screen.queryByRole('region', { name: language === 'en' ? 'After you contact them' : 'Después de contactarlos' })).toBeNull()
    expect(document.querySelector('.send-confirm')).toBeNull()
    expect(screen.getByRole('dialog', { name: language === 'en' ? 'Log a contact attempt' : 'Registrar un intento de contacto' })).toBeVisible()
  })
  it('lets a resident log an unreachable attempt with their own follow-up date', async () => {
    const record = vi.fn(), user = userEvent.setup()
    render(<SendOptions draft={base()} language="en" sample={false} blocked={false} copy={async () => true} record={record} />)
    await user.click(screen.getByRole('button', { name: 'Log a contact attempt' }))
    const form = within(screen.getByRole('dialog', { name: 'Log a contact attempt' }))
    expect(form.getByLabelText('How did you try?')).toBeVisible()
    expect(form.getByLabelText('When should you follow up?')).toHaveValue(addBusinessDays(localDate(), 5))
    await user.click(form.getByRole('button', { name: 'Couldn’t reach them' }))
    expect(record.mock.calls[0][0].outcomes.at(-1)).toMatchObject({ kind: 'unreachable' })
  })
  it('keeps a resident-entered follow-up date and what they were told', () => {
    const patch = recordOutcome(base(), 'called', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-11-10', note: 'Crew Thursday', followUpOn: '2026-11-13' })
    expect(patch.followUpOn).toBe('2026-11-13')
    expect(patch.outcomes!.at(-1)).toMatchObject({ note: 'Crew Thursday' })
    expect(recordOutcome(base(), 'called', 'provider', 'X', { on: '2026-11-10', followUpOn: '' }).followUpOn).toBeUndefined()
    expect(recordOutcome(base(), 'called', 'provider', 'X', { on: '2026-11-10' }).followUpOn).toBe('2026-11-17')
  })
})

const asRequest = (draft: HelpDraft): HelpRequest => ({ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' })

describe('Progress stages', () => {
  it('only reports what the resident recorded, with the same four labels every time', () => {
    const states = (d: HelpDraft, today?: string) => requestStages(asRequest(d), 'en', today).map(s => s.state)
    const labels = (d: HelpDraft) => requestStages(asRequest(d), 'en').map(s => s.label)
    expect(states(base())).toEqual(['current', 'todo', 'todo', 'todo'])
    expect(states(base({ flowStep: 'review' }))).toEqual(['done', 'current', 'todo', 'todo'])
    const called = { ...base(), ...recordOutcome(base(), 'called', 'provider', 'X', { on: '2026-11-10' }) }
    expect(states(called, '2026-11-11')).toEqual(['done', 'done', 'todo', 'todo'])
    expect(requestStages(asRequest(called), 'en', '2026-11-11')[1].detail).toBe('Nov 10 · call')
    expect(states(called, '2026-11-17')).toEqual(['done', 'done', 'due', 'todo'])
    const missed = { ...base(), ...recordOutcome(base(), 'unreachable', 'provider', 'X', { on: '2026-11-10' }) }
    expect(requestStages(asRequest(missed), 'en')[1]).toMatchObject({ state: 'attention', label: 'Contacted' })
    const closed = { ...called, ...recordOutcome(called, 'closed', 'provider', 'X', { on: '2026-11-12' }) }
    expect(requestStages(asRequest(closed), 'en')[3]).toMatchObject({ state: 'done', label: 'Closed', detail: 'Nov 12 · not pursuing' })
    expect(closed.followUpOn).toBeUndefined()
    const reopened = { ...closed, ...recordOutcome(closed, 'reopened', 'provider', 'X') }
    expect(requestStages(asRequest(reopened), 'en')[3].state).toBe('todo')
    for (const d of [base(), called, missed, closed, reopened]) expect(labels(d)).toEqual(['Prepared', 'Contacted', 'Follow up', 'Closed'])
    expect(requestStages(asRequest(called), 'es').map(s => s.label)).toEqual(['Preparada', 'Contactado', 'Seguimiento', 'Cerrada'])
  })
})

describe('History follow-up', () => {
  it('shows the recorded timeline, a suggested follow-up and escalation without claiming delivery', async () => {
    const sent = { ...base({ issue: 'service' }), ...recordOutcome(base(), 'emailed', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-01-05' }) }
    localStorage.setItem(LIVE_LOCAL_HELP_KEY, JSON.stringify([asRequest(sent)]))
    vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null }))
    const resume = vi.fn(), user = userEvent.setup()
    render(<RequestHistory language="en" sample={false} onResume={resume} />)
    // One request opens on the request itself.
    expect(await screen.findByRole('heading', { level: 1, name: 'Low water pressure' })).toBeVisible()
    expect(screen.queryByRole('list', { name: /Needs you/ })).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: /^Follow-up suggested \d+ days ago$/ })).toBeVisible()
    expect(screen.getByText('You emailed them Jan 5. No reply recorded yet.')).toBeVisible()
    expect(screen.getByText('You emailed Fayetteville Waterworks')).toBeVisible()
    expect(screen.queryByText(/FAYETTEVILLE WATERWORKS/)).toBeNull()
    // The page carries one privacy line, not a notice under every block.
    expect(screen.getAllByText(/only what you log here/)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Contact Arkansas Department of Health' }))
    expect(resume).toHaveBeenCalledTimes(1)
    const escalated = resume.mock.calls[0][0] as HelpRequest
    expect(escalated.draft).toMatchObject({ route: 'adh', priorContact: { name: 'FAYETTEVILLE WATERWORKS', on: '2026-01-05' } })
    expect(JSON.parse(localStorage.getItem(LIVE_LOCAL_HELP_KEY)!)).toHaveLength(2)
  })

  it('records a reply note on the request', async () => {
    const sent = { ...base(), ...recordOutcome(base(), 'emailed', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-01-05' }) }
    localStorage.setItem(LIVE_LOCAL_HELP_KEY, JSON.stringify([asRequest(sent)]))
    vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null }))
    const user = userEvent.setup()
    render(<RequestHistory language="es" sample={false} requestId={sent.id} onResume={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Registrar un seguimiento' }))
    await user.selectOptions(screen.getByRole('combobox', { name: '¿Qué pasó?' }), 'emailed')
    await user.type(screen.getByRole('textbox', { name: '¿Qué te dijeron? (opcional)' }), 'Dijeron que vendrán el lunes')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    const saved = JSON.parse(localStorage.getItem(LIVE_LOCAL_HELP_KEY)!)[0] as HelpRequest
    expect(saved.draft.outcomes!.at(-1)).toMatchObject({ kind: 'emailed', note: 'Dijeron que vendrán el lunes' })
    expect(await screen.findByText('Dijeron que vendrán el lunes')).toBeVisible()
  })
})

describe('History after contact', () => {
  it('shows progress, edits what they told you and the follow-up date, and closes without claiming a fix', async () => {
    const sent = { ...base(), ...recordOutcome(base(), 'called', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-11-10', reference: '12345' }) }
    localStorage.setItem(LIVE_LOCAL_HELP_KEY, JSON.stringify([asRequest(sent)]))
    vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null }))
    const user = userEvent.setup()
    render(<RequestHistory language="en" sample={false} requestId={sent.id} onResume={() => {}} />)
    expect(await screen.findByRole('list', { name: 'Your progress' })).toHaveTextContent('Contacted')
    await user.click(screen.getByRole('button', { name: 'Update contact details' }))
    fireEvent.change(screen.getByLabelText('Contact date'), { target: { value: '2026-11-02' } })
    await user.type(screen.getByRole('textbox', { name: 'What did they tell you? (optional)' }), 'A crew will investigate')
    await user.clear(screen.getByLabelText('When should you follow up? (optional)'))
    await user.type(screen.getByLabelText('When should you follow up? (optional)'), '2026-11-16')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const saved = () => JSON.parse(localStorage.getItem(LIVE_LOCAL_HELP_KEY)!)[0] as HelpRequest
    await screen.findByText(/A crew will investigate/)
    expect(saved().draft.outcomes![0]).toMatchObject({ on: '2026-11-02', reference: '12345', note: 'A crew will investigate' })
    expect(saved().draft.followUpOn).toBe('2026-11-16')
    await user.click(screen.getByRole('button', { name: 'I’m no longer pursuing this' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeVisible()
    expect(screen.getByRole('list', { name: 'Your progress' })).toHaveTextContent('not pursuing')
    expect(screen.getByRole('list', { name: 'Your progress' })).not.toHaveTextContent('Resolved')
    expect(screen.queryByRole('button', { name: /Log a/ })).toBeNull()
  })
})

describe('Low pressure default request', () => {
  it.each(['en', 'es'] as const)('keeps usual service defaults plus the low-pressure request for mixed observations (%s)', language => {
    const observations = language === 'en' ? ['No water', 'Lower pressure than usual'] : ['No hay agua', 'Menos presión de lo habitual']
    const response = defaultRequests('service', language, observations)
    expect(response).toEqual({ ...defaultRequests('service', language, [observations[0]]), ...defaultRequests('service', language, [observations[1]]) })
  })
  it('asks one plain question instead of restore, update and time estimate', () => {
    const response = defaultRequests('service', 'en', ['Lower pressure than usual'])
    expect(response).toEqual({ fourth: 'Check the cause of the low pressure and share when to expect an update' })
    expect(Object.keys(defaultRequests('service', 'en', ['No water']))).toEqual(['first', 'second'])
    const draft = { ...base({ issue: 'service' }), wording: { report: { first: 'Lower pressure than usual' }, response } }
    const body = generateMessage(draft, 'en').body
    expect(body).toContain('Could you check what’s causing the low pressure and let me know when I should expect an update?')
    expect(body).not.toContain('Could you please:')
    expect(body).not.toContain('Restore service')
    const es = generateMessage({ ...draft, wording: { report: { first: 'Menos presión de lo habitual' }, response: defaultRequests('service', 'es', ['Menos presión de lo habitual']) } }, 'es').body
    expect(es).toContain('¿Podrían revisar qué causa la baja presión')
  })
})
