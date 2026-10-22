import { test, expect } from '@playwright/test'
import { SOURCES } from '../../src/domain'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'
import { helpGuideStrings } from '../../src/help-guide-strings'
import { recoveryStrings } from '../../src/recovery-strings'

for (const language of ['en', 'es'] as const) for (const active of [true, false]) for (const issue of ['service', 'quality', 'billing', 'legal'] as const) {
  test(`compact help workspace (${language}, active=${active}, ${issue})`, async ({ page, context, baseURL }) => {
    const h = helpGuideStrings[language], r = recoveryStrings[language]
    const at = new Date().toISOString()
    const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
    const notice = { id: 'synthetic-workspace', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic test area', reason: 'Synthetic test incident', issued: '2026-10-20', lifted: null, url: SOURCES.ADH }
    const unexpected: string[] = [], errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await context.addInitScript(({ language, id }) => {
      sessionStorage.setItem('wave:logo-intro:v1', 'seen')
      localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language, checkOnOpen: true }))
    }, { language, id: place.id })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== baseURL || (url.pathname.startsWith('/api/') && (url.pathname !== '/api/status' || route.request().method() !== 'GET'))) {
        unexpected.push(route.request().url()); return route.abort()
      }
      if (url.pathname === '/api/status') return route.fulfill({ json: { places: [place], sources: [{ agency: 'ADH', records: active ? [notice] : [], lastSuccessAt: at, retrievedAt: at, error: null }, { agency: 'ADEQ', records: [], lastSuccessAt: at, retrievedAt: at, error: null }], archive: [], coverageStart: at } })
      return route.continue()
    })
    await page.setViewportSize({ width: 1280, height: 700 })
    await page.goto('/')
    await page.getByRole('button', { name: h.entry, exact: true }).click()
    for (let step = 0; step < (active ? 4 : 5); step++) {
      const guidance = page.locator('.help-directions'), work = page.locator('.help-work')
      await expect(guidance).toBeVisible(); await expect(work).toBeVisible()
      if (step === 0) await work.getByRole('button', { name: h[issue], exact: true }).click()
      const left = (await guidance.boundingBox())!, right = (await work.boundingBox())!
      expect(left.x + left.width).toBeLessThanOrEqual(right.x)
      const geometry = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, x: scrollX, y: scrollY }))
      expect(geometry.height, `step ${step}: document height`).toBeLessThanOrEqual(700)
      expect(geometry.width).toBeLessThanOrEqual(1280)
      expect(geometry.y).toBe(0)
      const navigation = (await page.locator('.guide-navigation').boundingBox())!
      expect(navigation.y + navigation.height).toBeLessThanOrEqual(700)
      if (step === (active ? 1 : 2)) {
        const copy = (await page.getByRole('button', { name: r.copy, exact: true }).boundingBox())!
        expect(copy.y + copy.height).toBeLessThanOrEqual(700)
        await page.getByRole('textbox', { name: r.body, exact: true }).fill('SYNTHETIC EDIT RETAINED')
      }
      if (step < (active ? 3 : 4)) await page.getByRole('button', { name: h.next, exact: true }).click()
    }
    // Expanded content is allowed to grow; it must not be clipped or lock scrolling.
    await page.setViewportSize({ width: 640, height: 700 })
    await expect(page.getByRole('button', { name: h.done, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.getByRole('button', { name: h.previous, exact: true }).click()
      await page.getByRole('button', { name: h.next, exact: true }).click()
    }
    await page.setViewportSize({ width: 1280, height: 700 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: h.done, exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: h.done, exact: true })).toBeVisible()
    expect(unexpected).toEqual([]); expect(errors).toEqual([])
  })
}
