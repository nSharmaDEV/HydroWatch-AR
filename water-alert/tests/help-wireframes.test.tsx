import { createRef, useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { GuidedHelp } from '../src/GuidedHelp'
import { RequestLocations } from '../src/RequestLocations'
import { blankRequest, generateMessage } from '../src/help-requests'
import { samplePlaces } from '../src/sample'
import { savePreferences, defaults } from '../src/storage'
afterEach(() => { cleanup(); localStorage.clear() })
function Locations() {
  const [draft, setDraft] = useState(() => blankRequest(samplePlaces[0]))
  return <RequestLocations draft={draft} places={samplePlaces} sample es={false} edit={patch => setDraft(d => ({ ...d, ...patch }))} />
}
/** Screen 2 ("When and where") holds a plain manual address field; nothing is preselected or looked up. */
function expectWhere() {
  expect(screen.getByText('Step 2 of 4 · When, Where, + Action')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1, name: 'When, Where, + Action' })).toBeVisible()
  expect(document.querySelector('details.request-optional')).toBeNull()
}
/** From screen 1, give a minimal report so Continue is enabled, then advance to screen 2. */
function continueToWhere() {
  expect(screen.getByText('Step 1 of 4 · What’s wrong?')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Anything else? (optional)'), { target: { value: 'Resident observation' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectWhere()
}
/** Every step is one card: title row at the top, the question in the body, the primary action at the bottom. */
function expectOneCard(title: string, primary = true) {
  const cards = [...document.querySelectorAll('.request-card')]
  expect(cards).toHaveLength(1)
  expect(cards[0]).toHaveAttribute('aria-label', title)
  expect(cards[0].querySelector(':scope > .request-title-row h1')).toHaveTextContent(title)
  expect(cards[0].querySelector(':scope > .request-card-body')).not.toBeNull()
  const action = cards[0].querySelector(':scope > .request-card-action')
   if (primary) expect(action?.querySelector('button.primary')).not.toBeNull()
   else expect(action).toBeNull()
  expect(cards[0].querySelector('.request-title-row button.primary')).toBeNull()
  expect(document.querySelector('.request-split, .request-panel')).toBeNull()
}
test('shared composition is one bounded card per step, no legacy area field, and a unified email surface', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  expect((await screen.findByRole('heading', { level: 1 })).closest('.request-step-layout')).not.toBeNull()
  expectOneCard('What’s wrong?')
  fireEvent.click(screen.getByRole('button', { name: 'Current advisory' }))
  expect(screen.queryByLabelText('Affected area you know about (optional)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'My usual water use is affected' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('When, Where, + Action')
  expect(screen.queryByLabelText('Affected area you know about (optional)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('Your details')
  const attachmentButton = screen.getByRole('button', { name: 'Add a photo or document' })
  expect(document.querySelector('.request-card-body')?.contains(attachmentButton)).toBe(true)
  expect(screen.queryByText('File types and limits')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Write my email' }))
  // Sample send screen: the bottom action is a secondary "Copy email", never a primary send.
  expectOneCard('Review and send', false)
  expect(document.querySelector('.request-card-action button.primary')).toBeNull()
  expect(screen.getByRole('button', { name: 'Copy email' }).closest('.send-options')).not.toBeNull()
  const composer = document.querySelector('.request-composer')!
  expect(composer).not.toBeNull()
  expect(composer.contains(screen.getByLabelText('Subject'))).toBe(true)
  expect(composer.contains(screen.getByLabelText('Message'))).toBe(true)
  expect(screen.queryByRole('region', { name: 'Information provided' })).not.toBeInTheDocument()
  expect(screen.queryByRole('table', { name: 'What you provided' })).not.toBeInTheDocument()
  expect(composer.querySelector('input[type=file]')).toBeNull()
})
const renderStep = (draft: Parameters<typeof GuidedHelp>[0]['draft']) => render(<GuidedHelp
  draft={draft} place={draft.place} language="en" sample={false} deviceOnly delivery={false} sending={false} saveFailed={false}
  heading={createRef<HTMLHeadingElement>()}
  extras={<section className="request-extras"><button>Add a photo or document</button></section>}
  edit={() => {}} changeFacts={() => {}} go={() => {}} send={() => {}} regenerate={() => {}}
/>)
test('observation step holds issue choices and description; details step holds address, account, dates and frequency', () => {
  const place = samplePlaces[0]
  const draft = { ...blankRequest(place), issue: 'service' as const, flowStep: 'experience' as const, locations: ['Oak Street', 'Pine Street'], wording: { report: { first: 'No water' }, response: {} }, answers: { frequency: 'Occasional', observationLocation: 'Oak Street', contacted: 'Yes' } }
  const view = renderStep(draft)
  // A legacy "experience" draft resumes on screen 1.
  const choose = document.querySelector('.request-screen-choose')!
  expect(choose).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'No water' })).toBeChecked()
  expect(choose.contains(screen.getByLabelText('Anything else? (optional)'))).toBe(true)
  // Attachments are offered on "What should they do?", not here.
  expect(choose.querySelector('.request-extras')).toBeNull()
  expect(screen.queryByLabelText('How often does it happen? (optional)')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  expect(choose.querySelector('.request-safety, .request-experience-provider')).toBeNull()
  view.unmount()
  const details = renderStep({ ...draft, flowStep: 'details' })
  const screenDetails = document.querySelector('.request-screen-details')!
  expect(screenDetails.contains(screen.getByLabelText('Address where this happened'))).toBe(true)
  expect(screen.getByLabelText('Address where this happened')).toHaveValue('Oak Street')
  expect(screen.getByText('Also saved: Pine Street')).toBeVisible()
  expect(screen.getByLabelText('Account number (optional)')).toHaveValue('')
  expect(screen.getByLabelText('When did it begin? (optional)')).toHaveAttribute('type', 'date')
  const frequency = screen.getByLabelText('How often does it happen? (optional)')
  expect(screenDetails.contains(frequency)).toBe(true)
  expect(frequency).toHaveValue('Occasional')
  expect(frequency.closest('.request-question-grid')).toHaveClass('request-frequency-grid')
  expect(screen.queryByLabelText(/Anything else\? \(optional\)/)).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Which locations, if different from those selected? (optional)')).not.toBeInTheDocument()
  expect(screen.queryByText('Prior provider contact (optional)')).not.toBeInTheDocument()
  expect(screenDetails.querySelector('.request-safety, .request-experience-provider')).toBeNull()
  expect(screenDetails.querySelector('.request-extras')).toBeNull()
  details.unmount()
  // Name, reply contact, earlier attempts and attachments live on the response screen.
  renderStep({ ...draft, flowStep: 'response' })
  const response = document.querySelector('.request-screen-response')!
  for (const label of ['Anything else to ask? (optional)', 'What have you already tried? (optional)', 'Your name (optional)', 'How can they reach you? (optional)']) expect(response.contains(screen.getByLabelText(label))).toBe(true)
  expect(response.querySelector('.request-extras')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Write my email' })).toBeEnabled()
})
test('billing details remain available without prior-provider questions on the details step', () => {
  const place = samplePlaces[0]
  renderStep({ ...blankRequest(place), issue: 'billing' as const, flowStep: 'details' as const })
  expect(screen.getByLabelText('Which bill? (optional)')).toBeVisible()
  expect(screen.getByLabelText('Amount, if known (optional)')).toBeVisible()
  expect(screen.getByLabelText('Account number (optional)')).toBeVisible()
  expect(screen.queryByLabelText('When did it begin? (optional)')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('How often does it happen? (optional)')).not.toBeInTheDocument()
  expect(screen.queryByText('Prior provider contact (optional)')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('What have you already tried? (optional)')).not.toBeInTheDocument()
})
test('saved supplier suggestions are explicit choices, never selected locations or addresses', async () => {
  savePreferences('sample', { ...defaults(), watches: [samplePlaces[0].id] })
  const view = render(<RequestWorkspace place={samplePlaces[0]} places={samplePlaces} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  await screen.findByRole('button', { name: 'Continue' })
  continueToWhere()
  // The flow's address field starts empty: the followed supplier is never entered as an address.
  expect(screen.getByLabelText('Address where this happened')).toHaveValue('')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('option', { name: new RegExp(samplePlaces[0].name) })).not.toBeInTheDocument()
  view.unmount()
  // The location picker still offers saved suppliers only as explicit suggestions.
  let locations: string[] = []
  render(<RequestLocations draft={blankRequest(samplePlaces[0])} places={samplePlaces} sample es={false} edit={patch => { locations = patch.locations ?? locations }} />)
  expect(screen.queryByRole('button', { name: /Remove location/ })).not.toBeInTheDocument()
  expect(locations).toEqual([])
  fireEvent.click(screen.getByRole('option', { name: `${samplePlaces[0].name} ${samplePlaces[0].county}` }))
  expect(locations).toEqual([samplePlaces[0].name])
})
test('confirmed multiple locations enter prose and subject without implying a supplier boundary', () => {
  const draft = { ...blankRequest(samplePlaces[0]), locations: ['Oak Street', 'Community centre'], description: 'Pressure dropped' }
  const message = generateMessage(draft, 'en')
  expect(message.body).toContain('I’m a Sample Creek Water customer at Oak Street.')
  expect(message.body).toContain('I also experienced this at Community centre.')
  expect(message.subject).toContain('Oak Street')
  expect(message.body).not.toMatch(/\[LOCATION\]|service area|boundary/)
})
test('custom requested wording is preserved instead of rewritten by a partial verb match', () => {
  const draft = { ...blankRequest(samplePlaces[0]), answers: { response: 'Explainable billing records would help me' } }
  expect(generateMessage(draft, 'en').body).toContain('Could you please:\n1. Explainable billing records would help me')
  expect(generateMessage(draft, 'en').body).not.toMatch(/Please explainable|1\. Explain the/)
})
test('a saved address survives back and reload, and a removed address stays removed', async () => {
  const props = { place: samplePlaces[0], places: samplePlaces, sample: true, language: 'en' as const, onBack() {}, onHistory() {} }
  const view = render(<RequestWorkspace {...props} />)
  await screen.findByRole('button', { name: 'Continue' })
  continueToWhere()
  const address = () => screen.getByLabelText('Address where this happened')
  fireEvent.change(address(), { target: { value: 'Oak Street' } })
  fireEvent.change(address(), { target: { value: '' } })
  fireEvent.change(address(), { target: { value: 'Community centre' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 1 of 4 · What’s wrong?')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectWhere()
  expect(address()).toHaveValue('Community centre')
  expect(screen.queryByText(/Oak Street/)).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Saved on this device')).toBeVisible())
  view.unmount()
  render(<RequestWorkspace {...props} />)
  expect(await screen.findByText('Step 2 of 4 · When, Where, + Action')).toBeVisible()
  expectWhere()
  expect(address()).toHaveValue('Community centre')
  expect(screen.queryByText(/Oak Street/)).not.toBeInTheDocument()
})
test('details, timing and where offer manual answers without preselection and keep the primary action at the bottom of the card', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Water-quality concern' }))
  expect(screen.getByLabelText('Anything else? (optional)')).toHaveValue('')
  expect(screen.getByRole('checkbox', { name: 'An unusual color' })).not.toBeChecked()
  // Confirmed wording does not preselect frequency or description on the next card.
  fireEvent.click(screen.getByRole('checkbox', { name: 'An unusual color' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectWhere()
  expect(screen.getByLabelText('How often does it happen? (optional)')).toHaveValue('')
  expect(screen.getByLabelText('Address where this happened')).toHaveValue('')
  expect(screen.getByLabelText('Account number (optional)')).toHaveValue('')
  expect(screen.getByLabelText('When did it end? (optional)')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('When did it end? (optional)')).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Address where this happened'), { target: { value: 'Pine Bluff apartment complex' } })
  expect(screen.getByLabelText('Address where this happened')).toHaveValue('Pine Bluff apartment complex')
  const primary = screen.getByRole('button', { name: 'Continue' })
  expect(primary.closest('.request-card-action')).not.toBeNull()
  expect(primary.closest('.request-title-row')).toBeNull()
  // Quality pre-ticks only its first usual request.
  expect(screen.getByRole('checkbox', { name: 'Investigate the reported concern' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Clarify applicable water-use instructions' })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Share an update' })).not.toBeChecked()
  fireEvent.click(primary)
  expect(screen.getByRole('button', { name: 'Write my email' }).closest('.request-card-action')).not.toBeNull()
})
test('the flow address field never contacts Census; the location picker searches only on request', async () => {
  const previousFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = async (input: RequestInfo | URL) => { calls.push(String(input)); return Response.json({ addresses: ['123 MAIN ST, LITTLE ROCK, AR, 72201'] }) }
  try {
    const view = render(<RequestWorkspace place={samplePlaces[0]} places={samplePlaces} sample language="en" onBack={() => {}} onHistory={() => {}} />)
    await screen.findByRole('button', { name: 'Continue' })
    continueToWhere()
    fireEvent.change(screen.getByLabelText('Address where this happened'), { target: { value: '123 Main St, Little Rock' } })
    expect(calls.filter(url => url.includes('geocode'))).toEqual([])
    view.unmount()
    render(<Locations />)
    expect(screen.getByText(/your text is sent to the U\.S\. Census Bureau/i)).toBeVisible()
    expect(screen.getByText(/Avoid including private addresses in the search/i)).toBeVisible()
    expect(screen.queryByText(/WAVE does not save the search/i)).not.toBeInTheDocument()
    const input = screen.getByLabelText('Enter any affected location in Arkansas')
    fireEvent.change(input, { target: { value: '123 Main St, Little Rock' } })
    expect(calls.filter(url => url.includes('geocode'))).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Find matching Arkansas addresses' }))
    expect(calls.filter(url => url.includes('geocode'))).toHaveLength(1)
    fireEvent.click(await screen.findByRole('option', { name: /123 MAIN ST, LITTLE ROCK, AR, 72201/ }))
    expect(screen.getByRole('button', { name: 'Remove location: 123 MAIN ST, LITTLE ROCK, AR, 72201' })).toBeVisible()
  } finally { globalThis.fetch = previousFetch }
})
