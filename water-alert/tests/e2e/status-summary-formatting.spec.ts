import { test, expect } from '@playwright/test'

for (const language of ['en', 'es'] as const) {
  for (const width of [1440, 390, 320]) {
    for (const state of ['active', 'none', 'failed', 'never'] as const) {
      test(`all status summaries share formatting (${state}, ${language}, ${width}px)`, async ({ page, context, baseURL }) => {
        const at = '2026-10-20T12:00:00Z'
        const places = [
          { id: 'ADH:summary-layout', name: 'Synthetic Supplier', county: 'Benton', kind: 'system' },
          { id: 'ADEQ:summary-layout', name: 'Synthetic Lake', county: 'Benton', kind: 'lake' },
        ]
        await page.clock.install({ time: new Date(at) })
        await context.addInitScript(({ language, places }) => {
          localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: places.map(p => p.id), liftWatches: [], language, checkOnOpen: true }))
        }, { language, places })
        const unexpected: string[] = []
        await context.route('**/*', route => {
          const url = new URL(route.request().url())
          if (url.origin === baseURL && url.pathname === '/api/status' && route.request().method() === 'GET') return route.fulfill({ json: {
            places, archive: [], coverageStart: null,
            sources: places.map((place, index) => ({
              agency: index ? 'ADEQ' : 'ADH', retrievedAt: state === 'never' ? null : at, lastSuccessAt: state === 'never' ? null : at,
              error: state === 'failed' ? 'Synthetic retrieval failure' : null,
              records: state === 'active' ? [{ id: place.id, placeId: place.id, name: place.name, agency: index ? 'ADEQ' : 'ADH', kind: index ? 'hab' : 'boil', county: 'Benton', area: 'Entire system', reason: 'Synthetic advisory wording', issued: '10/20/2026', lifted: null, url: 'https://example.invalid/notice', firstObservedAt: at, lastObservedAt: at }] : [],
            })),
          } })
          if (url.origin !== baseURL || url.pathname.startsWith('/api/')) { unexpected.push(url.href); return route.abort() }
          return route.continue()
        })
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        await expect(page.locator('.status-card')).toHaveCount(2)
        for (const card of await page.locator('.status-card').all()) {
          await expect(card).toHaveClass(new RegExp(state === 'active' ? 'boil|hab' : state === 'none' ? 'none' : 'unavailable'))
          const format = await card.locator('.supplier-finding').evaluate(element => {
            const copy = element.querySelector('.finding-copy')!
            const heading = element.querySelector('.status-label')!
            const details = element.querySelector('.status-explanation')!
            const box = element.getBoundingClientRect()
            const icon = element.querySelector('.warning-icon')
            const start = (icon ?? copy).getBoundingClientRect().left
            return {
              offset: Math.abs((start + copy.getBoundingClientRect().right) / 2 - (box.left + box.right) / 2),
              headingAlign: getComputedStyle(heading).textAlign,
              copyAlign: getComputedStyle(copy).textAlign,
              gap: Number.parseFloat(getComputedStyle(details).marginTop),
            }
          })
          expect(format.offset).toBeLessThanOrEqual(1)
          expect(format.headingAlign).toBe('center')
          expect(format.copyAlign).toBe('center')
          expect(format.gap).toBe(4)
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        expect(unexpected).toEqual([])
      })
    }
  }
}
