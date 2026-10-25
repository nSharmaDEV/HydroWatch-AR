import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { HelpGuide } from '../src/HelpGuide'
import type { Notice, Place } from '../src/domain'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import App from '../src/App'
import { defaults, savePreferences } from '../src/storage'
import { helpFixture } from './help-fixture'

const place: Place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const notice: Notice = { id: 'test-notice', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Exact published area', reason: 'Main break', issued: '2026-10-19', lifted: null, url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx' }
function setup(language: 'en' | 'es' = 'en', sample = false) {
  const user = userEvent.setup()
  render(<HelpGuide place={place} notice={notice} active language={language} sample={sample} onBack={() => {}} />)
  return user
}
const task = (name: string) => within(screen.getByRole('navigation', { name: 'Help progress' })).getByRole('button', { name: new RegExp(name) })
async function record(user: ReturnType<typeof userEvent.setup>) {
  await user.click(task('Send'))
  await user.type(screen.getByLabelText('Date you sent it'), '2026-10-19')
  await user.click(screen.getByLabelText('I completed sending outside WAVE.'))
  await user.click(screen.getByRole('button', { name: 'Record sent' }))
}

// Removing explicit task completion or replacing it with navigation-driven progress must fail.
it('combines four steps, keeps guidelines outside the count and makes completion reversible', async () => {
  const user = setup()
  expect(screen.getByRole('progressbar')).toHaveAttribute('max', '4')
  expect(screen.getByRole('heading', { level: 1, name: 'Find the right contact' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Billing or consumer dispute' }))
  expect(screen.getByRole('link', { name: /Call.*479/ })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'I have chosen my recipient' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  await user.click(task('Prepare'))
  expect(screen.getByRole('textbox', { name: 'Draft body' })).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  await user.click(task('Contact'))
  await user.click(screen.getByRole('button', { name: 'Mark this step unfinished' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  await user.click(screen.getByText('Water-use guidelines', { selector: 'summary' }))
  expect(screen.getByText(/Follow local officials/)).toBeVisible()
  expect(within(screen.getByRole('navigation', { name: 'Help progress' })).getAllByRole('button')).toHaveLength(4)
})

// Opening an external link, recording a response or passing a date must not close the log.
it('requires sending attestation and a valid nonfuture date; only closure completes follow-up', async () => {
  const user = setup()
  await user.click(task('Send'))
  await user.click(screen.getByRole('button', { name: 'Record sent' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  expect(screen.getByText('Confirm you sent it outside WAVE and enter a valid sending date that is not in the future.')).toBeVisible()
  await user.type(screen.getByLabelText('Date you sent it'), '2999-01-01')
  await user.click(screen.getByLabelText('I completed sending outside WAVE.'))
  await user.click(screen.getByRole('button', { name: 'Record sent' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  await user.clear(screen.getByLabelText('Date you sent it'))
  await user.type(screen.getByLabelText('Date you sent it'), '2026-10-19')
  await user.click(screen.getByLabelText('Reference (optional)')); await user.paste('<img src=x onerror=alert(1)>')
  await user.click(screen.getByRole('button', { name: 'Record sent' }))
  expect(screen.getByRole('heading', { name: 'Follow up', level: 1 })).toHaveFocus()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
  expect(document.querySelector('img[src=x]')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Record response' }))
  expect(screen.getByText('Enter a response summary first.')).toBeVisible()
  await user.click(screen.getByLabelText('Response summary')); await user.paste('Provider requested a receipt.')
  await user.click(screen.getByRole('button', { name: 'Record response' }))
  expect(screen.getByText('Provider requested a receipt.')).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  await user.click(screen.getByRole('button', { name: 'Close my log' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2')
  await user.click(screen.getByRole('button', { name: 'Reopen my log' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  await user.click(screen.getByRole('button', { name: 'Delete my progress log' }))
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  expect(screen.queryByText('Provider requested a receipt.')).not.toBeInTheDocument()
})

it('does not allow a response or closure before a sending record exists', async () => {
  const user = setup()
  await user.click(task('Follow up'))
  await user.click(screen.getByRole('button', { name: 'Close my log' }))
  expect(screen.getByText('Record sending before adding a response or closing your log.')).toBeVisible()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
})

// Changing the template must change the handoff, never infer the recipient from the original issue.
it('retains edited drafts across navigation and routes the selected template to its recipient', async () => {
  const user = setup()
  await user.click(task('Prepare'))
  const editor = screen.getByRole('textbox', { name: 'Draft body' })
  await user.clear(editor); await user.paste('My edited experience')
  await user.selectOptions(screen.getByRole('combobox', { name: 'What do you need help with?' }), 'complaint')
  await user.click(task('Send'))
  expect(screen.getByRole('link', { name: 'Open official complaint form' })).toHaveAttribute('href', 'https://arkansasag.gov/file-a-complaint/')
  expect(screen.getByText(/possible public records/)).toBeVisible()
  await user.click(task('Prepare'))
  await user.selectOptions(screen.getByRole('combobox', { name: 'What do you need help with?' }), 'request')
  expect(screen.getByRole('textbox', { name: 'Draft body' })).toHaveValue('My edited experience')
})

it('uses opt-in exact-supplier historical citations and includes them when copying or opening email', async () => {
  const user = setup()
  await user.click(task('Prepare'))
  await user.click(screen.getByText('Optional historical report evidence', { selector: 'summary' }))
  const evidence = screen.getAllByRole('checkbox', { name: /2025.*page 2/ })
  expect(evidence).toHaveLength(4)
  expect(evidence[0]).not.toBeChecked()
  await user.click(evidence[0])
  const appendix = screen.getByRole('textbox', { name: 'Source appendix included with your message' }) as HTMLTextAreaElement
  expect(appendix.value).toContain('Failed to monitor and/or report sample results, as specified in the RTCR')
  expect(appendix.value).toContain('2026-10-19')
  expect(appendix.value).toContain(LEISURE_HILLS_ID)
  expect(appendix.value).toContain('https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025#page=2')
  await user.click(screen.getByRole('button', { name: 'Copy draft' }))
  const copied = await navigator.clipboard.readText()
  expect(copied).toContain(appendix.value)
  expect(copied).toContain('Record ID: test-notice')
  expect(decodeURIComponent(screen.getByRole('link', { name: 'Open email draft' }).getAttribute('href')!)).toContain(appendix.value)
  await user.click(evidence[0])
  expect(screen.queryByRole('textbox', { name: 'Source appendix included with your message' })).not.toBeInTheDocument()
})

it('keeps Spanish controls and sample mode separate from real contacts and historical findings', async () => {
  const user = setup('es', true)
  expect(screen.getByRole('heading', { level: 1, name: 'Encuentre el contacto adecuado' })).toHaveFocus()
  const nav = screen.getByRole('navigation', { name: 'Progreso de ayuda' })
  await user.click(within(nav).getByRole('button', { name: /Preparar/ }))
  expect(screen.getByRole('textbox', { name: 'Texto del borrador' })).toHaveAttribute('lang', 'en')
  expect((screen.getByRole('textbox', { name: 'Texto del borrador' }) as HTMLTextAreaElement).value).toContain('SAMPLE — NOT A REAL CLAIM')
  expect(screen.queryByRole('checkbox', { name: /2025/ })).not.toBeInTheDocument()
  expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
})

it('forgets the progress log when the guide unmounts', async () => {
  const user = setup()
  await record(user)
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
  cleanup()
  setup()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  await user.click(task('Follow up'))
  expect(screen.getByText('Sending not recorded')).toBeVisible()
  expect(localStorage.getItem('water-alert:help')).toBeNull()
})

it('prepares a reply without redirecting a recorded AG complaint to the provider', async () => {
  const user = setup()
  await user.click(task('Prepare'))
  await user.selectOptions(screen.getByRole('combobox', { name: 'What do you need help with?' }), 'complaint')
  await record(user)
  await user.click(screen.getByRole('button', { name: 'Prepare a reply' }))
  expect(screen.getByRole('combobox', { name: 'What do you need help with?' })).toHaveValue('response')
  expect((screen.getByRole('textbox', { name: 'Draft body' }) as HTMLTextAreaElement).value).toContain('[EXACT RESPONSE / DATE]')
  expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument()
  await user.click(task('Send'))
  expect(screen.getByRole('link', { name: 'Open official complaint form' })).toBeVisible()
  expect(screen.getByText(/Use the reply channel on your original confirmation/)).toBeVisible()
  expect(screen.getByText(/replaces the previous sending record and response notes/)).toBeVisible()
  expect(screen.getAllByText('Arkansas AG consumer complaint').some(element => !element.closest('[hidden]'))).toBe(true)
  expect(screen.getByLabelText('I completed sending outside WAVE.')).not.toBeChecked()
})

it('does not route a quality inquiry email to the billing provider', async () => {
  const user = setup()
  await user.click(screen.getByRole('button', { name: 'Water quality or health concern' }))
  await user.click(task('Prepare'))
  expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument()
})

it.each(['active', 'none', 'failed', 'stale', 'future', 'historical'] as const)('uses guided tasks without treating %s source context as an all-clear', async state => {
  helpFixture()
  const user = userEvent.setup()
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const lastSuccessAt = new Date(Date.now() + (state === 'stale' ? -900_001 : state === 'future' ? 60_000 : 0)).toISOString()
  const historical = { ...notice, id: 'old-notice', lifted: '2026-10-19' }
  if (state === 'historical') window.history.replaceState(null, '', '?notice=old-notice')
  try {
    render(<App liveData={{ places: [place], sources: [{ agency: 'ADH', records: state === 'none' ? [] : [notice], lastSuccessAt, retrievedAt: lastSuccessAt, error: state === 'failed' ? 'Offline' : null }], archive: [notice, historical], coverageStart: null }} />)
    await user.click(screen.getByRole('button', { name: 'Get help with a water issue' }))
    expect(await screen.findByRole('heading', { name: 'What do you need help with?' })).toBeVisible()
    expect(screen.getByText(/Step 1 of [56]/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Current advisory' }))
     await user.click(screen.getByRole('button', { name: 'Continue' }))
     await user.click(screen.getByRole('button', { name: 'Continue' }))
     await user.type(screen.getByLabelText('Describe what happened (optional if selected above)'), 'Please clarify the notice')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
     await user.click(screen.getByRole('button', { name: 'Review message' }))
     if (state === 'active') expect(screen.getByText('Verified in source check for this draft')).toBeVisible()
    else expect(screen.queryByText('Current status verified in the source check for this draft. This is not a water-safety assessment.')).not.toBeInTheDocument()
  } finally { window.history.replaceState(null, '', '/') }
})
