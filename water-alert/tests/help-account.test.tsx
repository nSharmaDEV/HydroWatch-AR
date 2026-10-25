import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HelpAccount } from '../src/HelpAccount'

vi.mock('../src/help-client', () => ({ helpApi: vi.fn() }))
import { helpApi } from '../src/help-client'

afterEach(() => { cleanup(); vi.resetAllMocks() })

it.each(['en', 'es'] as const)('opens device-only content directly when accounts are disabled (%s)', async language => {
  vi.mocked(helpApi).mockResolvedValue({ enabled: false, user: null, delivery: true, accountUrl: null })
  render(<HelpAccount language={language}>{session => <p>Device history: {String(session.delivery)} / {String(session.enabled)}</p>}</HelpAccount>)
  expect(await screen.findByText('Device history: false / false')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Continue without|Continuar sin/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /Private History|Historial privado/ })).not.toBeInTheDocument()
})

it('keeps configured account sign-in available instead of bypassing it', async () => {
  vi.mocked(helpApi).mockResolvedValue({ enabled: true, user: null, delivery: true, accountUrl: null })
  render(<HelpAccount language="en">{() => <p>Private content</p>}</HelpAccount>)
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible()
  expect(screen.queryByText('Private content')).not.toBeInTheDocument()
})
