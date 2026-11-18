import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ProviderEvidenceSections } from '../src/ProviderEvidence'
import { providerEvidence } from '../src/provider-evidence'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

afterEach(cleanup)
test('inline disclosure retains keyboard focus when issues are shown and hidden', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false })} language="en" />)
  const trigger = screen.getByRole('button', { name: 'All recorded problems · 4' })
  trigger.focus()
  fireEvent.click(trigger)
  expect(document.activeElement).toBe(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(trigger)
  expect(document.activeElement).toBe(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})
