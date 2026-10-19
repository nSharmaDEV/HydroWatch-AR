import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { PushPanel } from '../src/PushPanel'
import { defaults } from '../src/storage'
import { en } from '../src/strings'
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('never contacts the live subscription API from sample settings', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  render(<PushPanel mode="sample" prefs={defaults()} t={en} onChange={() => {}} />)
  expect(screen.getByText('Notifications are disabled in sample mode.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Enable device notifications' })).not.toBeInTheDocument()
  expect(fetcher).not.toHaveBeenCalled()
})
it('shows hosting configuration as unavailable, not a false enabled state', async () => {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission: 'default' })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: false, publicKey: null }))))
  render(<PushPanel mode="live" prefs={{ ...defaults(), watches: ['ADH:test'] }} t={en} onChange={() => {}} />)
  expect(await screen.findByText(/Server push is not configured/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Enable device notifications' })).toBeDisabled()
})
it('offers credential-preserving deletion retry if server removal fails', async () => {
  localStorage.setItem('water-alert:push-device:v1', JSON.stringify({ token: 'a'.repeat(43), signature: 'old' }))
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => options?.method === 'DELETE' ? new Response('{}', { status: 503 }) : new Response(JSON.stringify({ enabled: false, publicKey: null }))))
  render(<PushPanel mode="live" prefs={defaults()} t={en} onChange={() => {}} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Disable & remove subscription' }))
  expect(await screen.findByText(/Could not complete the request/)).toBeVisible()
  expect(localStorage.getItem('water-alert:push-device:v1')).not.toBeNull()
})
