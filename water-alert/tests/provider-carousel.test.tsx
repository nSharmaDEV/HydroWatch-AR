import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ProviderCarousel } from '../src/ProviderCarousel'

const originalScrollTo = Element.prototype.scrollTo

function track() {
  return screen.getByRole('region', { name: 'Watched places' })
}

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
})

afterEach(() => {
  Element.prototype.scrollTo = originalScrollTo
  vi.restoreAllMocks()
})

it('shows one card at a time with an indicator and boundary-aware controls', async () => {
  const user = userEvent.setup()
  render(<ProviderCarousel><article>First place</article><article>Second place</article><article>Third place</article></ProviderCarousel>)

  expect(screen.getByText('1 of 3 places')).toBeVisible()
  const previous = screen.getByRole('button', { name: 'Previous place' })
  const next = screen.getByRole('button', { name: 'Next place' })
  expect(previous).toBeDisabled()
  expect(next).toBeEnabled()

  await user.click(next)
  expect(screen.getByText('2 of 3 places')).toBeVisible()
  expect(previous).toBeEnabled()

  await user.click(next)
  expect(screen.getByText('3 of 3 places')).toBeVisible()
  expect(next).toBeDisabled()

  await user.click(previous)
  expect(screen.getByText('2 of 3 places')).toBeVisible()
  expect(Element.prototype.scrollTo).not.toHaveBeenCalled()
})

it('does not move cards on wheel or horizontal trackpad scroll', () => {
  render(<ProviderCarousel><article>First place</article><article>Second place</article></ProviderCarousel>)
  const region = track()

  expect(fireEvent.wheel(region, { deltaY: 240 })).toBe(true)
  expect(fireEvent.wheel(region, { deltaX: 240 })).toBe(true)
  expect(region.scrollLeft).toBe(0)
  expect(screen.getByText('1 of 2 places')).toBeVisible()
})

it('clamps the active place when watched cards are removed', () => {
  const { rerender } = render(<ProviderCarousel><article>First place</article><article>Second place</article><article>Third place</article></ProviderCarousel>)
  fireEvent.keyDown(track(), { key: 'End' })
  expect(screen.getByText('3 of 3 places')).toBeVisible()
  rerender(<ProviderCarousel><article>First place</article><article>Second place</article></ProviderCarousel>)
  expect(screen.getByText('2 of 2 places')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Next place' })).toBeDisabled()
  rerender(<ProviderCarousel>{[]}</ProviderCarousel>)
  expect(track()).toBeInTheDocument()
})

it('keeps card buttons and links usable', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(<ProviderCarousel><article><button onClick={onClick}>Open section</button></article><article>Second place</article></ProviderCarousel>)

  await user.click(screen.getByRole('button', { name: 'Open section' }))
  expect(onClick).toHaveBeenCalledOnce()
})

it('keeps expanded card content open while moving between cards', () => {
  render(<ProviderCarousel>
    <article><details><summary>Check history</summary><p>Expanded detail</p></details></article>
    <article>Second place</article>
  </ProviderCarousel>)
  const details = screen.getByText('Expanded detail').closest('details')!
  details.open = true
  fireEvent.keyDown(track(), { key: 'ArrowRight' })
  expect(screen.getByText('2 of 2 places')).toBeVisible()
  expect(details.open).toBe(true)
  expect(screen.getByText('Expanded detail')).toBeVisible()
})

it('uses keyboard arrows, Home and End', () => {
  render(<ProviderCarousel><article>First place</article><article>Second place</article><article>Third place</article></ProviderCarousel>)
  const region = track()

  fireEvent.keyDown(region, { key: 'ArrowRight' })
  expect(screen.getByText('2 of 3 places')).toBeVisible()
  fireEvent.keyDown(region, { key: 'End' })
  expect(screen.getByText('3 of 3 places')).toBeVisible()
  fireEvent.keyDown(region, { key: 'ArrowRight' })
  expect(screen.getByText('3 of 3 places')).toBeVisible()
  fireEvent.keyDown(region, { key: 'Home' })
  expect(screen.getByText('1 of 3 places')).toBeVisible()
})

it('does not intercept navigation keys from native controls inside a card', () => {
  render(<ProviderCarousel><article><input aria-label="Resident input" /><textarea aria-label="Resident text" /><select aria-label="Report year"><option>2025</option><option>2024</option></select><button>Card action</button><a href="#source">Source</a></article><article>Second place</article></ProviderCarousel>)
  for (const control of ['Resident input', 'Resident text', 'Report year']) for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    expect(fireEvent.keyDown(screen.getByLabelText(control), { key })).toBe(true)
    expect(screen.getByText('1 of 2 places')).toBeVisible()
  }
  for (const control of [screen.getByRole('button', { name: 'Card action' }), screen.getByRole('link', { name: 'Source' })]) {
    expect(fireEvent.keyDown(control, { key: 'End' })).toBe(true)
    expect(screen.getByText('1 of 2 places')).toBeVisible()
  }
})

it('exposes only the active slide while keeping inactive state mounted', () => {
  render(<ProviderCarousel><article><button>First action</button></article><article><button>Second action</button></article></ProviderCarousel>)
  const second = screen.getByText('Second action').closest('.carousel-slide')!
  expect(second).toHaveAttribute('inert')
  expect(second).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('button', { name: 'Second action' })).not.toBeInTheDocument()
  fireEvent.keyDown(track(), { key: 'ArrowRight' })
  expect(second).not.toHaveAttribute('inert')
  expect(second).not.toHaveAttribute('aria-hidden', 'true')
  expect(screen.getByRole('button', { name: 'Second action' })).toBeInTheDocument()
  expect(screen.getByText('First action').closest('.carousel-slide')).toHaveAttribute('inert')
})

it('omits controls for a single place and localizes the indicator', () => {
  const { rerender } = render(<ProviderCarousel><article>Only place</article></ProviderCarousel>)
  expect(screen.queryByRole('button', { name: 'Next place' })).not.toBeInTheDocument()

  rerender(<ProviderCarousel language="es"><article>Uno</article><article>Dos</article></ProviderCarousel>)
  expect(screen.getByText('1 de 2 lugares')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Lugar siguiente' })).toBeEnabled()
})
