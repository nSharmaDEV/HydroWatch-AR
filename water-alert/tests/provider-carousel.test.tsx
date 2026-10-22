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
  expect(Element.prototype.scrollTo).toHaveBeenCalled()
})

it('does not move cards on wheel or horizontal trackpad scroll', () => {
  render(<ProviderCarousel><article>First place</article><article>Second place</article></ProviderCarousel>)
  const region = track()

  expect(fireEvent.wheel(region, { deltaY: 240 })).toBe(true)
  expect(fireEvent.wheel(region, { deltaX: 240 })).toBe(true)
  expect(region.scrollLeft).toBe(0)
  expect(screen.getByText('1 of 2 places')).toBeVisible()
})

it('does not move cards on mouse or touch drag gestures', () => {
  render(<ProviderCarousel><article>First place</article><article>Second place</article></ProviderCarousel>)
  const region = track()

  fireEvent.pointerDown(region, { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 300 })
  fireEvent.pointerMove(region, { pointerType: 'mouse', pointerId: 1, clientX: 120 })
  fireEvent.pointerUp(region, { pointerType: 'mouse', pointerId: 1, clientX: 120 })
  fireEvent.pointerDown(region, { pointerType: 'touch', pointerId: 2, clientX: 300 })
  fireEvent.pointerMove(region, { pointerType: 'touch', pointerId: 2, clientX: 120 })
  fireEvent.pointerUp(region, { pointerType: 'touch', pointerId: 2, clientX: 120 })

  expect(region.scrollLeft).toBe(0)
  expect(screen.getByText('1 of 2 places')).toBeVisible()
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

it('omits controls for a single place and localizes the indicator', () => {
  const { rerender } = render(<ProviderCarousel><article>Only place</article></ProviderCarousel>)
  expect(screen.queryByRole('button', { name: 'Next place' })).not.toBeInTheDocument()

  rerender(<ProviderCarousel language="es"><article>Uno</article><article>Dos</article></ProviderCarousel>)
  expect(screen.getByText('1 de 2 lugares')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Lugar siguiente' })).toBeEnabled()
})
