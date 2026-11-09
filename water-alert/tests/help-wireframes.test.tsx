import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { GuidedHelp } from '../src/GuidedHelp'
import { blankRequest, generateMessage } from '../src/help-requests'
import { samplePlaces } from '../src/sample'
import { savePreferences, defaults } from '../src/storage'
afterEach(() => { cleanup(); localStorage.clear() })
/** Locations live on step 5 ("Where did you observe it?"), always visible. */
function expectWhere() {
  expect(screen.getByText('Step 5 of 8')).toBeVisible()
  expect(screen.getByRole('heading', { level: 1, name: 'Where did you observe it?' })).toBeVisible()
  expect(document.querySelector('details.request-optional')).toBeNull()
}
/** From step 2, give a minimal report on step 3 so Continue is enabled, then advance through dates to step 5. */
function continueToWhere() {
  expect(screen.getByText('Step 2 of 8')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByText('Step 3 of 8')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Describe what happened (optional if selected before)'), { target: { value: 'Resident observation' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByText('Step 4 of 8')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectWhere()
}
/** Every step is one card: title row at the top, the question in the body, the primary action at the bottom. */
function expectOneCard(title: string) {
  const cards = [...document.querySelectorAll('.request-card')]
  expect(cards).toHaveLength(1)
  expect(cards[0]).toHaveAttribute('aria-label', title)
  expect(cards[0].querySelector(':scope > .request-title-row h1')).toHaveTextContent(title)
  expect(cards[0].querySelector(':scope > .request-card-body')).not.toBeNull()
  const action = cards[0].querySelector(':scope > .request-card-action')
  expect(action?.querySelector('button.primary')).not.toBeNull()
  expect(cards[0].querySelector('.request-title-row button.primary')).toBeNull()
  expect(document.querySelector('.request-split, .request-panel')).toBeNull()
}
test('shared composition is one bounded card per step, no legacy area field, and a unified email surface', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  expect((await screen.findByRole('heading', { level: 1 })).closest('.request-step-layout')).not.toBeNull()
  expectOneCard('What do you need help with?')
  fireEvent.click(screen.getByRole('button', { name: 'Current advisory' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('What did you notice?')
  expect(screen.queryByLabelText('Affected area you know about (optional)')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Add supporting material (optional)' })).toBeVisible()
  const attachmentButton = screen.getByRole('button', { name: 'Add a photo or document' })
  expect(document.querySelector('.request-card-body')?.contains(attachmentButton)).toBe(true)
  expect(screen.queryByText('File types and limits')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'My usual water use is affected' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('Tell us more')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('When did it happen?')
  expect(screen.queryByLabelText('Affected area you know about (optional)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('Where did you observe it?')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectOneCard('What response would help?')
  fireEvent.click(screen.getByRole('button', { name: 'Review email' }))
  expectOneCard('Review your email')
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
test('observation step combines issue choices and attachments; details step stretches full-width fields', () => {
  const place = samplePlaces[0]
  const draft = { ...blankRequest(place), issue: 'service' as const, flowStep: 'experience' as const, locations: ['Oak Street', 'Pine Street'], wording: { report: { first: 'No water' }, response: {} }, answers: { frequency: 'Occasional', observationLocation: 'Oak Street', contacted: 'Yes' } }
  const view = renderStep(draft)
  const experience = document.querySelector('.request-screen-experience')!
  expect(experience).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'No water' })).toBeChecked()
  expect(experience.contains(screen.getByRole('heading', { name: 'Add supporting material (optional)' }))).toBe(true)
  expect(experience.querySelector('.request-extras')).toBeTruthy()
  expect(screen.queryByLabelText(/Describe what happened/)).not.toBeInTheDocument()
  expect(screen.queryByLabelText('How often does it happen? (optional)')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  expect(experience.querySelector('.request-safety, .request-experience-provider')).toBeNull()
  view.unmount()
  renderStep({ ...draft, flowStep: 'details' })
  const details = document.querySelector('.request-screen-details')!
  const description = screen.getByLabelText('Describe what happened (optional if selected before)')
  expect(details.contains(description)).toBe(true)
  expect(description).toHaveAttribute('rows', '4')
  const frequency = screen.getByLabelText('How often does it happen? (optional)')
  expect(details.contains(frequency)).toBe(true)
  expect(frequency.closest('.request-question-grid')).toHaveClass('request-frequency-grid')
  expect(screen.queryByLabelText('Which locations, if different from those selected? (optional)')).not.toBeInTheDocument()
  expect(screen.queryByText('Prior provider contact (optional)')).not.toBeInTheDocument()
  expect(details.querySelector('.request-safety, .request-experience-provider')).toBeNull()
  expect(details.querySelector('.request-extras')).toBeNull()
})
test('billing details remain available without prior-provider questions on the details step', () => {
  const place = samplePlaces[0]
  renderStep({ ...blankRequest(place), issue: 'billing' as const, flowStep: 'details' as const })
  expect(screen.getByLabelText('What kind of bill problem?')).toBeVisible()
  expect(screen.queryByText('Prior provider contact (optional)')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('What have you already tried? (optional)')).not.toBeInTheDocument()
})
test('saved supplier suggestions are explicit choices, never selected locations or addresses', async () => {
  savePreferences('sample', { ...defaults(), watches: [samplePlaces[0].id] })
  render(<RequestWorkspace place={samplePlaces[0]} places={samplePlaces} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  continueToWhere()
  expect(screen.queryByRole('button', { name: /Remove location/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('option', { name: `${samplePlaces[0].name} ${samplePlaces[0].county}` }))
  expect(screen.getByRole('button', { name: `Remove location: ${samplePlaces[0].name}` })).toBeVisible()
})
test('confirmed multiple locations enter prose and subject without implying a supplier boundary', () => {
  const draft = { ...blankRequest(samplePlaces[0]), locations: ['Oak Street', 'Community centre'], description: 'Pressure dropped' }
  const message = generateMessage(draft, 'en')
  expect(message.body).toContain('Oak Street and Community centre')
  expect(message.subject).toContain('Sample Creek Water')
  expect(message.body).not.toContain('[LOCATION]')
})
test('custom requested wording is preserved instead of rewritten by a partial verb match', () => {
  const draft = { ...blankRequest(samplePlaces[0]), answers: { response: 'Explainable billing records would help me' } }
  expect(generateMessage(draft, 'en').body).toContain('Explainable billing records would help me.')
  expect(generateMessage(draft, 'en').body).not.toContain('Please explainable')
})
test('multiple locations survive back and reload, and removed locations stay removed', async () => {
  const props = { place: samplePlaces[0], places: samplePlaces, sample: true, language: 'en' as const, onBack() {}, onHistory() {} }
  const view = render(<RequestWorkspace {...props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  continueToWhere()
  for (const name of ['Oak Street', 'Community centre']) {
    fireEvent.change(screen.getByLabelText('Enter any affected location in Arkansas'), { target: { value: name } })
    fireEvent.keyDown(screen.getByLabelText('Enter any affected location in Arkansas'), { key: 'Enter' })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Remove location: Oak Street' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('Step 4 of 8')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectWhere()
  expect(screen.queryByRole('button', { name: 'Remove location: Oak Street' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove location: Community centre' })).toBeVisible()
  await waitFor(() => expect(screen.getByText('Saved on this device')).toBeVisible())
  view.unmount()
  render(<RequestWorkspace {...props} />)
  expect(await screen.findByText('Step 5 of 8')).toBeVisible()
  expectWhere()
  expect(screen.getByRole('button', { name: 'Remove location: Community centre' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Remove location: Oak Street' })).not.toBeInTheDocument()
})
test('details, timing and where offer manual answers without preselection and keep the primary action at the bottom of the card', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Water-quality concern' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  // Confirmed wording does not preselect frequency or description on the next card.
  fireEvent.click(screen.getByRole('checkbox', { name: 'An unusual color' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByLabelText('How often does it happen? (optional)')).toHaveValue('')
  expect(screen.getByLabelText('Describe what happened (optional if selected before)')).toHaveValue('')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByLabelText('When did it end? (optional)')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('When did it end? (optional)')).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expectWhere()
  const input = screen.getByLabelText('Enter any affected location in Arkansas')
  expect(screen.getByText(/Enter any Arkansas location: town, neighborhood, street, business, school, or home/)).toBeVisible()
  expect(screen.queryByRole('button', { name: /Remove location/ })).not.toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'Pine Bluff apartment complex' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add this location' }))
  expect(screen.getByRole('button', { name: 'Remove location: Pine Bluff apartment complex' })).toBeVisible()
  const primary = screen.getByRole('button', { name: 'Continue' })
  expect(primary.closest('.request-card-action')).not.toBeNull()
  expect(primary.closest('.request-title-row')).toBeNull()
})
test('can search Census for an Arkansas address and choose the returned match', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => Response.json({ addresses: ['123 MAIN ST, LITTLE ROCK, AR, 72201'] })
  try {
    render(<RequestWorkspace place={samplePlaces[0]} places={samplePlaces} sample language="en" onBack={() => {}} onHistory={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    continueToWhere()
    expect(screen.getByText(/your text is sent to the U\.S\. Census Bureau/i)).toBeVisible()
    expect(screen.getByText(/Avoid including private addresses in the search/i)).toBeVisible()
    expect(screen.queryByText(/WAVE does not save the search/i)).not.toBeInTheDocument()
    const input = screen.getByLabelText('Enter any affected location in Arkansas')
    fireEvent.change(input, { target: { value: '123 Main St, Little Rock' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find matching Arkansas addresses' }))
    fireEvent.click(await screen.findByRole('option', { name: /123 MAIN ST, LITTLE ROCK, AR, 72201/ }))
    expect(screen.getByRole('button', { name: 'Remove location: 123 MAIN ST, LITTLE ROCK, AR, 72201' })).toBeVisible()
  } finally { globalThis.fetch = previousFetch }
})
