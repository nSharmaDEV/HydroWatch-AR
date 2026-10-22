import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { SOURCES } from '../../src/domain'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'
import { activeHelpStrings } from '../../src/active-help-strings'
import { helpGuideStrings } from '../../src/help-guide-strings'
import { recoveryStrings } from '../../src/recovery-strings'

// Synthetic incident, read-only intercepted status. Never contact a backend or recipient.
for (const language of ['en', 'es'] as const) {
  test(`active help evidence and resident log (${language})`, async ({ page, context, baseURL }) => {
    const t = activeHelpStrings[language], h = helpGuideStrings[language], r = recoveryStrings[language]
    const unexpected: string[] = [], errors: string[] = []
    const at = '2026-10-20T12:00:00Z'
    const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
    const notice = { id: 'synthetic-help-only', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic area', reason: 'Synthetic test incident', issued: '2026-10-19', lifted: null, url: SOURCES.ADH }
    await page.clock.setFixedTime(new Date(at))
    page.on('pageerror', error => errors.push(error.message))
    await context.addInitScript(({ language, id }) => {
      sessionStorage.setItem('wave:logo-intro:v1', 'seen')
      localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], language, liftWatches: [], checkOnOpen: true }))
    }, { language, id: place.id })
    await context.route('**/*', route => {
      const req = route.request(), url = new URL(req.url())
      if (url.origin !== baseURL || (url.pathname.startsWith('/api/') && (url.pathname !== '/api/status' || req.method() !== 'GET'))) {
        unexpected.push(`${req.method()} ${req.url()}`); return route.abort()
      }
      if (url.pathname === '/api/status') return route.fulfill({ json: { sources: [{ agency: 'ADH', records: [notice], lastSuccessAt: at, retrievedAt: at, error: null }, { agency: 'ADEQ', records: [], lastSuccessAt: at, retrievedAt: at, error: null }], archive: [notice], places: [place], coverageStart: at } })
      return route.continue()
    })
    await page.goto('/')
    await page.getByRole('button', { name: h.entry, exact: true }).click()
    const task = (index: number) => page.getByRole('navigation', { name: t.nav }).getByRole('button').nth(index)
    await page.getByRole('button', { name: t.recipientDone, exact: true }).click()
    await task(1).click()
    await page.locator('summary').filter({ hasText: t.evidence }).click()
    await page.getByRole('checkbox', { name: /2025.*2:/ }).first().check()
    await page.getByText(language === 'en' ? 'Historical sources included' : 'Fuentes históricas incluidas', { exact: true }).click()
    const appendix = page.getByRole('textbox', { name: language === 'en' ? 'Source appendix included with your message' : 'Apéndice de fuentes incluido con su mensaje' })
    await expect(appendix).toContainText('HISTORICAL REPORT REFERENCES')
    await page.getByRole('textbox', { name: r.body, exact: true }).fill('SYNTHETIC PERSONAL EXPERIENCE ONLY')
    const downloaded = page.waitForEvent('download')
    await page.getByRole('button', { name: r.download, exact: true }).click()
    const contents = await readFile((await (await downloaded).path())!, 'utf8')
    expect(contents).toContain('SYNTHETIC PERSONAL EXPERIENCE ONLY')
    expect(contents).toContain(LEISURE_HILLS_ID)
    expect(contents).toContain('YEAR=2025#page=2')
    await page.getByRole('button', { name: t.ready, exact: true }).click()
    await task(2).click()
    await page.getByRole('button', { name: t.record, exact: true }).click()
    await expect(page.getByText(t.invalid, { exact: true })).toBeVisible()
    await page.getByLabel(t.sent, { exact: true }).fill('2026-10-19')
    await page.getByLabel(t.reference, { exact: true }).fill('<img src=x onerror=alert(1)>')
    await page.getByLabel(t.confirm, { exact: true }).check()
    await page.getByRole('button', { name: t.record, exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '3')
    await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible()
    await expect(page.locator('img[src=x]')).toHaveCount(0)
    await page.getByLabel(t.response, { exact: true }).fill('Synthetic response note')
    await page.getByRole('button', { name: t.recordResponse, exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '3')
    await page.getByRole('button', { name: t.close, exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '4')
    await page.getByRole('button', { name: t.reopen, exact: true }).click()
    await page.getByRole('button', { name: t.delete, exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '2')
    await expect(page.getByText('Synthetic response note', { exact: true })).toHaveCount(0)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      for (let index = 0; index < 4; index++) {
        await task(index).click()
        await expect(page.getByRole('heading', { level: 1, name: t.titles[index], exact: true })).toBeFocused()
        const layout = await page.evaluate(() => ({ fits: document.documentElement.scrollWidth <= innerWidth, overflow: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth).slice(0, 8).map(el => `${el.tagName}.${el.className}:${el.getBoundingClientRect().width}`) }))
        expect(layout.fits, `${width}px task ${index}: ${layout.overflow.join(', ')} ${JSON.stringify(await page.evaluate(() => ({ x: scrollX, doc: document.documentElement.scrollWidth, inner: innerWidth, wide: [...document.querySelectorAll('body *')].filter(el => el.scrollWidth > el.clientWidth + 1).slice(0, 15).map(el => `${el.tagName}.${el.className}:${el.scrollWidth}/${el.clientWidth}`) })))}`).toBe(true)
      }
    }
    await page.reload()
    await page.getByRole('button', { name: h.entry, exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
    expect(unexpected).toEqual([])
    expect(errors).toEqual([])
  })
}
