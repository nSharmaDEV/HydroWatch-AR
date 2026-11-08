import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addBusinessDays, followUpState, recordOutcome } from '../src/help-outcomes'
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
    expect(generateMessage(next, 'en').body).toContain('(reference A7), and it has not been resolved.')
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
    await user.type(prompt.getByRole('textbox'), 'REF-9')
    await user.click(prompt.getByRole('button', { name: language === 'en' ? 'Yes, I talked to them' : 'Sí, hablé con ellos' }))
    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0][0].outcomes[0]).toMatchObject({ kind: 'called', route: 'provider', reference: 'REF-9' })
    expect(record.mock.calls[0][0].followUpOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.getByRole('status')).toHaveTextContent(language === 'en' ? /History will show a follow-up reminder/ : /Historial mostrará un recordatorio/)
  })

  it('records nothing for Not yet and never prompts in samples', async () => {
    const record = vi.fn(), user = userEvent.setup()
    const { unmount } = render(<SendOptions draft={base()} language="en" sample={false} blocked={false} copy={async () => true} record={record} />)
    await user.click(screen.getByRole('button', { name: 'Sent it another way? Record it' }))
    await user.click(screen.getByRole('button', { name: 'Not yet' }))
    expect(record).not.toHaveBeenCalled()
    unmount()
    render(<SendOptions draft={base()} language="en" sample blocked={false} copy={async () => true} record={record} />)
    expect(screen.queryByRole('button', { name: 'Sent it another way? Record it' })).toBeNull()
  })
})

describe('History follow-up', () => {
  it('shows the recorded timeline, a due reminder and escalation without claiming delivery', async () => {
    const sent = { ...base({ issue: 'service' }), ...recordOutcome(base(), 'emailed', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-01-05' }) }
    const record: HelpRequest = { id: sent.id, owner: 'device', draft: sent, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }
    localStorage.setItem(LIVE_LOCAL_HELP_KEY, JSON.stringify([record]))
    vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null }))
    const resume = vi.fn(), user = userEvent.setup()
    render(<RequestHistory language="en" sample={false} onResume={resume} />)
    const row = await screen.findByRole('listitem')
    expect(row).toHaveTextContent('Follow-up due')
    expect(row).not.toHaveTextContent('Draft')
    expect(screen.getByRole('heading', { name: /Saved drafts · 0/ })).toBeVisible()
    await user.click(within(row).getByRole('button', { name: 'Low water pressure' }))
    expect(screen.getByRole('heading', { name: 'What you recorded' })).toBeVisible()
    expect(screen.getByText(/WAVE cannot confirm delivery, calls, replies or resolution/)).toBeVisible()
    expect(screen.getByText(/You emailed FAYETTEVILLE WATERWORKS/)).toBeVisible()
    expect(screen.getByRole('note')).toHaveTextContent('No reply recorded since')
    await user.click(screen.getByRole('button', { name: 'Contact Arkansas Department of Health' }))
    expect(resume).toHaveBeenCalledTimes(1)
    const escalated = resume.mock.calls[0][0] as HelpRequest
    expect(escalated.draft).toMatchObject({ route: 'adh', priorContact: { name: 'FAYETTEVILLE WATERWORKS', on: '2026-01-05' } })
    expect(JSON.parse(localStorage.getItem(LIVE_LOCAL_HELP_KEY)!)).toHaveLength(2)
  })

  it('records a reply note on the request', async () => {
    const sent = { ...base(), ...recordOutcome(base(), 'emailed', 'provider', 'FAYETTEVILLE WATERWORKS', { on: '2026-01-05' }) }
    localStorage.setItem(LIVE_LOCAL_HELP_KEY, JSON.stringify([{ id: sent.id, owner: 'device', draft: sent, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
    vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null }))
    const user = userEvent.setup()
    render(<RequestHistory language="es" sample={false} requestId={sent.id} onResume={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Registrar una respuesta' }))
    await user.type(screen.getByRole('textbox', { name: 'Nota (opcional)' }), 'Dijeron que vendrán el lunes')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    const saved = JSON.parse(localStorage.getItem(LIVE_LOCAL_HELP_KEY)!)[0] as HelpRequest
    expect(saved.draft.outcomes!.at(-1)).toMatchObject({ kind: 'reply', note: 'Dijeron que vendrán el lunes' })
    expect(await screen.findByText(/Respuesta recibida de FAYETTEVILLE WATERWORKS/)).toBeVisible()
  })
})
