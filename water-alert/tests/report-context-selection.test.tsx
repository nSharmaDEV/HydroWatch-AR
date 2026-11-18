import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ReportContextSelection } from '../src/ReportContextSelection'
import { initialFacts } from '../src/help-flow'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

afterEach(cleanup)
test('reviewed report context distinguishes optional selections from required findings', () => {
  const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS', county: 'Benton', kind: 'system' as const }
  const facts = initialFacts(place, [], false, false, 'en')
  const change = vi.fn()
  render(<ReportContextSelection place={place} facts={facts} sample={false} language="en" changeFacts={change} />)
  expect(screen.getAllByText(/automatically included/i).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/historical/i).length).toBeGreaterThan(0)
  const checkbox = screen.getAllByRole('checkbox')[0]
  fireEvent.click(checkbox)
  expect(change.mock.calls[0][0].find((f: { id: string }) => f.id === '2025:0').included).toBe(true)
  expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', facts[0].sources[0].url)
})
