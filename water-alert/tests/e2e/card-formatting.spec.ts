import { test, expect } from '@playwright/test'
import { en, es } from '../../src/strings'
import { lakeCardStrings } from '../../src/lake-card-strings'

// Synthetic, intercepted reads only; no live storage or notifications.
for (const [language, t] of [['en', en], ['es', es]] as const) {
  for (const checked of [true, false]) {
    test(`lake and supplier share card formatting (${language}, checked=${checked})`, async ({ page, context, baseURL }) => {
      const at = '2026-10-20T12:00:00Z'
      const places = [
        { id: 'ADH:format-test', name: 'Test Waterworks', county: 'Clark', kind: 'system' },
        { id: 'ADEQ:format-test', name: 'Test Lake *', county: 'Lawrence County', kind: 'lake' },
      ]
      await context.addInitScript(({ places, language }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: places.map(p => p.id), liftWatches: [], language, checkOnOpen: true })), { places, language })
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== baseURL) return route.abort()
        if (url.pathname === '/api/status') return route.fulfill({ json: {
          places, archive: [], coverageStart: null,
          sources: ['ADH', 'ADEQ'].map(agency => ({ agency, records: [], retrievedAt: checked ? at : null, lastSuccessAt: checked ? at : null, error: checked ? 'Synthetic retrieval failure' : null })),
        } })
        if (url.pathname.startsWith('/api/')) return route.abort()
        return route.continue()
      })
      await page.goto('/')
      const cards = page.locator('.status-card')
      await expect(cards).toHaveCount(2)
      await expect(cards.nth(1).locator('.supplier-heading > p')).toHaveText(language === 'en' ? 'Lawrence County · Arkansas Division of Environmental Quality' : 'Condado de Lawrence · Arkansas Division of Environmental Quality')
      for (const card of await cards.all()) {
        await expect(card.locator('.status-label')).toHaveText(checked ? t.supplierUnavailable : t.uncheckedStatus)
      }
      const formats = await cards.evaluateAll(cards => cards.map(card => {
        const top = card.getBoundingClientRect().top
        return ['h2', '.supplier-finding', '.status-label', '.status-explanation', '.date-row', '.card-check-actions', '.official-list'].map(selector => {
          const el = card.querySelector(selector)!
          const box = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          return { top: Math.round(box.top - top), height: Math.round(box.height), color: style.color, background: style.backgroundColor, align: style.textAlign, font: style.fontSize, weight: style.fontWeight }
        })
      }))
       // Lake retrieval copy and separate agency/check disclosures intentionally differ;
       // the heading and finding still use the shared visual system.
       expect(formats[0].slice(0, 4)).toEqual(formats[1].slice(0, 4))
       await expect(cards.nth(1).locator(':scope > details')).toHaveCount(1)
       await expect(cards.nth(1).getByRole('button', { name: lakeCardStrings[language].record })).toHaveAttribute('aria-expanded', 'false')
      for (const card of await cards.all()) {
        await expect(card.locator(':scope > .card-details-action, :scope > .supplier-help-action')).toBeVisible()
      }
      const lowerFormats = await cards.evaluateAll(cards => cards.map(card => {
        return [...card.querySelectorAll('.provider-info-toggle, .supplier-actions > .alert-toggle, :scope > details > summary, :scope > .card-details-action, :scope > .supplier-help-action')].map(el => {
          const box = el.getBoundingClientRect()
          const style = getComputedStyle(el)
          return { width: Math.round(box.width), font: style.fontSize, weight: style.fontWeight, color: style.color, background: style.backgroundColor, minHeight: style.minHeight, marginTop: style.marginTop }
        })
      }))
       for (const format of lowerFormats[1]) expect(lowerFormats[0]).toContainEqual(format)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: test.info().outputPath('aligned-cards.png'), fullPage: true })
    })
  }
}
