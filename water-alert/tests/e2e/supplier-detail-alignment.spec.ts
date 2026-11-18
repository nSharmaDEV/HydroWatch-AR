import { test, expect } from '@playwright/test'
import { SOURCES } from '../../src/domain'

test('supplier back control and active advisory use aligned native spacing', async ({ page, context, baseURL }, info) => {
  const at = '2026-10-21T12:00:00Z'
  const place = { id: 'ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d', name: 'BULL SHOALS WATER SYSTEM', county: 'MARION', kind: 'system' }
  const notice = { id: 'synthetic-alignment', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic published affected area', reason: 'Synthetic main break', issued: '10/20/2026', lifted: null, url: SOURCES.ADH, lastObservedAt: at }
  await page.clock.setFixedTime(new Date(at))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL || route.request().method() !== 'GET') return route.abort()
    if (url.pathname === '/api/status') return route.fulfill({ json: { sources: [{ agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }, { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null }], places: [place], archive: [notice], coverageStart: at } })
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Map', exact: true }).click()
  await expect(page.locator('.logo-intro')).not.toBeVisible()
  const marker = page.getByRole('group', { name: 'Arkansas supplier map' }).getByRole('button', { name: /BULL SHOALS.*Active advisory/ })
  await marker.focus()
  await page.keyboard.press('Enter')
  const back = page.getByRole('button', { name: /Back to results/ })
  await expect(back).toBeVisible()
  const geometry = await back.evaluate(el => {
    const button = el.getBoundingClientRect(), svg = el.querySelector('svg')!.getBoundingClientRect()
    const range = document.createRange(); range.selectNodeContents(el.lastChild!)
    const text = range.getBoundingClientRect()
    return { height: button.height, centers: Math.abs(svg.y + svg.height / 2 - text.y - text.height / 2) }
  })
  expect(geometry.height).toBeGreaterThanOrEqual(44)
  expect(geometry.centers).toBeLessThan(5)
  await expect(page.locator('.map-finding').first()).toHaveCSS('padding', '16px')
  if (process.env.WAVE_HELP_CAPTURE_DIR) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/${info.project.name}-supplier-alignment.png`, fullPage: true })
})
