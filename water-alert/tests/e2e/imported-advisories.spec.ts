import { test, expect } from '@playwright/test'
import { PLACE_CATALOG } from '../../src/place-catalog'
import { en, es } from '../../src/strings'

// Synthetic API envelope; the only historical document is the reviewed fixture
// shipped with the UI. All API writes and external requests are blocked.
for (const language of ['en', 'es'] as const) {
  test(`imported history remains separate from unavailable live status (${language})`, async ({ page, context, baseURL }) => {
    const place = PLACE_CATALOG.find(p => p.place.name === 'ROGERS WATER UTILITIES')!.place
    const t = language === 'es' ? es : en
    const at = '2026-11-05T19:26:56.674Z'
    const unexpected: string[] = []
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await context.addInitScript(({ language }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ language, watches: [], liftWatches: [] })), { language })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== baseURL || (url.pathname.startsWith('/api/') && !(url.pathname === '/api/status' && route.request().method() === 'GET'))) {
        unexpected.push(route.request().url())
        return route.abort()
      }
      if (url.pathname === '/api/status') return route.fulfill({ json: { places: [place], archive: [], sources: [{ agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, historyStartedAt: at, error: 'Synthetic timeout' }] } })
      return route.continue()
    })
    await page.goto('/tests/e2e/components.html')
    const card = page.locator('.supplier-card')
    await expect(card.locator('.status-label')).toHaveText(t.supplierUnavailable)
    const toggle = card.getByRole('button', { name: t.supplierAlertHistory })
    await toggle.focus()
    await page.keyboard.press('Enter')
    const history = card.getByRole('region', { name: t.supplierAlertHistory })
    await expect(history.getByText(language === 'es' ? 'Registro histórico importado' : 'Historical record imported')).toBeVisible()
    await expect(history.getByText('September 7, 2018', { exact: true })).toBeVisible()
    await expect(history.locator('.alert-status')).toHaveText(language === 'es' ? 'Estado: Levantado explícitamente' : 'Status: Explicitly lifted')
    await expect(history.getByRole('link', { name: language === 'es' ? /Aviso original/ : /Original notice/ })).toHaveAttribute('href', 'https://www.rogersar.gov/CivicSend/ViewMessage/message/67337')
    await expect(history.locator('.historical-note').last()).toContainText('2016')
    await expect(card.locator('.status-label')).toHaveText(t.supplierUnavailable)
    await card.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))))
    expect(await history.evaluate(el => el.querySelector('.alert-history-limits')!.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 1)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('imported-history.png'), fullPage: true })
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(history).toBeHidden()
    expect(unexpected).toEqual([])
    expect(errors).toEqual([])
  })
}
