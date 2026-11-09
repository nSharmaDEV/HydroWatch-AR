import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

for (const language of ['en', 'es']) {
  for (const height of [650, 780, 900]) {
    test(`Places keeps the complete collapsed supplier card compact at 1440x${height} (${language})`, async ({ page, context, baseURL }) => {
      const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
      const at = new Date().toISOString()
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== baseURL) return route.abort()
        if (!url.pathname.startsWith('/api/')) return route.continue()
        if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
        if (url.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false } })
        expect(url.pathname).toBe('/api/status')
        expect(route.request().method()).toBe('GET')
        return route.fulfill({ json: { places: [place], archive: [], sources: [
          { agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
          { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
        ] } })
      })
      await page.addInitScript(({ id, language }) => {
        localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], language, liftWatches: [], checkOnOpen: true }))
        sessionStorage.setItem('wave:logo-intro:v1', 'seen')
      }, { id: place.id, language })
      await page.setViewportSize({ width: 1440, height })
      await page.goto('/')
      await page.getByRole('navigation').getByRole('button', { name: language === 'en' ? 'Places' : 'Lugares', exact: true }).click()
      const card = page.locator('.supplier-card')
      await expect(card.locator('.status-label')).toContainText(language === 'en' ? 'No active boil-water notice found' : 'No se encontró')
      await expect(card.locator('.report-home-note')).toHaveCount(0)
      const chip = card.locator('.provider-info-chip')
      await expect(chip).toContainText(language === 'en' ? '2025: 4 compliance issues' : '2025: 4 problemas de cumplimiento')
      await expect(chip).toHaveCSS('background-color', 'rgb(255, 248, 223)')
      await expect(chip).toHaveCSS('border-color', 'rgb(217, 173, 66)')
      await expect(chip.locator('svg')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      // Match the reference card's roomier proportions, without viewport stretching.
      const banner = await card.locator('.supplier-finding').boundingBox()
      const copy = await card.locator('.finding-copy').boundingBox()
      expect(banner!.height - copy!.height).toBeLessThanOrEqual(height <= 750 ? 18 : 82)
      if (height > 750) {
        expect(banner!.height).toBeGreaterThanOrEqual(150)
        expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(600)
        expect((await card.boundingBox())!.height).toBeLessThanOrEqual(650)
      }
      for (const locator of [card, card.locator('.card-check-actions'), card.locator('.provider-info-toggle'), card.locator('.supplier-actions>.alert-toggle'), card.locator('.supplier-help-action'), page.locator('.home-sidebar')]) {
        await expect(locator).toBeInViewport({ ratio: 1 })
      }
      for (const href of ['tel:+14795492158', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM']) {
        const contact = card.locator(`a[href="${href}"]`)
        await expect(contact).toBeInViewport({ ratio: 1 })
        expect((await contact.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440)
      await page.screenshot({ path: test.info().outputPath('compact-places.png'), fullPage: true })

      await card.locator('.provider-info-toggle').click()
      await expect(card.locator('.provider-info-content')).toBeVisible()
      await card.locator('.supplier-help-action').scrollIntoViewIfNeeded()
      await expect(card.locator('.supplier-help-action')).toBeInViewport({ ratio: 1 })
      await page.setViewportSize({ width: 390, height: 700 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    })
  }
}
