import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', kind: 'system' as const, county: 'Benton' }
beforeEach(() => vi.stubGlobal('fetch', async () => Response.json({ enabled: false, user: null, delivery: false, accountUrl: null })))
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })

test('Ask about this starts a report question with the finding quoted and cited', async () => {
  render(<RequestWorkspace place={place} ask="2025:3" sample={false} language="en" onBack={() => {}} onHistory={() => {}} />)
  expect(await screen.findByRole('button', { name: 'Ask about a water report' })).toHaveAttribute('aria-pressed', 'true')
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toContain('Failed to provide Public Education Notice')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('checkbox', { name: 'Tell me whether this has been resolved' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Send me a copy of any notice about it' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Write my email' }))
  const body = (screen.getByLabelText('Message') as HTMLTextAreaElement).value
  expect(body).toContain('I’m writing with a question about your annual water quality report.')
  expect(body).toContain('1. Tell me whether this has been resolved')
  expect(body).toContain('Related records')
  expect(body).toContain('For historical context (not current status)')
  expect(body).toContain('https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025#page=2')
  expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toMatch(/^Question about your annual water report — /)
})

test('the report tile only appears for suppliers with hand-checked findings', async () => {
  render(<RequestWorkspace place={{ ...place, id: 'ADH:0000000000000000000000000000000000000000000000000000000000000000', name: 'OTHER SYSTEM' }} sample={false} language="es" onBack={() => {}} onHistory={() => {}} />)
  await screen.findByRole('button', { name: 'Factura o cargo' })
  expect(screen.queryByRole('button', { name: 'Preguntar sobre un informe del agua' })).not.toBeInTheDocument()
})
