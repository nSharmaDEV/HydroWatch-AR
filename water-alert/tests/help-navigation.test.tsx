import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import App from '../src/App'
import { savePreferences, defaults } from '../src/storage'
afterEach(() => { cleanup(); localStorage.clear() })
test('Map and private History are separate navigation destinations', async () => {
  localStorage.setItem('water-alert:mode', 'sample'); savePreferences('sample', { ...defaults(), watches: ['ADH:sample-creek'] })
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'History' }))
  expect(await screen.findByText(/Sample drafts/)).toBeVisible()
  expect(screen.queryByRole('heading', { name: /Observed/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Map' }))
  await waitFor(() => expect(document.querySelector('.advisory-map-page')).not.toHaveAttribute('hidden'))
})
