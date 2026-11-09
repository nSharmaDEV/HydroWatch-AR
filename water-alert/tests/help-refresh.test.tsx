import { createRef, useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RequestLocations } from '../src/RequestLocations'
import { GuidedHelp } from '../src/GuidedHelp'
import { ReviewEmail } from '../src/ReviewEmail'
import { blankRequest, generateMessage, type HelpDraft } from '../src/help-requests'
import { initialFacts } from '../src/help-flow'
import { PROVIDER_CONTACTS } from '../src/provider-contacts'

const place = { id: Object.keys(PROVIDER_CONTACTS)[0], name: 'TEST WATER LLC', county: 'Benton', kind: 'system' as const }
const catalog = [place, { ...place, id: 'other', name: 'SECOND WATER' }]
const base = (): HelpDraft => ({ ...blankRequest(place), issue: 'service', wording: { report: { first: 'No water' }, response: {} } })
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

function Locations() {
  const [draft, setDraft] = useState(base)
  return <RequestLocations draft={draft} places={catalog} sample es={false} edit={patch => setDraft(d => ({ ...d, ...patch }))} />
}
function Guide({ initial = base(), sample = true }: { initial?: HelpDraft; sample?: boolean }) {
  const [draft, setDraft] = useState(initial)
  return <GuidedHelp draft={draft} place={draft.place} places={catalog} language="en" sample={sample} deviceOnly delivery={false} sending={false} saveFailed={false} heading={createRef()} extras={null} edit={patch => setDraft(d => ({ ...d, ...patch }))} changeFacts={facts => setDraft(d => ({ ...d, facts }))} go={flowStep => setDraft(d => ({ ...d, flowStep }))} send={() => { throw new Error('Must not send') }} regenerate={() => {}} />
}

test('catalog matches appear while typing and arrows/Enter select without entering raw query', () => {
  render(<Locations />)
  const input = screen.getByRole('combobox', { name: /Enter any affected location/ })
  fireEvent.change(input, { target: { value: 'TEST' } })
  expect(screen.getByRole('option', { name: /TEST WATER LLC/ })).toBeVisible()
  expect(input).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input).toHaveAttribute('aria-activedescendant')
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.getByRole('button', { name: 'Remove location: TEST WATER LLC' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Remove location: TEST' })).toBeNull()
  fireEvent.change(input, { target: { value: 'SECOND' } })
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).toBeNull()
  fireEvent.change(input, { target: { value: 'Community hall' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.getByRole('button', { name: 'Remove location: Community hall' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Remove location: TEST WATER LLC' }))
  expect(screen.queryByRole('button', { name: 'Remove location: TEST WATER LLC' })).toBeNull()
})

test('invalid date ranges show guidance and prevent advancing; ongoing clears the end date without disabling its picker', () => {
  render(<Guide initial={{ ...base(), flowStep: 'timing', answers: { began: '2026-10-14', ongoing: 'No', ended: '2026-10-09' } }} />)
  // A legacy "timing" draft resumes on "When and where".
  expect(screen.getByText('Step 2 of 4 · When, Where, + Action')).toBeVisible()
  // Inline field error on the always-visible "When and where" card.
  expect(screen.getAllByRole('alert').map(a => a.textContent)).toEqual(['The end date must be on or after the start date.'])
  expect(screen.getByRole('heading', { level: 1, name: 'When, Where, + Action' })).toBeVisible()
  expect(document.querySelector('details.request-optional')).toBeNull()
  expect(screen.getByLabelText('When did it end? (optional)')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('When did it end? (optional)'), { target: { value: '2026-10-15' } })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Is it ongoing? (optional)'), { target: { value: 'Yes' } })
  expect(screen.getByLabelText('When did it end? (optional)')).toBeEnabled()
  expect(screen.getByLabelText('When did it end? (optional)')).toHaveValue('')
})

test.each(['quality', 'advisory'] as const)('%s dates validate the first-noticed date against the end on the timing screen', issue => {
  render(<Guide initial={{ ...base(), issue, flowStep: 'timing', answers: { noticed: '2026-10-14', ongoing: 'No', ended: '2026-10-09' } }} />)
  expect(screen.getByText('Step 2 of 4 · When, Where, + Action')).toBeVisible()
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveTextContent(/end date.*start date/i)
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  expect(screen.getByLabelText('When did it end? (optional)')).toHaveAttribute('min', '2026-10-14')
})

test('observation step omits provider contact cards, call line and repeated supplier text', () => {
  const { unmount } = render(<Guide sample={false} initial={{ ...base(), flowStep: 'experience' }} />)
  expect(screen.getByText('Step 1 of 4 · What’s wrong?')).toBeVisible()
  expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  // Contact options remain on Review, not above the issue choices.
  const calls = document.querySelectorAll('a[href^="tel:"]')
  expect(calls).toHaveLength(0)
  expect(document.querySelector('.request-provider')).toBeNull()
  expect(screen.queryByRole('heading', { name: 'Contact water provider' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Emergency\? Call 911/)).not.toBeInTheDocument()
  unmount()
  render(<Guide initial={{ ...base(), flowStep: 'experience' }} />)
  expect(screen.queryByText(/Prefer to call\?/)).not.toBeInTheDocument()
  expect(document.querySelector('a[href^="tel:"]')).toBeNull()
  expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  expect(screen.queryByText(/Emergency\? Call 911/)).not.toBeInTheDocument()
})

test('Review keeps records in a popup without an answers table, source detail or deletion rows', () => {
  const facts = initialFacts(place, [{ id: 'notice', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', issued: '2026-10-14', lifted: null, reason: 'Published problem', area: 'Published area', url: 'https://example.test/notice' }], true, false, 'en')
  const changeFacts = vi.fn()
  render(<ReviewEmail draft={{ ...base(), facts }} language="en" extras={null} edit={() => {}} changeFacts={changeFacts} go={() => {}} regenerate={() => {}} />)
  expect(screen.queryByRole('table', { name: 'What you provided' })).not.toBeInTheDocument()
  expect(screen.queryByRole('row', { name: /First noticed/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add reported start date' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^Records \(\d+ of \d+ included\)$/ }))
  const records = screen.getByRole('dialog', { name: 'Records' })
  expect(within(records).getByText('Published problem')).toBeVisible()
  expect(screen.queryByText('View source details')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove source record' })).not.toBeInTheDocument()
})

test('email does not infer a full day or drop extra requested actions', () => {
  const draft = { ...base(), answers: { frequency: 'Constant' }, wording: { report: { first: 'No water', third: 'Service keeps stopping' }, response: { first: 'Restore service', second: 'Share an update', third: 'Explain what is happening' } } }
  const body = generateMessage(draft, 'en').body
  expect(body).not.toMatch(/throughout the day|during the day/)
  expect(body).toMatch(/constantly/)
  expect(body).toContain('Could you please:\n1. Restore service: investigate the reported service problem and advise on next steps toward restoration\n2. Share any available update on next steps\n3. Explain what may be contributing to these interruptions, including any known cause of the reported service problem')
  expect(generateMessage(base(), 'en').body).not.toMatch(/Could you let me know the appropriate next step\?|Could you please/)
})

test('source prose preserves edits and historical details without inventing interruptions for pressure', () => {
  const facts = initialFacts(place, [{ id: 'notice', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', issued: '2026-10-14', lifted: null, reason: 'Published problem', area: 'Published area', url: 'https://example.test/notice' }], true, false, 'en')
  const body = generateMessage({ ...base(), wording: { report: { first: 'Lower pressure than usual' }, response: {} }, facts: facts.map(f => ({ ...f, text: 'The published record says repairs were completed on October 15, 2026.' })) }, 'en').body
  expect(body).toContain('repairs were completed on October 15, 2026')
  expect(body).not.toContain('interruptions I experienced')
  expect(body).toContain('https://example.test/notice')
  expect(body).toContain('ADH')
  const historical = generateMessage({ ...base(), issue: 'quality', facts: [{ ...facts[0], kind: 'historical', text: 'A 2025 report says the corrective action was completed in June 2025.', record: { ...facts[0].record!, year: '2025' } }] }, 'en').body
  expect(historical).toContain('corrective action was completed in June 2025')
  expect(historical).toMatch(/historical context/)
})

test('already attributed notice prose is not prefixed with a duplicate notice introduction', () => {
  const draft = { ...base(), facts: [{ id: 'notice', included: true, kind: 'active' as const, text: 'The ADH notice dated October 14, 2026 lists a water-main repair.', sources: [{ recordId: 'notice', label: 'ADH notice', url: 'https://example.test/notice' }], record: { agency: 'ADH', date: '2026-10-14', problem: 'water-main repair', area: '', status: '', verified: true } }] }
  expect(generateMessage(draft, 'en').body.match(/ADH notice dated October 14, 2026/g)).toHaveLength(1)
})
