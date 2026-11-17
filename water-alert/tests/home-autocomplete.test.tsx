import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '../src/App'
import { EMPTY_SOURCES } from '../src/domain'

it('suggests a matching supplier and opens its preview with the keyboard', async () => {
  localStorage.clear()
  const place = { id: 'ADH:unique-test', name: 'Zyzzyva Water', county: 'Benton', kind: 'system' as const }
  render(<App liveData={{ places: [place], sources: EMPTY_SOURCES, archive: [], coverageStart: null }} />)
  const input = screen.getByRole('combobox', { name: /supplier name/i })
  await userEvent.type(input, 'Zyzzyva')
  expect(screen.getByRole('option', { name: /Zyzzyva Water/i })).toBeVisible()
  await userEvent.keyboard('{ArrowDown}{Enter}')
  expect(screen.getByText(/Next saves this supplier/i)).toBeVisible()
})

it('dismisses suggestions with Escape and allows pointer selection after refocusing', async () => {
  localStorage.clear()
  const place = { id: 'ADH:unique-test', name: 'Zyzzyva Water', county: 'Benton', kind: 'system' as const }
  render(<App liveData={{ places: [place], sources: EMPTY_SOURCES, archive: [], coverageStart: null }} />)
  const input = screen.getByRole('combobox', { name: /supplier name/i })
  await userEvent.type(input, 'Zyzzyva')
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await userEvent.click(input)
  await userEvent.type(input, ' ')
  await userEvent.click(screen.getByRole('option', { name: /Zyzzyva Water/i }))
  expect(screen.getByText(/Next saves this supplier/i)).toBeVisible()
})

it('submits ZIPs through the existing search flow without supplier autocomplete', async () => {
  localStorage.clear()
  render(<App />)
  const input = screen.getByRole('combobox', { name: /supplier name/i })
  await userEvent.type(input, '72001')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await userEvent.keyboard('{Enter}')
  expect(screen.getByRole('searchbox')).toHaveValue('72001')
})

it('shows at most three suggestions and closes the suggestion panel when cleared', async () => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  render(<App />)
  const input = screen.getByRole('combobox', { name: /supplier name/i })
  await userEvent.type(input, 'water')
  expect(screen.getAllByRole('option')).toHaveLength(3)
  await userEvent.clear(input)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(input).toHaveAttribute('aria-expanded', 'false')
})
