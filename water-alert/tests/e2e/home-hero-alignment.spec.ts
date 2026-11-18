import { test, expect } from '@playwright/test'

// The search box starts level with the "Get help with a water issue" card on two-column layouts.
for (const language of ['en', 'es'] as const) for (const width of [1100, 1440, 1920]) test(`search aligns with the help card at ${width}px (${language})`, async ({ page, context, baseURL }) => {
  test.skip(test.info().project.name !== 'desktop', 'two-column layout only')
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
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const search = (await page.locator('.wave-hero-search').boundingBox())!
  const help = (await page.locator('.wave-home-action--help').boundingBox())!
  const map = (await page.locator('.wave-home-action').first().boundingBox())!
  const title = (await page.locator('#wave-hero-title').boundingBox())!
  const browse = (await page.locator('.wave-hero-pill').boundingBox())!
  expect(Math.abs(search.y - help.y)).toBeLessThanOrEqual(1)
  // The cards stay a pair 20px apart, the map card never rises above the title, and Browse sits under the search.
  expect(Math.abs(help.y - (map.y + map.height) - 20)).toBeLessThanOrEqual(1)
  expect(map.y).toBeGreaterThanOrEqual(title.y - 1)
  expect(browse.y).toBeGreaterThan(search.y + search.height)
  expect(search.x + search.width).toBeLessThan(help.x)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (process.env.WAVE_HELP_CAPTURE_DIR && width === 1440) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/home-${language}-${width}.png` })
})
