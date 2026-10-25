import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { GuidedHelp } from '../src/GuidedHelp'
import { blankRequest, generateMessage } from '../src/help-requests'
import { samplePlaces } from '../src/sample'
import { savePreferences, defaults } from '../src/storage'
afterEach(() => { cleanup(); localStorage.clear() })
test('shared composition has bounded panels, no legacy area field, and a unified email surface', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
   expect((await screen.findByRole('heading', { level: 1 })).closest('.request-step-layout')).not.toBeNull()
   fireEvent.click(screen.getByRole('button', { name: 'Current advisory' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(document.querySelectorAll('.request-split > .request-panel')).toHaveLength(2)
  expect(screen.queryByLabelText('Affected area you know about (optional)')).not.toBeInTheDocument()
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Add details' })).toBeVisible()
   const attachmentButton = screen.getByRole('button', { name: 'Add a photo or document' })
   expect(document.querySelector('.request-experience-observations')?.contains(attachmentButton)).toBe(true)
   expect(screen.queryByText('File types and limits')).not.toBeInTheDocument()
   fireEvent.click(screen.getByRole('checkbox', { name: 'My usual water use is affected' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  const composer = document.querySelector('.request-composer')!
  expect(composer).not.toBeNull()
  expect(composer.contains(screen.getByLabelText('Subject'))).toBe(true)
  expect(composer.contains(screen.getByLabelText('Message'))).toBe(true)
  expect(screen.getByRole('region', { name: 'Information provided' }).contains(screen.getByRole('button', { name: 'Add a photo or document' }))).toBe(true)
  expect(composer.querySelector('input[type=file]')).toBeNull()
})
test('observation step combines issue choices and attachments and stretches full-width details fields', () => {
  const place = samplePlaces[0]
  const draft = { ...blankRequest(place), issue: 'service' as const, flowStep: 'experience' as const, locations: ['Oak Street', 'Pine Street'], wording: { report: { first: 'No water' }, response: {} }, answers: { frequency: 'Occasional', observationLocation: 'Oak Street', contacted: 'Yes' } }
  render(<GuidedHelp
    draft={draft} place={place} language="en" sample={false} deviceOnly delivery={false} sending={false} saveFailed={false}
    heading={createRef<HTMLHeadingElement>()}
    extras={<section className="request-extras"><button>Add a photo or document</button></section>}
    edit={() => {}} changeFacts={() => {}} go={() => {}} send={() => {}} regenerate={() => {}}
  />)
  const experience = document.querySelector('.request-screen-experience')
  const primary = experience?.querySelector('.request-experience-primary')
  expect(primary).toBeTruthy()
  const observations = primary?.querySelector('.request-experience-observations')
  const details = primary?.querySelector('.request-experience-details')
  expect(primary?.querySelectorAll(':scope > .request-panel')).toHaveLength(2)
  expect(experience?.querySelector('.request-experience-support')).toBeNull()
  expect(observations?.contains(screen.getByRole('heading', { name: 'Choose what you observed' }))).toBe(true)
  expect(observations?.contains(screen.getByRole('heading', { name: 'Add supporting material' }))).toBe(true)
  expect(observations?.querySelector('.request-extras')).toBeTruthy()
  const description = screen.getByLabelText('Describe what happened (optional if selected above)')
  expect(details?.contains(description)).toBe(true)
  expect(description).toHaveAttribute('rows', '4')
  const frequency = screen.getByLabelText('How often does it happen? (optional)')
  expect(details?.contains(frequency)).toBe(true)
  expect(frequency.closest('.request-question-grid')).toHaveClass('request-frequency-grid')
  expect(screen.queryByLabelText('Which locations, if different from those selected? (optional)')).not.toBeInTheDocument()
  expect(screen.queryByText('Prior provider contact (optional)')).not.toBeInTheDocument()
  expect(experience?.querySelector('.request-safety, .request-experience-provider')).toBeNull()
})
test('billing details remain available without prior-provider questions in observation step', () => {
  const place = samplePlaces[0]
  const draft = { ...blankRequest(place), issue: 'billing' as const, flowStep: 'experience' as const }
  render(<GuidedHelp
    draft={draft} place={place} language="en" sample={false} deviceOnly delivery={false} sending={false} saveFailed={false}
    heading={createRef<HTMLHeadingElement>()}
    extras={<section className="request-extras"><button>Add a photo or document</button></section>}
    edit={() => {}} changeFacts={() => {}} go={() => {}} send={() => {}} regenerate={() => {}}
  />)
  expect(screen.getByLabelText('What kind of bill problem?')).toBeVisible()
  expect(screen.queryByText('Prior provider contact (optional)')).not.toBeInTheDocument()
})
test('saved supplier suggestions are explicit choices, never selected locations or addresses', async () => {
  savePreferences('sample', { ...defaults(), watches: [samplePlaces[0].id] })
  render(<RequestWorkspace place={samplePlaces[0]} places={samplePlaces} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
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
  for (const name of ['Oak Street', 'Community centre']) {
    fireEvent.change(screen.getByLabelText('Enter any affected location in Arkansas'), { target: { value: name } })
    fireEvent.keyDown(screen.getByLabelText('Enter any affected location in Arkansas'), { key: 'Enter' })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Remove location: Oak Street' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.queryByRole('button', { name: 'Remove location: Oak Street' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove location: Community centre' })).toBeVisible()
  await waitFor(() => expect(screen.getByText('Saved on this device')).toBeVisible())
  view.unmount()
  render(<RequestWorkspace {...props} />)
  expect(await screen.findByRole('button', { name: 'Remove location: Community centre' })).toBeVisible()
})
test('timing offers manual locations without preselection and keeps the primary action in the heading', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} sample language="en" onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Water-quality concern' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  const input = screen.getByLabelText('Enter any affected location in Arkansas')
  expect(screen.getByLabelText('When did it end? (optional)')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('When did it end? (optional)')).toBeEnabled()
  expect(screen.getByText(/Enter any Arkansas location: town, neighborhood, street, business, school, or home/)).toBeVisible()
  expect(screen.queryByRole('button', { name: /Remove location/ })).not.toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'Pine Bluff apartment complex' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add this location' }))
  expect(screen.getByRole('button', { name: 'Remove location: Pine Bluff apartment complex' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Continue' }).closest('.request-title-row')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'An unusual color' }))
  expect(screen.getByLabelText('How often does it happen? (optional)')).toHaveValue('')
  expect(screen.getByLabelText('Describe what happened (optional if selected above)')).toHaveValue('')
})
test('can search Census for an Arkansas address and choose the returned match', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => Response.json({ addresses: ['123 MAIN ST, LITTLE ROCK, AR, 72201'] })
  try {
    render(<RequestWorkspace place={samplePlaces[0]} places={samplePlaces} sample language="en" onBack={() => {}} onHistory={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
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
