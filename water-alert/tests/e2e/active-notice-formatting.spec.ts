import { test, expect } from '@playwright/test'

for (const language of ['en', 'es'] as const) {
  for (const width of [1440, 390, 320]) {
    test(`active notice is compact and centered (${language}, ${width}px)`, async ({ page, context, baseURL }) => {
      const place = { id: 'ADH:layout-only', name: 'Synthetic Water Supplier', county: 'Benton', kind: 'system' }
      const at = '2026-10-20T12:00:00Z'
      const unexpected: string[] = []
      await page.clock.install({ time: new Date(at) })
      await context.addInitScript(({ place, language }) => {
        localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [place.id], liftWatches: [], language, checkOnOpen: true }))
      }, { place, language })
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin === baseURL && url.pathname === '/api/status' && route.request().method() === 'GET') {
          return route.fulfill({ json: { places: [place], archive: [], coverageStart: null, sources: ['ADH', 'ADEQ'].map(agency => ({
            agency, retrievedAt: at, lastSuccessAt: at, error: null,
            records: agency === 'ADH' ? [{ id: 'synthetic-layout-notice', placeId: place.id, name: place.name, agency, kind: 'boil', county: place.county, area: 'Entire system', reason: 'power outage', issued: '10/20/2026', lifted: null, url: 'https://example.invalid/notice', firstObservedAt: at, lastObservedAt: at }] : [],
          })) } })
        }
        if (url.origin !== baseURL || url.pathname.startsWith('/api/')) { unexpected.push(url.href); return route.abort() }
        return route.continue()
      })
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      const finding = page.locator('.boil .supplier-finding')
      await expect(finding).toBeVisible()
      await expect(page.locator('main > h1')).toHaveClass('sr-only')
      expect(await page.locator('main > h1').evaluate(element => element.getBoundingClientRect().width)).toBe(1)
      const cardBox = await page.locator('.status-card').first().boundingBox()
      const addBox = await page.locator('.add-place').boundingBox()
      if (width > 760) expect(Math.abs(cardBox!.y - addBox!.y)).toBeLessThanOrEqual(1)
      else expect(addBox!.y + addBox!.height).toBeLessThanOrEqual(cardBox!.y)
      const geometry = await finding.evaluate(element => {
        const box = element.getBoundingClientRect()
        const icon = element.querySelector('.warning-icon')!.getBoundingClientRect()
        const copy = element.querySelector('.finding-copy')!.getBoundingClientRect()
        const details = element.querySelector('.status-explanation')!
        return {
          center: (box.left + box.right) / 2,
          groupCenter: (icon.left + copy.right) / 2,
          iconCenter: (icon.top + icon.bottom) / 2,
          copyCenter: (copy.top + copy.bottom) / 2,
          iconWidth: icon.width, iconHeight: icon.height,
          threeLines: Number.parseFloat(getComputedStyle(details).lineHeight) * 3,
          gap: copy.left - icon.right,
          detailsGap: Number.parseFloat(getComputedStyle(details).marginTop),
          visibleDetailsGap: details.getBoundingClientRect().top - element.querySelector('.status-label')!.getBoundingClientRect().bottom,
          headingAlign: getComputedStyle(element.querySelector('.status-label')!).textAlign,
        }
      })
      expect(Math.abs(geometry.groupCenter - geometry.center)).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.iconCenter - geometry.copyCenter)).toBeLessThanOrEqual(1)
      expect(geometry.iconWidth).toBe(geometry.threeLines)
      expect(geometry.iconHeight).toBe(geometry.threeLines)
      expect(geometry.gap).toBeLessThanOrEqual(10)
      expect(geometry.detailsGap).toBe(4)
      expect(geometry.visibleDetailsGap).toBeLessThanOrEqual(4)
      expect(geometry.headingAlign).toBe('center')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(unexpected).toEqual([])
      await page.screenshot({ path: test.info().outputPath('centered-active-notice.png'), fullPage: true })
    })
  }
}
