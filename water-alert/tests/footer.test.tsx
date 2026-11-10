import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from '../src/App'

it('shows the original short home footer', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /find water advisories in arkansas/i })).toBeVisible()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('WellPower: WAVE')
  expect(screen.getByRole('contentinfo')).toHaveTextContent('For awareness only. In an emergency, contact your water provider or local emergency services.')
})
