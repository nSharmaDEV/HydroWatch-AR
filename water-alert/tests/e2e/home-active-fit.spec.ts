import { expect, test } from '@playwright/test'
import { ADH_ENGINEERING_SOURCE } from '../../src/recovery-resources'

for (const language of ['en', 'es']) {
  for (const viewport of [{ width: 1280, height: 650 }, { width: 1440, height: 780 }]) {
    test(`long active notice keeps place controls visible ${viewport.width} ${language}`, async ({ page, context, baseURL }) => {
      const places = [
        { id: 'ADH:synthetic-fit', name: 'KIBLER WATER SYSTEM', county: 'CRAWFORD', kind: 'system' },
        { id: 'ADH:synthetic-second', name: 'SECOND SYNTHETIC SYSTEM', county: 'CRAWFORD', kind: 'system' },
      ]
      const at = new Date().toISOString()
      const area = 'Arkansas Department of Health for the area along North Cedar road, Rachel Dr., Morris Lane, and Redbud road'
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== baseURL) return route.abort()
        if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
        if (!url.pathname.startsWith('/api/')) return route.continue()
        expect(url.pathname).toBe('/api/status')
        expect(route.request().method()).toBe('GET')
        return route.fulfill({ json: { places, archive: [], sources: [
          { agency: 'ADH', retrievedAt: at, lastSuccessAt: at, error: null, records: [{ id: 'synthetic-notice', placeId: places[0].id, name: places[0].name, county: 'CRAWFORD', agency: 'ADH', kind: 'boil', area, reason: 'fire hydrant repair/break', issued: '10/14/2026 3:12 PM', lifted: '', url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx' }] },
          { agency: 'ADEQ', retrievedAt: at, lastSuccessAt: at, error: null, records: [] },
        ] } })
      })
      await page.addInitScript(({ watches, language }) => {
        localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches, language, liftWatches: [], checkOnOpen: true }))
        sessionStorage.setItem('wave:logo-intro:v1', 'seen')
      }, { watches: places.map(place => place.id), language })
      await page.setViewportSize(viewport)
      await page.goto('/')
      const card = page.locator('.supplier-card').first()
      await expect(card.locator('.supplier-notice-context')).toContainText(area)
      const row = card.locator('.supplier-contact-section')
      const contact = row.getByRole('link', { name: language === 'en' ? 'Contact ADH' : 'Contactar a ADH', exact: true })
      await expect(contact).toHaveAttribute('href', ADH_ENGINEERING_SOURCE)
      await expect(row.locator('p')).toHaveCount(0)
      const bounds = (await contact.boundingBox())!
      const rowBounds = (await row.boundingBox())!
      expect(Math.abs(bounds.x + bounds.width - rowBounds.x - rowBounds.width)).toBeLessThanOrEqual(1)
      await expect(page.locator('.carousel-controls button').first()).toBeInViewport({ ratio: 1 })
      await expect(page.locator('.carousel-controls button').last()).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
      await page.locator('.carousel-controls button').last().click()
      await expect(page.locator('.carousel-status')).toContainText(language === 'en' ? '2 of 2' : '2 de 2')
      await page.locator('.carousel-controls button').first().click()
      await expect(card.locator('.supplier-notice-context')).toContainText(area)
      await page.setViewportSize({ width: 390, height: 700 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    })
  }
}
