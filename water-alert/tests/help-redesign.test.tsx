import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '../src/App'
import { StatusCard } from '../src/components'
import { en } from '../src/strings'
import type { Place } from '../src/domain'
import { defaults, savePreferences } from '../src/storage'
import { HelpGuide } from '../src/HelpGuide'

const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const liveData = { places: [place], sources: [], archive: [], coverageStart: null }
const now = Date.parse('2026-10-18T12:00:00Z')

// Hiding contact values behind icons or removing the direct guide entry must fail.
it('keeps linked contact values and help in their individual collapsed sections', async () => {
  render(<StatusCard place={place} now={now} t={en} onView={() => {}} onHelp={() => {}} />)
  await userEvent.setup().click(document.querySelector('.supplier-contact-section>summary')!)
  await userEvent.setup().click(document.querySelector('.supplier-help-section>summary')!)
  expect(screen.getByRole('link', { name: /Call.*479/ })).toHaveTextContent('(479) 549-2158')
  expect(screen.getByRole('link', { name: /LEISUREHILLSWATERCO@GMAIL.COM/ })).toHaveTextContent('LEISUREHILLSWATERCO@GMAIL.COM')
  expect(screen.getByRole('button', { name: 'Open guide' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Provider information' })).toBeVisible()
})

// Losing mounted editor state, advancing without a branch or filing from WAVE must fail.
it('walks five steps, preserves edits and restores trigger focus without submitting', async () => {
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const user = userEvent.setup()
  render(<App liveData={liveData} />)
  await user.click(document.querySelector('.supplier-help-section>summary')!)
  await user.click(screen.getByRole('button', { name: 'Open guide' }))
  expect(screen.getByRole('heading', { name: 'What do you need help with?' })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Billing or consumer dispute' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('heading', { name: 'Choose the right contact' })).toHaveFocus()
  expect(screen.getByText(/not every water issue falls within/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  const body = screen.getByRole('textbox', { name: 'Draft body' })
  await user.clear(body); await user.type(body, 'My own edited facts')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('heading', { name: 'Save your draft, then open the official form' })).toHaveFocus()
  expect(screen.getByRole('link', { name: /Open official complaint form/ })).toHaveAttribute('href', 'https://arkansasag.gov/file-a-complaint/')
  expect(screen.getByText(/possible public records/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Previous step' }))
  expect(screen.getByRole('textbox', { name: 'Draft body' })).toHaveValue('My own edited facts')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('Step 5 of 5')).toBeVisible()
  expect(screen.getByText(/30–40 days/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Back to water results' }))
  expect(screen.getByRole('button', { name: 'Open guide' })).toHaveFocus()
})

it('routes quality questions to verified ADH engineering, never emergency complaints', async () => {
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const user = userEvent.setup()
  render(<App liveData={liveData} />)
  await user.click(document.querySelector('.supplier-help-section>summary')!)
  await user.click(screen.getByRole('button', { name: 'Open guide' }))
  expect(screen.getByText(/immediate medical danger/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Water quality or health concern' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('link', { name: /501-661-2623/ })).toHaveAttribute('href', 'tel:+15016612623')
  expect(screen.queryByRole('link', { name: /Open official complaint form/ })).not.toBeInTheDocument()
})

it.each(['Service or outage', 'Legal help'])('offers the scoped %s route and retains each of five template edits', async choice => {
  const user = userEvent.setup()
  render(<HelpGuide place={place} language="en" sample={false} onBack={() => {}} />)
  await user.click(screen.getByRole('button', { name: choice }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  if (choice === 'Service or outage') expect(screen.getByRole('link', { name: /Call.*479/ })).toBeVisible()
  else expect(screen.getByRole('link', { name: /Legal-aid intake/ })).toHaveAttribute('href', 'https://aroi.legalserver.org/modules/matter/extern_intake.php?pid=38&h=757e8c&')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  const select = screen.getByRole('combobox')
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

it('warns about language loss then resets the guide in Spanish', async () => {
  savePreferences('live', { ...defaults(), watches: [place.id] })
  const user = userEvent.setup()
  render(<App liveData={liveData} />)
  await user.click(document.querySelector('.supplier-help-section>summary')!)
  await user.click(screen.getByRole('button', { name: 'Open guide' }))
  await user.click(screen.getByRole('button', { name: 'Service or outage' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getAllByText(/changing supplier, notice, mode or language/)[0]).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'ES' }))
  expect(screen.getByText('Paso 1 de 5')).toBeVisible()
  expect(screen.getByRole('heading', { name: '¿Con qué necesita ayuda?' })).toHaveFocus()
})
