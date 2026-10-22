import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { HelpGuide } from '../src/HelpGuide'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import type { Place } from '../src/domain'

const place: Place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }

// Removing either labelled column on any step must fail, not just changing CSS classes.
it.each([true, false])('pairs guidance and work on every step (active=%s)', async active => {
  const user = userEvent.setup()
  render(<HelpGuide place={place} active={active} language="en" sample onBack={() => {}} />)
  for (let step = 0; step < (active ? 4 : 5); step++) {
    expect(screen.getByRole('region', { name: 'What to do' })).toBeVisible()
    const work = screen.getByRole('region', { name: 'Your workspace' })
    expect(work).toBeVisible()
    if (!step) await user.click(within(work).getByRole('button', { name: 'Service or outage' }))
    if (step === (active ? 1 : 2)) expect(within(work).getByRole('textbox', { name: 'Draft body' })).toBeVisible()
    if (step < (active ? 3 : 4)) await user.click(screen.getByRole('button', { name: 'Next' }))
  }
})

// Omitting general-guide evidence from the outgoing message or matching a different supplier must fail.
it('offers exact-provider historical findings in the general guide and copies only selected findings', async () => {
  const user = userEvent.setup()
  render(<HelpGuide place={place} language="en" sample={false} onBack={() => {}} />)
  await user.click(screen.getByRole('button', { name: 'Water quality or health concern' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByText('Optional historical report evidence', { selector: 'summary' }))
  const evidence = screen.getAllByRole('checkbox', { name: /2025.*page 2/ })
  expect(evidence[0]).not.toBeChecked()
  await user.click(evidence[0])
  await user.click(screen.getByRole('button', { name: 'Copy draft' }))
  expect(await navigator.clipboard.readText()).toContain(LEISURE_HILLS_ID)
  expect(await navigator.clipboard.readText()).toContain('HISTORICAL REPORT REFERENCES')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByRole('textbox', { name: 'Draft body' })).toBeVisible()
  expect(screen.getAllByRole('checkbox', { name: /2025.*page 2/ })[0]).toBeChecked()
})
