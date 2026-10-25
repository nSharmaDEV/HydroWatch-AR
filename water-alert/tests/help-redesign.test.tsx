import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '../src/App'
import { StatusCard } from '../src/components'
import { en } from '../src/strings'
import type { Place } from '../src/domain'
import { defaults, savePreferences } from '../src/storage'
import { HelpGuide } from '../src/HelpGuide'
import { helpGuideStrings } from '../src/help-guide-strings'
import { helpFixture } from './help-fixture'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const liveData = { places: [place], sources: [], archive: [], coverageStart: null }
const now = Date.parse('2026-10-18T12:00:00Z')

it.each(['en', 'es'] as const)('keeps every %s step and its navigation in one consistently labelled panel', async language => {
  const user = userEvent.setup()
  const t = helpGuideStrings[language]
  render(<HelpGuide place={place} language={language} sample onBack={() => {}} />)
  for (let step = 1; step <= 5; step++) {
    const panel = screen.getByRole('region', { name: t.titles[step - 1] })
    expect(panel).toHaveClass('panel', 'guide-step')
    expect(within(panel).getByRole('heading', { level: 1, name: t.titles[step - 1] })).toHaveFocus()
    expect(within(panel).getByText(t.step(step))).toBeVisible()
    if (step === 1) await user.click(within(panel).getByRole('button', { name: t.service }))
    if (step > 1) expect(within(panel).getByRole('button', { name: t.previous })).toBeVisible()
    const action = within(panel).getByRole('button', { name: step === 5 ? t.done : t.next })
    expect(action.closest('.guide-navigation')).not.toBeNull()
    if (step < 5) await user.click(action)
  }
})

// Hiding contact values behind icons or removing the direct guide entry must fail.
it('keeps contact values and help directly available', async () => {
  render(<StatusCard place={place} now={now} t={en} onView={() => {}} onHelp={() => {}} />)
  expect(document.querySelector('.supplier-contact-section .provider-contact')).toBeVisible()
  expect(screen.getByRole('link', { name: /Call.*479/ })).toHaveTextContent('(479) 549-2158')
  expect(screen.getByRole('link', { name: /LEISUREHILLSWATERCO@GMAIL.COM/ })).toHaveTextContent('LEISUREHILLSWATERCO@GMAIL.COM')
  expect(screen.getByRole('button', { name: 'Get help with a water issue' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Provider information' })).toBeVisible()
})

// Losing mounted editor state, advancing without a branch or filing from WAVE must fail.
 it('walks guided screens, preserves edits and restores trigger focus without submitting', async () => {
  helpFixture()
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const user = userEvent.setup()
  render(<App liveData={liveData} />)
  await user.click(screen.getByRole('button', { name: 'Places' }))
  await user.click(screen.getByRole('button', { name: 'Get help with a water issue' }))
  expect(await screen.findByRole('heading', { name: 'What do you need help with?' })).toHaveFocus()
   expect(screen.queryByLabelText('How is this affecting you?')).not.toBeInTheDocument()
   await user.click(screen.getByRole('button', { name: 'Bill or charge' }))
   await user.click(screen.getByRole('button', { name: 'Continue' }))
   await user.click(screen.getByRole('button', { name: 'Continue' }))
   await user.type(screen.getByLabelText('Describe what happened (optional if selected above)'), 'My billing issue')
   await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Review message' }))
  const body = screen.getByRole('textbox', { name: 'Message' })
   await user.clear(body); await user.type(body, 'My own edited facts')
   await user.click(screen.getByText(/^To:/))
  await user.click(screen.getByRole('checkbox', { name: /LEISURE HILLS/ }))
  await user.click(screen.getByRole('checkbox', { name: /Arkansas Attorney General/ }))
  expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
   expect(screen.getByRole('link', { name: /Official contact/ })).toHaveAttribute('href', 'https://arkansasag.gov/file-a-complaint/')
   expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('My own edited facts')
   if (screen.queryByRole('button', { name: 'Back' })) await user.click(screen.getByRole('button', { name: 'Back' }))
   await user.click(screen.getByRole('button', { name: 'Back' }))
   await user.click(screen.getByRole('button', { name: 'Back' }))
   await user.click(screen.getByRole('button', { name: 'Back' }))
   await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('button', { name: 'Get help with a water issue' })).toHaveFocus()
})

it('routes quality questions to verified ADH engineering, never emergency complaints', async () => {
  helpFixture()
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const user = userEvent.setup()
  render(<App liveData={liveData} />)
  await user.click(screen.getByRole('button', { name: 'Places' }))
  await user.click(screen.getByRole('button', { name: 'Get help with a water issue' }))
   await user.click(await screen.findByRole('button', { name: 'Water-quality concern' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByLabelText('Describe what happened (optional if selected above)'), 'Water quality question')
   await user.click(screen.getByRole('button', { name: 'Continue' }))
   if (screen.queryByRole('button', { name: 'Review supporting information' })) await user.click(screen.getByRole('button', { name: 'Review supporting information' }))
   await user.click(screen.getByRole('button', { name: 'Review message' }))
   await user.click(screen.getByText(/^To:/))
  expect(screen.getByRole('checkbox', { name: /Arkansas Department of Health/ })).toBeChecked()
   expect(screen.getByText(/external channel only/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
})

it.each(['Service or outage', 'Legal help'])('offers the scoped %s route and retains each of five template edits', async choice => {
  const user = userEvent.setup()
  render(<HelpGuide place={place} language="en" sample={false} onBack={() => {}} />)
  await user.click(screen.getByRole('button', { name: choice }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  if (choice === 'Service or outage') expect(screen.getByRole('link', { name: /Call.*479/ })).toBeVisible()
  else expect(screen.getByRole('link', { name: /Legal-aid intake/ })).toHaveAttribute('href', 'https://aroi.legalserver.org/modules/matter/extern_intake.php?pid=38&h=757e8c&')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  const select = screen.getByRole('combobox', { name: 'What do you need help with?' })
  for (const kind of ['service', 'request', 'complaint', 'legal', 'followup']) {
    await user.selectOptions(select, kind)
    const body = screen.getByRole('textbox', { name: 'Draft body' })
    await user.clear(body); await user.type(body, `${kind} custom facts`)
  }
  for (const kind of ['service', 'request', 'complaint', 'legal', 'followup']) {
    await user.selectOptions(select, kind)
    expect(screen.getByRole('textbox', { name: 'Draft body' })).toHaveValue(`${kind} custom facts`)
  }
  await user.click(screen.getByRole('button', { name: 'Next' }))
  if (choice === 'Legal help') {
    expect(screen.getByText(/Eligibility and representation are not guaranteed/)).toBeVisible()
    expect(screen.queryByText(/Use your provider or ADH contact for this issue/)).not.toBeInTheDocument()
  }
})

it('keeps sample quality routing free of real phone and email targets', async () => {
  const user = userEvent.setup()
  render(<HelpGuide place={place} language="es" sample onBack={() => {}} />)
  await user.click(screen.getByRole('button', { name: 'Calidad del agua o inquietud de salud' }))
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
})

it('changes controls to Spanish without resetting saved issue or edited message', async () => {
  helpFixture()
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const user = userEvent.setup()
  render(<App liveData={liveData} />)
  await user.click(screen.getByRole('button', { name: 'Places' }))
    await user.click(screen.getByRole('button', { name: 'Get help with a water issue' }))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
   await user.type(screen.getByLabelText('Describe what happened (optional if selected above)'), 'My issue')
   await user.click(screen.getByRole('button', { name: 'Continue' }))
   if (screen.queryByRole('button', { name: 'Review supporting information' })) await user.click(screen.getByRole('button', { name: 'Review supporting information' }))
  await user.click(screen.getByRole('button', { name: 'Review message' }))
  const editor = screen.getByRole('textbox', { name: 'Message' })
  await user.clear(editor); await user.type(editor, 'My edited facts')
  await user.click(screen.getByRole('button', { name: 'ES' }))
     expect(screen.getByRole('heading', { name: 'Revisa tu correo de queja' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Mensaje' })).toHaveValue('My edited facts')
})
