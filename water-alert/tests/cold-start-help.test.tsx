import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../src/App'
import { samplePlaces } from '../src/sample'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })

const supplier = samplePlaces.find(p => p.kind === 'system')!

// A first-time visitor (no followed supplier) must reach a copyable provider message
// from the home "Get help" card, without being forced to follow a supplier first.
it('takes a visitor with no followed supplier from Get help to a copyable message', async () => {
  localStorage.setItem('water-alert:mode', 'sample')
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: /Get help with a water issue/ }))
  expect(screen.getByRole('heading', { name: 'Choose your water provider' })).toBeVisible()
  expect(screen.queryByRole('button', { name: /My public water supplier/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: `Select ${supplier.name}` }))
  expect(screen.queryByRole('heading', { name: 'Confirm your public water supplier' })).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Continue' }))
  await user.click(await screen.findByRole('button', { name: 'Continue' }))
  await user.type(await screen.findByLabelText('Describe what happened (optional if selected before)'), 'Low pressure since Monday')
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Review email' }))
  expect((await screen.findByLabelText<HTMLTextAreaElement>('Message')).value).toContain('Low pressure since Monday')
  await user.click(screen.getByRole('button', { name: 'Where to send it' }))
  expect(screen.getByRole('button', { name: 'Copy email' })).toBeEnabled()
  expect(JSON.parse(localStorage.getItem('water-alert:sample:v1')!).watches).toEqual([])
})

it('returns to Home from the help provider picker and from the draft', async () => {
  localStorage.setItem('water-alert:mode', 'sample')
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: /Get help with a water issue/ }))
  await user.click(screen.getByRole('button', { name: /Back/ }))
  expect(screen.getByRole('heading', { name: 'Water information, made easier.' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: /Get help with a water issue/ }))
  await user.click(screen.getByRole('button', { name: `Select ${supplier.name}` }))
  await screen.findByRole('button', { name: 'Continue' })
  const backs = screen.getAllByRole('button', { name: /^‹?\s*Back/ })
  await user.click(backs[0])
  expect(await screen.findByRole('heading', { name: 'Water information, made easier.' })).toBeVisible()
})

it('keeps the normal follow-onboarding search unchanged after a help visit', async () => {
  localStorage.setItem('water-alert:mode', 'sample')
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: /Get help with a water issue/ }))
  await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Places' }))
  await user.click(screen.getByRole('button', { name: /Add a place/ }))
  expect(screen.getByRole('heading', { name: 'Find your public water supplier' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: `Select ${supplier.name}` }))
  expect(screen.getByRole('heading', { name: 'Confirm your public water supplier' })).toBeVisible()
})

it('routes the Spanish card to a Spanish provider picker', async () => {
  localStorage.setItem('water-alert:mode', 'sample')
  const user = userEvent.setup(); render(<App />)
  await user.click(screen.getByRole('button', { name: 'ES' }))
  await user.click(screen.getByRole('button', { name: /Obtener ayuda con un problema de agua/ }))
  expect(screen.getByRole('heading', { name: 'Elige tu proveedor de agua' })).toBeVisible()
  await user.click(screen.getAllByRole('button', { name: new RegExp(supplier.name) })[0])
  expect(await screen.findByRole('button', { name: /Continuar/ })).toBeVisible()
})
