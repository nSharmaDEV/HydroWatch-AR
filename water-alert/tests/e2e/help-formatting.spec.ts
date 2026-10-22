import { test, expect } from '@playwright/test'
import { helpGuideStrings } from '../../src/help-guide-strings'
import { activeHelpStrings } from '../../src/active-help-strings'

// Sample-only layout checks: prohibit API calls and external handoffs.
for (const language of ['en', 'es'] as const) {
  for (const width of [1440, 390, 320]) {
    test(`four-step help aligns (${language}, ${width}px)`, async ({ page, context, baseURL }) => {
      const unexpected: string[] = []
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await context.addInitScript(language => {
        localStorage.setItem('water-alert:mode', 'sample')
        localStorage.setItem('water-alert:sample:v1', JSON.stringify({ watches: ['ADH:sample-creek'], liftWatches: [], language, checkOnOpen: false }))
      }, language)
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== baseURL || url.pathname.startsWith('/api/')) {
          unexpected.push(route.request().url()); return route.abort()
        }
        return route.continue()
      })
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await page.locator('.supplier-info-button').click()
      const checklist = page.locator('.notice-checklist')
      await expect(checklist).toBeVisible()
      for (const row of await checklist.locator('li').all()) {
        const label = (await row.locator('label').boundingBox())!
        const action = (await row.locator('button, a').boundingBox())!
        // Wide rows align at their top; narrow rows place the action below the text.
        if (width > 520) expect(Math.abs(label.y - action.y)).toBeLessThanOrEqual(2)
        else expect(action.y).toBeGreaterThanOrEqual(label.y + label.height)
      }
      await page.locator('dialog button').first().click()
      const t = helpGuideStrings[language]
      const active = activeHelpStrings[language]
      await page.getByRole('button', { name: t.entry, exact: true }).click()
      await expect(page.getByRole('progressbar')).toHaveAttribute('max', '4')
      await expect(page.getByRole('navigation', { name: active.nav }).getByRole('button')).toHaveCount(4)
      for (let step = 1; step <= 4; step++) {
        const panel = page.getByRole('region', { name: active.titles[step - 1], exact: true })
        await expect(panel).toBeVisible()
        await expect(panel.getByRole('navigation', { name: active.nav })).toHaveCSS('position', 'static')
        const bounds = (await panel.boundingBox())!
        expect(bounds.width).toBeLessThanOrEqual(1100)
        const heading = panel.getByRole('heading', { level: 1 })
        await expect(heading).toBeFocused()
        const navigation = panel.locator('.guide-navigation')
        await expect(navigation).toBeVisible()
        const headingBounds = (await heading.boundingBox())!
        const navigationBounds = (await navigation.boundingBox())!
        expect(navigationBounds.x).toBeGreaterThanOrEqual(headingBounds.x)
        expect(navigationBounds.x + navigationBounds.width).toBeLessThanOrEqual(headingBounds.x + headingBounds.width + 1)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        if (step === 1) await panel.getByRole('button', { name: t.service, exact: true }).click()
        await expect(panel.locator('summary').filter({ hasText: active.guidelines })).toBeVisible()
        if (step < 4) await panel.getByRole('button', { name: t.next, exact: true }).click()
      }
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
      expect(unexpected).toEqual([])
      expect(errors).toEqual([])
    })
  }
}
