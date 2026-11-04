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
        if (url.origin === baseURL && url.pathname === '/api/push/config' && route.request().method() === 'GET') {
          return route.fulfill({ json: { enabled: false } })
        }
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
      await page.getByRole('navigation').getByRole('button', { name: language === 'en' ? 'Places' : 'Lugares', exact: true }).click()
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
          copyCenter: (copy.left + copy.right) / 2,
          inlineIcon: element.querySelector('.status-label')!.contains(element.querySelector('.warning-icon')),
          iconWidth: icon.width, iconHeight: icon.height,
          visibleDetailsGap: details.getBoundingClientRect().top - element.querySelector('.status-label')!.getBoundingClientRect().bottom,
          headingAlign: getComputedStyle(element.querySelector('.status-label')!).textAlign,
        }
      })
      // October 21 replaced the oversized side icon with a 24px inline warning.
      expect(Math.abs(geometry.copyCenter - geometry.center)).toBeLessThanOrEqual(1)
      expect(geometry.inlineIcon).toBe(true)
      expect(geometry.iconWidth).toBe(24)
      expect(geometry.iconHeight).toBe(24)
      expect(geometry.visibleDetailsGap).toBe(8)
      expect(geometry.headingAlign).toBe('center')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(unexpected).toEqual([])
      await page.screenshot({ path: test.info().outputPath('centered-active-notice.png'), fullPage: true })
    })
  }
}
