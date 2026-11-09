import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { blankRequest, generateMessage } from '../src/help-requests'
import { initialFacts, savedFacts } from '../src/help-flow'
import { updateDraft } from '../src/help-draft'
import { saveRequest } from '../src/help-client'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { ReviewEmail } from '../src/ReviewEmail'
import { readableDate } from '../src/help-format'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { reportEvidence } from '../src/recovery-evidence'

const place = { id: 'sample-review', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
const leisureHills = { ...place, id: LEISURE_HILLS_ID }
const notice = { id: 'synthetic-review', placeId: place.id, name: place.name, county: place.county, agency: 'ADH' as const, kind: 'boil' as const, issued: '2026-10-14', lifted: null, reason: 'power outage', area: 'entire system', url: 'https://example.test/official-notice' }
function example(language: 'en' | 'es' = 'en') {
  const draft = { ...blankRequest(place), answers: { began: '2026-10-09', frequency: 'Occasional' }, wording: { report: { third: language === 'es' ? 'El servicio se interrumpe repetidamente' : 'Service keeps stopping' }, response: { second: language === 'es' ? 'Compartir una actualización' : 'Share an update', third: language === 'es' ? 'Explicar qué está pasando' : 'Explain what is happening' } }, facts: initialFacts(place, [notice], true, false, language) }
  return { ...draft, facts: savedFacts(draft, false, language) }
}
afterEach(() => { cleanup(); localStorage.clear() })

test('defaults only exact-provider report findings with no listed action into every generated email', () => {
  const evidence = reportEvidence(leisureHills, false)
  const required = evidence.filter(row => row.issue.action.en === 'None listed')
  const requiredIds = required.map(row => row.key)
  expect(requiredIds).toEqual(['2025:2', '2025:3'])

  const facts = initialFacts(leisureHills, [], false, false, 'en')
  expect(facts.filter(f => requiredIds.includes(f.id) && f.included).map(f => f.id)).toEqual(requiredIds)
  expect(facts.filter(f => f.kind === 'historical' && !requiredIds.includes(f.id) && f.included)).toEqual([])

  for (const issue of ['service', 'billing', 'other', 'legal'] as const) {
    const body = generateMessage({ ...blankRequest(leisureHills), issue, facts }, 'en').body
    for (const row of required) expect(body).toContain(row.issue.title.en)
    expect(body).toContain('The document lists no corrective action.')
    expect(body).toContain('This is historical information, not an assessment of current status.')
    expect(body).toContain('https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025#page=2')
    expect(body).not.toMatch(/caused by (the )?(licensing|public education)/i)
  }
})

test('upgrades existing unchecked findings and keeps report context exact-provider-only', () => {
  const facts = initialFacts(leisureHills, [], false, false, 'en').map(f => ({ ...f, included: false }))
  const saved = savedFacts({ ...blankRequest(leisureHills), facts }, false, 'en')
  expect(saved.filter(f => f.included && f.kind === 'historical').map(f => f.id)).toEqual(['2025:2', '2025:3'])

  const unrelated = { ...leisureHills, id: 'ADH:unrelated-system' }
  expect(initialFacts(unrelated, [], false, false, 'en').filter(f => f.included)).toEqual([])
  expect(initialFacts(leisureHills, [], false, true, 'en').filter(f => f.included)).toEqual([])
})

test('localizes required report issue titles and actions in generated Spanish emails', () => {
  const evidence = reportEvidence(leisureHills, false).filter(row => row.issue.action.en === 'None listed')
  const facts = initialFacts(leisureHills, [], false, false, 'es')
  const body = generateMessage({ ...blankRequest(leisureHills), issue: 'other', facts }, 'es').body
  for (const row of evidence) expect(body).toContain(row.issue.title.es)
  expect(body).toContain('El documento no enumera una acción correctiva.')
  expect(body).toContain('Es información histórica, no una evaluación del estado actual.')
})

test('keeps required historical findings checked and unremovable in Review', () => {
  const draft = { ...blankRequest(leisureHills), facts: initialFacts(leisureHills, [], false, false, 'en') }
  render(<ReviewEmail draft={draft} language="en" extras={null} edit={() => {}} changeFacts={() => {}} go={() => {}} regenerate={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /^Records \(2 of \d+ included\)$/ }))
  const includeControls = screen.getAllByRole('checkbox', { name: 'Include in email' })
  expect(includeControls).toHaveLength(2)
  for (const checkbox of includeControls) {
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
  }
  expect(screen.queryByRole('button', { name: 'Remove source record' })).not.toBeInTheDocument()
})

test('published US dates display readably without guessing invalid or partial dates', () => {
  expect(readableDate('10/14/2026', 'en')).toBe('October 14, 2026')
  expect(readableDate('10/14/2026', 'es')).toBe('14 de octubre de 2026')
  expect(readableDate('2/30/2026', 'en')).toBe('2/30/2026')
  expect(readableDate('October 2026', 'en')).toBe('October 2026')
})

test('saved legacy notice prose keeps its dated area context without claiming current status', () => {
  const draft = { ...blankRequest(place), issue: 'service' as const, wording: { report: { third: 'Service keeps stopping' }, response: {} }, facts: [{ id: 'legacy', kind: 'saved' as const, included: true, text: 'I’m writing about an active advisory issued 10/12/2026 for customers along Creek Road.', sources: [{ recordId: 'legacy-source', url: notice.url, label: 'ADH · 2026-10-12 · customers along Creek Road' }] }] }
  const body = generateMessage(draft, 'en').body
  expect(body).toContain('For context, the saved ADH notice dated October 12, 2026 lists “customers along Creek Road” as the affected area.')
  expect(body).toContain('Its current status has not been verified.')
  expect(body).not.toContain('saved notice, not verified as current issued')
})

test('October 9 resident experience and October 14 saved notice stay distinct in natural email', () => {
  const d = example(), message = generateMessage(d, 'en')
  expect(message.subject).toMatch(/intermittent water service/i)
  expect(message.body).toContain('October 9, 2026')
  expect(message.body).toContain('October 14, 2026')
  expect(message.body).toContain('Leisure Hills Mobile Home Park')
  expect(message.body).not.toContain(place.name)
  expect(message.body).toMatch(/whether (that|this) notice relates/)
  expect(message.body).toMatch(/current status (has not been verified|is unverified)/)
  expect(message.body).not.toMatch(/an active advisory|issue is ongoing|caused by|power outage caused/)
  expect(message.body).toContain('I experienced interruptions in my water service occasionally.')
  expect(message.body).toContain(notice.url)
  expect(generateMessage({ ...d, facts: [] }, 'en').body).not.toMatch(/power outage|whether (that|this) notice relates/)
  expect(generateMessage(example('es'), 'es').body).toContain('9 de octubre de 2026')
  expect(generateMessage(example('es'), 'es').body).toContain('Experimenté interrupciones en el servicio de agua ocasionalmente.')
})

test('Review keeps signature, records and files separate from the editable composer', async () => {
  const draft = updateDraft({ ...example(), locations: ['Oak Street'], attachments: [{ id: 'f', name: 'resident-photo.png', type: 'image/png', data: 'AA==' }] }, { flowStep: 'review' }, 'en')
  await saveRequest(true, draft, 0)
  render(<RequestWorkspace place={place} requestId={draft.id} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  const composer = await screen.findByRole('region', { name: 'Your email' })
  expect(screen.getByText('Step 7 of 8')).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Information provided' })).not.toBeInTheDocument()
  expect(screen.getByText('Attachments: resident-photo.png. Copied email text does not include these files.')).toBeVisible()
  const signature = screen.getByRole('region', { name: 'Name / reply contact (optional)' })
  fireEvent.change(within(signature).getByLabelText('Resident name (optional)'), { target: { value: 'Resident Example' } })
  expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain('Resident Example')
  expect(within(composer).queryByLabelText('Resident name (optional)')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^Records \(\d+ of \d+ included\)$/ }))
  const records = screen.getByRole('dialog', { name: 'Records' })
  expect(within(records).getByText('power outage')).toBeVisible()
  expect(within(records).getByText('entire system')).toBeVisible()
  expect(composer.contains(records)).toBe(false)
  fireEvent.click(within(records).getByRole('button', { name: 'Close records' }))
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'My own message.' } })
  // Back walks to the dated step; the manual message survives the answer change.
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 4 of 8')).toBeVisible()
  fireEvent.change(screen.getByLabelText('When did it begin? (optional)'), { target: { value: '2026-10-10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review email' }))
  expect(screen.getByLabelText('Message')).toHaveValue('My own message.')
  expect(screen.getByText('Your answers changed. Update the draft to include them.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Update draft from answers' })).toBeVisible()
})

// The per-answer "What you provided" table was removed; Back reaches each saved answer on its own card.
test('Back from Review reaches response, location, date and details cards with saved values visible', async () => {
  const draft = updateDraft({ ...example(), locations: ['Oak Street'] }, { flowStep: 'review' }, 'en')
  await saveRequest(true, draft, 0)
  render(<RequestWorkspace place={place} requestId={draft.id} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  await screen.findByLabelText('Message')
  expect(screen.queryByRole('table', { name: 'What you provided' })).not.toBeInTheDocument()
  for (const name of ['Edit reported start date', 'Edit affected location', 'Edit requested response', 'Edit reported observations', 'Edit reported issue', 'Edit reported frequency', 'Add affected location', 'Add reported ongoing status']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 6 of 8')).toBeVisible()
  expect(screen.getByLabelText('Additional wording (optional)')).toBeVisible()
  expect(screen.getByRole('checkbox', { name: 'Share an update' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 5 of 8')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Remove location: Oak Street' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 4 of 8')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1, name: 'When did it happen?' })).toBeVisible()
  expect(document.querySelector('details.request-optional')).toBeNull()
  expect(screen.getByLabelText('When did it begin? (optional)')).toHaveValue('2026-10-09')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 3 of 8')).toBeVisible()
  expect(screen.getByLabelText('How often does it happen? (optional)')).toHaveValue('Occasional')
  expect(screen.getByLabelText('Describe what happened (optional if selected before)')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 2 of 8')).toBeVisible()
  expect(screen.getByRole('checkbox', { name: 'Service keeps stopping' })).toBeChecked()
})

test('official information is a concise records table with source wording and extra detail collapsed', async () => {
  const draft = updateDraft({ ...example(), flowStep: 'review' }, {}, 'en')
  await saveRequest(true, draft, 0)
  render(<RequestWorkspace place={place} requestId={draft.id} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: /^Records \(\d+ of \d+ included\)$/ }))
  const info = screen.getByRole('dialog', { name: 'Records' })
  const table = within(info).getByRole('table', { name: /Problems/ })
  expect(within(table).getByText('Agency')).toBeVisible()
  expect(within(table).getByText('October 14, 2026')).toBeVisible()
  expect(within(table).getByText('power outage')).toBeVisible()
  expect(within(table).getByText('entire system')).toBeVisible()
  expect(within(table).getByText(/not verified/i)).toBeVisible()
  expect(within(info).queryByText('View source details')).not.toBeInTheDocument()
  expect(within(info).getByRole('link', { name: /View source/ })).toHaveAttribute('href', notice.url)
  expect(within(info).getByRole('checkbox', { name: /Include in email/ })).toBeChecked()
  fireEvent.click(within(info).getByRole('button', { name: 'Close records' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cited sources' }))
  expect(within(screen.getByRole('dialog', { name: 'Cited sources' })).getByText(/The ADH notice dated/)).toBeVisible()
})

test('email prose turns selected observations and explanation/update into a natural request', () => {
  const draft = { ...example(), locations: ['Oak Street'], wording: { report: { first: 'No water', third: 'Service keeps stopping' }, response: { second: 'Share an update', third: 'Explain what is happening' } }, answers: { began: '2026-10-09', ongoing: 'No', ended: '2026-10-11', frequency: 'At particular times' } }
  const { subject, body } = generateMessage(draft, 'en')
  expect(subject).toContain('Leisure Hills Mobile Home Park')
  expect(body).toContain('Hello Leisure Hills Mobile Home Park team,')
  expect(subject).toContain('water service')
  expect(subject).toContain('Leisure Hills Mobile Home Park')
  expect(body).toContain('I first noticed this on October 9, 2026')
  expect(body).toContain('It ended on October 11, 2026')
  expect(body).toContain('Oak Street')
  expect(body).toContain('At particular times, my water service is interrupted and no water is available.')
  expect(body).toContain('Could you explain what may be contributing to these interruptions and share any available update on next steps?')
  expect(body).toMatch(/For context,[\s\S]*?\[1\][\s\S]*?https:\/\/example\.test\/official-notice/)
  expect(body).not.toMatch(/No water\. I observed this at particular times|Share an update and explain what is happening/)
})

test('Spanish provider greeting addresses its team naturally', () => {
  const draft = { ...example('es'), recipientRoutes: ['provider' as const] }
  expect(generateMessage(draft, 'es').body).toMatch(/^Hola, equipo de Leisure Hills Mobile Home Park,/)
})
