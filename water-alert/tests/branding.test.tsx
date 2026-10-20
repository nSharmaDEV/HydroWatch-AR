import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import App from '../src/App'

const name = 'WellPower: WAVE'
const purpose = 'WellPower: WAVE—Water Advisory Verification & Empowerment—helps Arkansas residents check official advisories for their exact water supplier and take informed action through verified provider contacts and editable follow-up or reimbursement requests.'

it('uses the supplied logo in the accessible home button instead of the default water glyph', () => {
  render(<App />)
  const home = screen.getByRole('button', { name })
  const logo = within(home).getByRole('img', { name })
  expect(logo).toHaveAttribute('src', '/wave-logo.png')
  expect(logo).toHaveAttribute('width')
  expect(logo).toHaveAttribute('height')
  expect(home.querySelector('svg')).toBeNull()
})

it('links matching PNG favicon and install icons with the existing app identity', () => {
  const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html')
  expect(html.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/icon-32.png')
  expect(html.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon.png')
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual(['/icon-192.png', '/icon-512.png'])
  for (const [file, size] of [['icon-32.png', 32], ['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]] as const) {
    const png = readFileSync(`public/${file}`)
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size])
  }
})

it('introduces the approved name and purpose without implying water testing', async () => {
  render(<App />)
  expect(screen.getByRole('button', { name })).toBeVisible()
  expect(screen.getByText('Published notices are not a water safety test.')).toBeVisible()
  await userEvent.setup().click(screen.getByText('About WAVE', { selector: 'summary' }))
  expect(screen.getByText(purpose)).toBeVisible()
  expect(screen.getByText('Verification means checking published advisories, not testing water or certifying safety.')).toBeVisible()
  await userEvent.setup().click(screen.getByRole('button', { name: 'ES' }))
  expect(screen.getByRole('button', { name })).toBeVisible()
  expect(screen.getByText(/ayuda a los residentes de Arkansas a consultar los avisos oficiales/)).toBeVisible()
  expect(screen.getByText('Verificación significa consultar avisos publicados, no analizar el agua ni certificar su seguridad.')).toBeVisible()
})

it('retains saved watches without repeating the product pitch in settings', async () => {
  localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: ['ADH:real'], liftWatches: [], language: 'en', checkOnOpen: false }))
  render(<App />)
  expect(screen.getByRole('heading', { name: 'My Water' })).toBeVisible()
  await userEvent.setup().click(within(screen.getByRole('navigation')).getByRole('button', { name: /Settings/ }))
  expect(screen.queryByText(purpose)).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches).toEqual(['ADH:real'])
})

it('uses the approved browser and installed-app identity without changing app scope', () => {
  const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html')
  expect(html.title).toBe('WellPower: WAVE · Arkansas advisories')
  expect(html.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(purpose)
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  expect(manifest).toMatchObject({ name, short_name: name, description: purpose, id: '/', start_url: '/', scope: '/' })
})

it('shares a sample notice under the approved name while preserving its sample warning', async () => {
  const share = vi.fn(async () => {})
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  try {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Try sample mode' }))
    await user.click(screen.getByRole('button', { name: 'Use sample watch list' }))
    await user.click(screen.getByRole('button', { name: 'View details Sample Cove Lake' }))
    await user.click(screen.getByRole('button', { name: 'Share notice' }))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: name, text: expect.stringContaining('SAMPLE') }))
  } finally { Reflect.deleteProperty(navigator, 'share') }
})

it('uses the approved fallback notification title without sending a notification', async () => {
  const handlers: Record<string, (event: unknown) => void> = {}
  const showNotification = vi.fn(async () => {})
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { location: { origin: 'https://example.test' }, addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler }, registration: { showNotification } } })
  let pending: Promise<void> | undefined
  handlers.push({ data: { json: () => ({}) }, waitUntil: (promise: Promise<void>) => { pending = promise } })
  await pending
  expect(showNotification).toHaveBeenCalledWith(name, expect.objectContaining({ body: expect.stringContaining('official agency source') }))
})
