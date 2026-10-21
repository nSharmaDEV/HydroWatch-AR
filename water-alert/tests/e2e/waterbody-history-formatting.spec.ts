import { test, expect } from '@playwright/test'
import { en, es } from '../../src/strings'
import { SOURCES } from '../../src/domain'
import { lakeCardStrings } from '../../src/lake-card-strings'

for (const [language, t] of [['en', en], ['es', es]] as const) {
  for (const width of [1440, 390, 320]) {
    test(`shared advisory layout for waterbodies (${language}, ${width}px)`, async ({ page, context, baseURL }) => {
      const at = '2026-10-20T12:00:00Z'
      const places = [
        { id: 'ADH:history-layout', name: 'Synthetic Supplier', county: 'Benton', kind: 'system' },
        { id: 'ADEQ:history-layout', name: 'Synthetic Lake', county: 'Benton', kind: 'lake' },
      ]
      const notices = places.map((p, i) => ({ id: `${p.id}:notice`, placeId: p.id, name: p.name, county: p.county, agency: i ? 'ADEQ' : 'ADH', kind: i ? 'hab' : 'boil', area: 'Published north cove or service area', reason: i ? '' : 'Published main break', issued: 'June 3, 2020', lifted: null, ...(i ? { liftStatus: 'unknown', sourceUpdatedAt: 'September 28, 2026' } : {}), url: i ? SOURCES.ADEQ : SOURCES.ADH, firstObservedAt: at }))
      const unexpected: string[] = []
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      await page.setViewportSize({ width, height: 900 })
      await page.clock.install({ time: new Date(at) })
      await context.addInitScript(({ places, language }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: places.map(p => p.id), liftWatches: [], language, checkOnOpen: true })), { places, language })
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== baseURL || (url.pathname.startsWith('/api/') && !(url.pathname === '/api/status' && route.request().method() === 'GET'))) {
          unexpected.push(route.request().url())
          return route.abort()
        }
        if (url.pathname === '/api/status') return route.fulfill({ json: { places, archive: notices, coverageStart: at, sources: ['ADH', 'ADEQ'].map(agency => ({ agency, records: notices.filter(n => n.agency === agency), retrievedAt: at, lastSuccessAt: at, error: null, checks: [], historyStartedAt: at })) } })
        return route.continue()
      })
      await page.goto('/')
      const cards = page.locator('.status-card')
      await expect(cards).toHaveCount(2)
       await cards.nth(0).getByRole('button', { name: t.supplierAlertHistory }).click()
       await cards.nth(1).getByRole('button', { name: lakeCardStrings[language].record }).click()
       await expect(cards.nth(1).locator('.supplier-finding')).toContainText(lakeCardStrings[language].feedUpdated)
       await expect(cards.nth(1).locator('.supplier-finding')).toContainText(lakeCardStrings[language].uncertain)
       await expect(cards.nth(1).locator('.supplier-finding')).not.toContainText('June 3, 2020')
       await expect(cards.nth(1).locator('.lake-feed-date dd')).toHaveCSS('text-align', 'center')
       await expect(cards.nth(1).getByText(t.waterbodyHelp, { exact: true })).toHaveCount(0)
      await expect(cards.nth(1).locator('.supplier-alert-notice')).toHaveCount(1)
      await expect(cards.nth(1).locator('.alert-status')).toHaveText(language === 'en' ? 'Status: Unconfirmed' : 'Estado: Sin confirmar')
      await expect(cards.nth(1).locator('.alert-summary-facts')).toContainText('September 28, 2026')
      const formats = await cards.evaluateAll(cards => cards.map(card => ['.supplier-actions > button', '.supplier-alert-notice', '.alert-notice-heading h3', '.alert-summary-facts', '.alert-fact dt', '.alert-fact dd', '.alert-status'].map(selector => {
        const el = card.querySelector(selector)!
        const style = getComputedStyle(el)
         return { font: style.fontSize, weight: style.fontWeight, padding: style.padding, margin: selector === '.alert-summary-facts' ? null : style.margin, display: style.display, align: style.textAlign, width: selector === '.supplier-alert-notice' ? Math.round(el.getBoundingClientRect().width) : null }
      })))
      expect(formats[0]).toEqual(formats[1])
       await cards.nth(1).getByRole('button', { name: lakeCardStrings[language].activity }).click()
      await expect(cards.nth(1).getByRole('heading', { name: t.checkLatest })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(unexpected).toEqual([])
      expect(errors).toEqual([])
      await page.screenshot({ path: test.info().outputPath('shared-waterbody-history.png'), fullPage: true })
    })
  }
}
