import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { GuidedHelp } from '../src/GuidedHelp'
import { SendOptions } from '../src/SendOptions'
import { blankRequest, type HelpDraft } from '../src/help-requests'
import { callScript } from '../src/send-options'
import { samplePlaces } from '../src/sample'
import { RequestHistory } from '../src/RequestHistory'
import { LIVE_LOCAL_HELP_KEY } from '../src/help-client'
import { recordOutcome } from '../src/help-outcomes'
import { PLACE_CATALOG } from '../src/place-catalog'
import { emailOutput } from '../src/help-outputs'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })
const base = (): HelpDraft => ({ ...blankRequest(samplePlaces[0]), issue: 'service', description: 'Pressure drops each evening.' })
function step(flowStep: HelpDraft['flowStep'], patch: Partial<HelpDraft> = {}, language: 'en' | 'es' = 'en') {
  const edit = vi.fn()
  render(<GuidedHelp draft={{ ...base(), flowStep, ...patch }} place={samplePlaces[0]} language={language} sample deviceOnly delivery={false} sending={false} saveFailed={false} heading={createRef()} extras={null} onHistory={() => {}} edit={edit} changeFacts={() => {}} go={() => {}} send={() => {}} regenerate={() => {}} />)
  return edit
}
test('starts directly with issue choices without an explanatory subheading', () => {
  step('choose')
  expect(screen.queryByText(/Prepare a message, contact the office yourself, then record/)).toBeNull()
  expect(screen.getByRole('radiogroup', { name: 'Issue type' })).toBeVisible()
})
test('offers separate optional email and US phone fields while retaining legacy contact', () => {
  const edit = step('response', { replyContact: 'Call after 5 at 555-0100' })
  expect(screen.getByDisplayValue('Call after 5 at 555-0100')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Email (optional)'), { target: { value: 'resident@example.com' } })
  expect(edit).toHaveBeenCalledWith({ replyEmail: 'resident@example.com' })
  fireEvent.change(screen.getByLabelText('US phone number (optional)'), { target: { value: '5015550123' } })
  expect(edit).toHaveBeenCalledWith({ replyPhone: '(501) 555-0123' })
})
test('generated email includes new and previously saved contact details', () => {
  const body = emailOutput({ ...base(), replyContact: 'Call after 5', replyEmail: 'resident@example.com', replyPhone: '(501) 555-0123' }, 'en').body
  expect(body).toContain('Call after 5')
  expect(body).toContain('resident@example.com')
  expect(body).toContain('(501) 555-0123')
})
test('groups email and phone and formats an incomplete US number while typing', () => {
  const edit = step('response')
  const email = screen.getByLabelText('Email (optional)')
  const phone = screen.getByLabelText('US phone number (optional)')
  expect(email.closest('.request-contact-pair')).toBe(phone.closest('.request-contact-pair'))
  expect(email.closest('.request-contact-pair')).not.toBeNull()
  fireEvent.change(phone, { target: { value: '481343695' } })
  expect(edit).toHaveBeenCalledWith({ replyPhone: '(481) 343-695' })
})
test('shows prior contact once in the optional final input screen', () => {
  const edit = step('anything', { answers: { contacted: 'Yes', contactDate: '2026-11-02', contactResponse: 'They opened a ticket.' } })
  fireEvent.click(screen.getByText('Prior provider contact (optional)'))
  expect(screen.getByDisplayValue('2026-11-02')).toBeVisible()
  expect(screen.getByDisplayValue('They opened a ticket.')).toBeVisible()
  fireEvent.change(screen.getByDisplayValue('They opened a ticket.'), { target: { value: 'Ticket 42' } })
  expect(edit).toHaveBeenCalledWith({ answers: { contacted: 'Yes', contactDate: '2026-11-02', contactResponse: 'Ticket 42' } })
})
test('request cards keep saved wording without edit-wording links', () => {
  step('request', { wording: { report: {}, response: { first: 'Restore service' } } })
  expect(screen.queryByRole('button', { name: /Edit wording/ })).toBeNull()
  expect(screen.getByText('Restore service')).toBeVisible()
})
test('additional action details starts as a compact three-line field', () => {
  step('request')
  expect(screen.getByLabelText('Additional action details (optional)')).toHaveAttribute('rows', '3')
})
test('observation details starts as a compact three-line field', () => {
  step('noticed')
  expect(screen.getByLabelText('Anything else? (optional)')).toHaveAttribute('rows', '3')
})
test.each(['en', 'es'] as const)('records the actual contact date and acknowledges no reminder (%s)', language => {
  const record = vi.fn()
  render(<SendOptions draft={base()} language={language} sample={false} blocked={false} copy={async () => true} record={record} />)
  fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Log a contact attempt' : 'Registrar un intento de contacto' }))
  fireEvent.change(screen.getByLabelText(language === 'en' ? 'Contact date' : 'Fecha de contacto'), { target: { value: '2026-11-02' } })
  expect(screen.getByLabelText(language === 'en' ? 'When should you follow up?' : '¿Cuándo debes dar seguimiento?')).toHaveValue('2026-11-09')
  fireEvent.change(screen.getByLabelText(language === 'en' ? 'When should you follow up?' : '¿Cuándo debes dar seguimiento?'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Save' : 'Guardar' }))
  expect(record.mock.calls[0][0].outcomes[0].on).toBe('2026-11-02')
  expect(record.mock.calls[0][0].followUpOn).toBeUndefined()
  expect(screen.getByRole('status')).toHaveTextContent(language === 'en' ? 'No follow-up reminder set.' : 'No se programó un recordatorio.')
})
test('call script includes the bill period and amount being questioned', () => {
  const script = callScript({ ...base(), issue: 'billing', answers: { amount: '$42', billingPeriod: 'October 2026' } }, 'en').join('\n')
  expect(script).toContain('$42')
  expect(script).toContain('October 2026')
})
test('billing next-contact guidance explains jurisdiction rather than promising escalation', () => {
  render(<SendOptions draft={{ ...base(), issue: 'billing' }} language="en" sample={false} blocked={false} copy={async () => true} />)
  expect(screen.getByRole('link', { name: 'PSC complaint guidance' })).toHaveAttribute('href', 'https://apsc.arkansas.gov/filing-a-complaint/')
  expect(screen.getByText(/does not regulate municipal utilities/)).toBeVisible()
})
test('quality contacts are identified as general directory contacts, not a verified complaint desk', () => {
  const place = PLACE_CATALOG.find(p => p.place.name === 'FAYETTEVILLE WATERWORKS')!.place
  render(<SendOptions draft={{ ...base(), place, issue: 'quality', route: 'provider', recipientRoutes: ['provider'] }} language="en" sample={false} blocked={false} copy={async () => true} />)
  expect(screen.getByText('General utility contact')).toBeVisible()
})
test('official form source is visible in the contact sources disclosure', () => {
  render(<SendOptions draft={{ ...base(), route: 'ag', recipientRoutes: ['ag'] }} language="en" sample={false} blocked={false} copy={async () => true} />)
  fireEvent.click(screen.getByRole('button', { name: 'Contact sources' }))
  expect(screen.getAllByRole('link', { name: 'official page' }).some(a => a.getAttribute('href')?.includes('arkansasag.gov'))).toBe(true)
})
test('primary agency contact explains its limits too', () => {
  render(<SendOptions draft={{ ...base(), route: 'adh', recipientRoutes: ['adh'] }} language="en" sample={false} blocked={false} copy={async () => true} />)
  expect(screen.getByText(/not a billing channel/)).toBeVisible()
})
test('an empty contact date visibly prevents recording an attempt', () => {
  const record = vi.fn()
  render(<SendOptions draft={base()} language="en" sample={false} blocked={false} copy={async () => true} record={record} />)
  fireEvent.click(screen.getByRole('button', { name: 'Log a contact attempt' }))
  fireEvent.change(screen.getByLabelText('Contact date'), { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Couldn’t reach them' })).toBeDisabled()
  expect(record).not.toHaveBeenCalled()
})
test.each(['details', 'response'] as const)('omits the added explanatory subheading on %s', flowStep => {
  step(flowStep)
  expect(screen.queryByText(flowStep === 'details' ? /helps the utility locate/ : /Only share contact details/)).toBeNull()
})
test.each(['en', 'es'] as const)('email keeps evidence without section subheadings (%s)', language => {
  const body = emailOutput({ ...base(), facts: undefined, context: 'Dated source evidence retained.' }, language).body
  expect(body).toContain('Dated source evidence retained.')
  expect(body).not.toMatch(/Related records|Registros relacionados|What happened\n|Lo que pasó\n/)
})
test.each(['called', 'unreachable', 'reply'] as const)('History describes %s without claiming sent or hiding the attempt', async kind => {
  const draft = { ...base(), subject: 'Synthetic contact', ...recordOutcome(base(), kind, 'provider', 'Fictional office', { on: '2026-11-02', note: 'Synthetic resident note' }) }
  localStorage.setItem(LIVE_LOCAL_HELP_KEY, JSON.stringify([{ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
  vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null }))
  render(<RequestHistory language="en" sample={false} requestId={draft.id} onResume={() => {}} />)
  expect(await screen.findByRole('heading', { name: 'What happened' })).toBeVisible()
  expect(screen.queryByText(/Sent through WAVE|Sent – waiting for reply/)).toBeNull()
  expect(screen.getByText({ called: 'You called Fictional office', unreachable: 'You couldn’t reach Fictional office', reply: 'You recorded a reply from Fictional office' }[kind])).toBeVisible()
  expect(screen.getByText('Synthetic resident note')).toBeVisible()
})
