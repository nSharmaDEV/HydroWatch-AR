import { expect, test } from '@playwright/test'
import { DIRECTORY } from '../../src/water-system-directory'

test.use({ reducedMotion: 'reduce' })

for (const language of ['en', 'es']) {
  for (const height of [650, 780, 900]) {
    test(`collapsed Gurdon card keeps carousel arrows visible at ${height} (${language})`, async ({ page, context, baseURL }) => {
      const places = ['GURDON WATERWORKS', 'BENTONVILLE WATER UTILITIES'].map(name => {
        const system = DIRECTORY.systems.find(s => s.name === name)!
        return { id: system.placeId, name: system.name, county: system.county, kind: 'system' }
      })
      const at = new Date().toISOString()
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== baseURL) return route.abort()
        if (!url.pathname.startsWith('/api/')) return route.continue()
        if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
        if (url.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false } })
        expect(url.pathname).toBe('/api/status')
        expect(route.request().method()).toBe('GET')
        return route.fulfill({ json: { places, archive: [], sources: [
          { agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
          { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
        ] } })
      })
      await page.addInitScript(({ watches, language }) => {
        localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches, language, liftWatches: [], checkOnOpen: true }))
        sessionStorage.setItem('wave:logo-intro:v1', 'seen')
      }, { watches: places.map(p => p.id), language })
      await page.setViewportSize({ width: height === 650 ? 1280 : 1440, height })
      await page.goto('/')
      await page.getByRole('navigation').getByRole('button', { name: language === 'en' ? 'Places' : 'Lugares', exact: true }).click()
      const card = page.locator('.supplier-card').first()
      await expect(card.locator('.status-label')).toContainText(language === 'en' ? 'No active boil-water notice found' : 'No se encontró')
      await page.evaluate(() => document.fonts.ready)
      await expect(card.locator('.directory-match-note')).toHaveCount(0)
      await expect(card.locator('.provider-info-toggle')).toHaveAttribute('aria-expanded', 'false')
      for (const locator of [card, card.locator('.supplier-help-action'), page.locator('.carousel-controls'), page.locator('.carousel-controls button').first(), page.locator('.carousel-controls button').last()]) {
        await expect(locator).toBeInViewport({ ratio: 1 })
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height)
      await page.screenshot({ path: test.info().outputPath('gurdon-collapsed.png'), fullPage: true })
      const history = card.locator('.supplier-actions>.alert-toggle')
      await history.click()
      await expect(card.locator('.supplier-alert-history .directory-match-note')).toContainText(language === 'en' ? 'Matched by exact name only' : 'Coincidencia solo por nombre exacto')
      await history.click()
      await expect(card.locator('.directory-match-note')).toHaveCount(0)
      await expect(page.locator('.carousel-controls')).toBeInViewport({ ratio: 1 })
    })
  }
}
