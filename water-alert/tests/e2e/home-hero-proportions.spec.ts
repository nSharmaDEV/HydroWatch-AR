import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// The Home hero uses fuller proportions at 100% zoom: a wider measure, a larger two-line
// headline and larger search, Browse button and cards, all still visible on a 13-inch laptop.
async function open(page: Page, context: BrowserContext, baseURL: string | undefined, language: 'en' | 'es', width: number, height: number) {
  const at = new Date().toISOString()
  await context.addInitScript(language => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: false }))
  }, language)
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL) return route.abort()
    if (url.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: ['ADH', 'ADEQ'].map(agency => ({ agency, records: [], lastSuccessAt: at, retrievedAt: at, error: null })), archive: [], coverageStart: at } })
    if (url.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false, accountUrl: null } })
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.setViewportSize({ width, height })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.wave-hero-search').waitFor()
}

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!

// 13-inch MacBook browser viewports (1440×900 and 1470×956 screens, minus browser chrome).
for (const language of ['en', 'es'] as const) for (const [width, height] of [[1440, 780], [1470, 830]]) test(`fuller hero fits a ${width}×${height} laptop viewport (${language})`, async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== 'desktop', 'two-column layout only')
  await open(page, context, baseURL, language, width, height)
  const inner = await box(page, '.wave-hero-inner')
  const title = await box(page, '#wave-hero-title')
  const help = await box(page, '.wave-home-action--help')
  const browse = await box(page, '.wave-hero-pill')
  const search = await box(page, '.wave-hero-search')
  // Wider measure with smaller outer margins than the former 1100px column.
  expect(inner.width).toBeGreaterThanOrEqual(1200)
  // The logo lines up with the hero's left edge; the navigation keeps its normal size.
  const logo = await box(page, '.app-header .brand')
  expect(Math.abs(logo.x - inner.x)).toBeLessThanOrEqual(2)
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.app-header nav button')!).fontSize))).toBe(16)
  // Larger type and controls.
  const sizes = await page.evaluate(() => {
    const px = (selector: string) => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)
    return { h1: px('#wave-hero-title'), lede: px('.wave-hero-lede'), input: px('.wave-hero-field input'), pill: px('.wave-hero-pill'), cardTitle: px('.wave-home-action-title'), cardText: px('.wave-home-action-desc'), header: px('.app-header') }
  })
  expect(sizes.h1).toBeGreaterThanOrEqual(62)
  expect(sizes.lede).toBeGreaterThanOrEqual(20.5)
  expect(sizes.input).toBeGreaterThanOrEqual(19.5)
  expect(sizes.pill).toBeGreaterThanOrEqual(17)
  expect(sizes.cardTitle).toBeGreaterThanOrEqual(24)
  expect(sizes.cardText).toBeGreaterThanOrEqual(17)
  expect(search.height).toBeGreaterThanOrEqual(76)
  expect(browse.height).toBeGreaterThanOrEqual(48)
  // English headline keeps its two-line layout.
  if (language === 'en') {
    const lineHeight = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#wave-hero-title')!).lineHeight))
    expect(Math.round(title.height / lineHeight)).toBe(2)
  }
  // Everything in the hero is visible without scrolling.
  expect(help.y + help.height).toBeLessThanOrEqual(height)
  expect(browse.y + browse.height).toBeLessThanOrEqual(height)
  expect(search.x + search.width).toBeLessThan(help.x - 40)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (process.env.WAVE_HELP_CAPTURE_DIR) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/home-${language}-${width}x${height}.png` })
})

// Smaller screens stack the columns without horizontal overflow.
for (const language of ['en', 'es'] as const) for (const width of [375, 768, 1023]) test(`hero stacks without overflow at ${width}px (${language})`, async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== 'desktop', 'explicit widths')
  await open(page, context, baseURL, language, width, 844)
  const search = await box(page, '.wave-hero-search')
  const map = await box(page, '.wave-home-action')
  expect(map.y).toBeGreaterThan(search.y + search.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (process.env.WAVE_HELP_CAPTURE_DIR && width === 375) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/home-${language}-${width}.png`, fullPage: true })
})
